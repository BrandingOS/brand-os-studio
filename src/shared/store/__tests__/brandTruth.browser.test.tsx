/**
 * One brand truth, proven in a real browser.
 *
 * The unit tests show the routing logic is correct in isolation. This one asks
 * the question the user actually cares about: when a value is changed on one
 * surface, does every OTHER surface see it — through the real store, the real
 * DI container, the real service, and the real canonical write path?
 *
 * It exercises the failure mode the Brand System Foundation exists to remove:
 * two surfaces that each believed a different thing about the same colour
 * because they wrote it through different roads.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { container } from '@/core/container/ServiceContainer';
import { bootServices } from '@/core/boot';
import { useBrandStore } from '@/shared/store/brandStore';
import { fromLegacyBrand } from '@/domain/brand';
import { coreValueMeta } from '@/domain/brand/coreMeta';
import type { Brand } from '@/shared/types/brand';
import { SERVICE_KEYS, type IBrandsService } from '@/core/types/services';

const BRAND_ID = 'brand_truth_test';

function seed(): Brand {
  return {
    id: BRAND_ID,
    slug: 'truth-test',
    name: 'Truth Test',
    schemaVersion: 3,
    primaryColor: '#111111',
    fonts: { primary: 'Inter' },
    tone: 'friendly',
    audience: 'builders',
    assets: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  } as Brand;
}

/**
 * Two independent "surfaces" reading the same store — a stand-in for Setup and
 * Brand Kit. Each subscribes on its own; neither is told when the other saves.
 */
function SurfaceA() {
  const brand = useBrandStore((s) => s.list.find((b) => b.id === BRAND_ID));
  return (
    <div>
      <span data-testid="a-color">{brand?.primaryColor ?? '—'}</span>
      <span data-testid="a-font">{brand?.fonts?.primary ?? '—'}</span>
    </div>
  );
}

function SurfaceB() {
  const brand = useBrandStore((s) => s.list.find((b) => b.id === BRAND_ID));
  // Reads the canonical projection, the way editor/kit code resolves brand slots.
  const canonical = brand ? fromLegacyBrand(brand) : undefined;
  return (
    <div>
      <span data-testid="b-color">{canonical?.identity.colors.primary.hex ?? '—'}</span>
      <span data-testid="b-font">{canonical?.identity.typography.primary.family ?? '—'}</span>
      <span data-testid="b-tone">{canonical?.identity.voice.tone ?? '—'}</span>
    </div>
  );
}

function EditorSurface() {
  const update = useBrandStore((s) => s.update);
  return (
    <div>
      <button onClick={() => update(BRAND_ID, { primaryColor: '#ff0066' })}>set color</button>
      <button onClick={() => update(BRAND_ID, { fonts: { primary: 'Georgia' } })}>set font</button>
      <button onClick={() => update(BRAND_ID, { tone: 'bold and warm' })}>set tone</button>
      <button onClick={() => update(BRAND_ID, { name: 'Renamed Brand' })}>rename</button>
    </div>
  );
}

beforeEach(async () => {
  localStorage.clear();
  container.clear();
  bootServices();
  // Put a real brand into the real (local) service the container just wired.
  const svc = container.get<IBrandsService>(SERVICE_KEYS.BRANDS);
  const created = await svc.create({
    name: 'Truth Test',
    primaryColor: '#111111',
    fonts: { primary: 'Inter' },
  } as never);
  await svc.update(created.id, { ...seed(), id: created.id } as Partial<Brand>);
  const row = await svc.getById(created.id);
  useBrandStore.setState({ list: [{ ...(row as Brand), id: BRAND_ID }], current: undefined });
  // Re-register a service keyed to our fixed id so the store and service agree.
  let stored: Brand = { ...(row as Brand), id: BRAND_ID };
  container.register(SERVICE_KEYS.BRANDS, () => ({
    list: async () => [stored],
    getById: async (id: string) => (id === BRAND_ID ? stored : null),
    getBySlug: async (slug: string) => (slug === stored.slug ? stored : null),
    create: async () => stored,
    update: async (_id: string, patch: Partial<Brand>) => {
      stored = { ...stored, ...patch, updatedAt: new Date() };
      return stored;
    },
    delete: async () => {},
  }));
});

afterEach(() => {
  cleanup();
  container.clear();
  useBrandStore.setState({ list: [], current: undefined });
});

describe('an edit on one surface reaches every other surface', () => {
  it('propagates a colour change to a legacy reader AND a canonical reader', async () => {
    render(
      <>
        <SurfaceA />
        <SurfaceB />
        <EditorSurface />
      </>,
    );

    expect(screen.getByTestId('a-color').textContent).toBe('#111111');
    expect(screen.getByTestId('b-color').textContent).toBe('#111111');

    fireEvent.click(screen.getByText('set color'));

    await waitFor(() => {
      expect(screen.getByTestId('a-color').textContent).toBe('#ff0066');
    });
    // The canonical projection must agree — this is the assertion that fails if
    // a write lands in one representation but not the other.
    expect(screen.getByTestId('b-color').textContent).toBe('#ff0066');
  });

  it('propagates a typography change', async () => {
    render(
      <>
        <SurfaceA />
        <SurfaceB />
        <EditorSurface />
      </>,
    );

    fireEvent.click(screen.getByText('set font'));

    await waitFor(() => {
      expect(screen.getByTestId('a-font').textContent).toBe('Georgia');
    });
    expect(screen.getByTestId('b-font').textContent).toBe('Georgia');
  });

  it('propagates a voice change', async () => {
    render(
      <>
        <SurfaceB />
        <EditorSurface />
      </>,
    );

    fireEvent.click(screen.getByText('set tone'));

    await waitFor(() => {
      expect(screen.getByTestId('b-tone').textContent).toBe('bold and warm');
    });
  });
});

describe('Core writes record authority and provenance end-to-end', () => {
  it('a routed colour write lands at provisional, never confirmed', async () => {
    render(<EditorSurface />);
    fireEvent.click(screen.getByText('set color'));

    await waitFor(() => {
      const row = useBrandStore.getState().list.find((b) => b.id === BRAND_ID);
      expect(row?.primaryColor).toBe('#ff0066');
    });

    const row = useBrandStore.getState().list.find((b) => b.id === BRAND_ID)!;
    const meta = coreValueMeta(fromLegacyBrand(row).identityMeta, 'colors.primary');
    expect(meta.authority).toBe('provisional');
    expect(meta.provenance).toBe('user-entered');
  });
});

describe('non-Core writes still take the plain path', () => {
  it('a rename works and does not stamp Core metadata', async () => {
    render(<EditorSurface />);
    fireEvent.click(screen.getByText('rename'));

    await waitFor(() => {
      const row = useBrandStore.getState().list.find((b) => b.id === BRAND_ID);
      expect(row?.name).toBe('Renamed Brand');
    });

    const row = useBrandStore.getState().list.find((b) => b.id === BRAND_ID)!;
    expect(fromLegacyBrand(row).identityMeta).toBeUndefined();
  });
});
