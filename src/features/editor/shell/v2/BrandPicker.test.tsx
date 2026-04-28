// Unit tests for the Step 5b BrandPicker.
//
// Mounts BrandPicker against a stub IBrandsService registered in the
// DI container. Verifies:
//   • dropdown lists brands fetched from `IBrandsService.list()`
//   • clicking a different brand fires onBrandSwitch with the slug
//   • clicking the current brand does NOT fire onBrandSwitch
//   • "Re-apply brand kit" item triggers onReapplyBrand
//   • disabled state when no brand or no callback is provided
//
// Radix Portal renders the dropdown content under document.body, so
// query through `document` (or use `document.body`) — `container`
// won't see the popped content.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { BrandPicker } from './BrandPicker';
import { container } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS } from '@/core';
import type { IBrandsService } from '@/core';
import type { Brand } from '@/shared/types/brand';

afterEach(() => {
  cleanup();
  container.clear();
});

// ─── Fixtures ─────────────────────────────────────────────────────────

function makeBrand(slug: string, name: string): Brand {
  return {
    id: `brand-${slug}`,
    slug,
    name,
    primaryColor: '#3b82f6',
    fonts: { primary: 'Inter' },
    tone: '',
    audience: '',
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const RAQM = makeBrand('raqm', 'Raqm');
const SKAM = makeBrand('skam', 'SKAM');
const VECTOR = makeBrand('vector', 'Vector');

interface StubService extends IBrandsService {
  /** Calls recorded by `list()` for assertions. */
  listCalls: number;
}

function registerStubService(brands: Brand[]): StubService {
  const stub: StubService = {
    listCalls: 0,
    list: vi.fn(async () => {
      stub.listCalls++;
      return brands;
    }),
    getById: vi.fn(async () => null),
    getBySlug: vi.fn(async (slug: string) => brands.find((b) => b.slug === slug) ?? null),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as StubService;
  container.register(SERVICE_KEYS.BRANDS, () => stub);
  return stub;
}

/**
 * Open the dropdown. Radix portals its content, so we wait for the
 * `[data-brand-picker-content]` node to appear in `document.body`.
 */
/**
 * Open the dropdown. Radix's DropdownMenu trigger fires on
 * pointerdown — `.click()` doesn't reach it. fireEvent's `pointerDown`
 * + `click` mirrors what a real user does.
 */
async function openDropdown(
  predicate: (content: HTMLElement) => boolean = (c) =>
    !!c.querySelector('[data-brand-list="ready"]'),
): Promise<HTMLElement> {
  const trigger = document.querySelector<HTMLButtonElement>(
    '[data-brand-picker-trigger]',
  );
  if (!trigger) throw new Error('No BrandPicker trigger in DOM');
  fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
  fireEvent.pointerUp(trigger, { button: 0, pointerType: 'mouse' });
  fireEvent.click(trigger);
  // Wait for the portal content to mount and the inner state we want
  // to reach to be present (ready / error / empty / loading).
  for (let i = 0; i < 80; i++) {
    const content = document.body.querySelector<HTMLElement>(
      '[data-brand-picker-content]',
    );
    if (content && predicate(content)) return content;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error('Dropdown content never reached the expected state');
}

// ─── Tests ────────────────────────────────────────────────────────────

describe('BrandPicker — dropdown lists brands from IBrandsService', () => {
  beforeEach(() => {
    registerStubService([RAQM, SKAM, VECTOR]);
  });

  it('renders all brands returned by service.list()', async () => {
    render(<BrandPicker brand={RAQM} onBrandSwitch={vi.fn()} />);
    const content = await openDropdown();
    const slugs = Array.from(
      content.querySelectorAll<HTMLElement>('[data-brand-slug]'),
    ).map((el) => el.getAttribute('data-brand-slug'));
    expect(slugs).toEqual(['raqm', 'skam', 'vector']);
  });

  it('dropdown content has a SOLID background, not transparent (Step 5/7 fix 3)', async () => {
    // Radix portals the Content under document.body, OUTSIDE the
    // editor's `[data-cosmos="workspace"]` scope. The cosmos CSS
    // vars wouldn't resolve there and the dropdown rendered
    // transparent. Fix is: data-cosmos="workspace" on the Content
    // itself + var(name, fallback) on the inline style. This test
    // catches a regression where someone removes either.
    render(<BrandPicker brand={RAQM} onBrandSwitch={vi.fn()} />);
    const content = await openDropdown();
    expect(content.getAttribute('data-cosmos')).toBe('workspace');
    // Inline style declares a non-empty background.
    expect(content.style.background).toBeTruthy();
    expect(content.style.background).toMatch(/var\(--surface-elevated/);
    // Fallback must be a literal hex/color so the bg renders even
    // when the cosmos vars don't resolve in this DOM scope.
    expect(content.style.background).toMatch(/#[0-9a-fA-F]{3,8}/);
    // Border + shadow also declared with fallbacks.
    expect(content.style.border).toMatch(/rgba?\(|#[0-9a-fA-F]{3,8}/);
    expect(content.style.boxShadow).toMatch(/rgba?\(|#[0-9a-fA-F]{3,8}/);
  });

  it('marks the current brand', async () => {
    render(<BrandPicker brand={SKAM} onBrandSwitch={vi.fn()} />);
    const content = await openDropdown();
    const skamRow = content.querySelector('[data-brand-slug="skam"]');
    expect(skamRow?.getAttribute('data-brand-current')).toBe('true');
    const raqmRow = content.querySelector('[data-brand-slug="raqm"]');
    expect(raqmRow?.getAttribute('data-brand-current')).toBe('false');
  });

  it('fires onBrandSwitch with the slug when a different brand is picked', async () => {
    const onBrandSwitch = vi.fn();
    render(<BrandPicker brand={RAQM} onBrandSwitch={onBrandSwitch} />);
    const content = await openDropdown();
    const skamRow = content.querySelector<HTMLElement>('[data-brand-slug="skam"]');
    fireEvent.click(skamRow!);
    expect(onBrandSwitch).toHaveBeenCalledWith('skam');
    expect(onBrandSwitch).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire onBrandSwitch when the current brand is reselected', async () => {
    const onBrandSwitch = vi.fn();
    render(<BrandPicker brand={RAQM} onBrandSwitch={onBrandSwitch} />);
    const content = await openDropdown();
    const raqmRow = content.querySelector<HTMLElement>('[data-brand-slug="raqm"]');
    fireEvent.click(raqmRow!);
    expect(onBrandSwitch).not.toHaveBeenCalled();
  });
});

describe('BrandPicker — Re-apply brand kit action', () => {
  beforeEach(() => {
    registerStubService([RAQM, SKAM]);
  });

  it('renders a "Re-apply brand kit" menu item', async () => {
    render(<BrandPicker brand={RAQM} onReapplyBrand={vi.fn()} />);
    const content = await openDropdown();
    const action = content.querySelector('[data-action="reapply-brand"]');
    expect(action).toBeTruthy();
    expect(action?.textContent).toContain('Re-apply brand kit');
  });

  it('clicking Re-apply brand fires onReapplyBrand', async () => {
    const onReapplyBrand = vi.fn();
    render(
      <BrandPicker brand={RAQM} onBrandSwitch={vi.fn()} onReapplyBrand={onReapplyBrand} />,
    );
    const content = await openDropdown();
    const action = content.querySelector<HTMLElement>(
      '[data-action="reapply-brand"]',
    );
    fireEvent.click(action!);
    expect(onReapplyBrand).toHaveBeenCalledTimes(1);
  });

  it('disables the Re-apply item when no brand is attached', async () => {
    render(<BrandPicker brand={undefined} onReapplyBrand={vi.fn()} />);
    const content = await openDropdown((c) =>
      !!c.querySelector('[data-action="reapply-brand"]'),
    );
    const action = content.querySelector('[data-action="reapply-brand"]');
    // Radix marks disabled items via aria-disabled OR data-disabled.
    expect(
      action?.getAttribute('aria-disabled') === 'true' ||
        action?.hasAttribute('data-disabled'),
    ).toBe(true);
  });

  it('disables the Re-apply item when no callback is provided', async () => {
    render(<BrandPicker brand={RAQM} />);
    const content = await openDropdown((c) =>
      !!c.querySelector('[data-action="reapply-brand"]'),
    );
    const action = content.querySelector('[data-action="reapply-brand"]');
    expect(
      action?.getAttribute('aria-disabled') === 'true' ||
        action?.hasAttribute('data-disabled'),
    ).toBe(true);
  });
});

describe('BrandPicker — service errors and edge states', () => {
  it('shows an error message when service.list() throws', async () => {
    const stub: IBrandsService = {
      list: vi.fn(async () => {
        throw new Error('network down');
      }),
      getById: vi.fn(),
      getBySlug: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as IBrandsService;
    container.register(SERVICE_KEYS.BRANDS, () => stub);

    render(<BrandPicker brand={RAQM} onBrandSwitch={vi.fn()} />);
    const content = await openDropdown((c) =>
      !!c.querySelector('[data-brand-list="error"]'),
    );
    const errEl = content.querySelector('[data-brand-list="error"]');
    expect(errEl).toBeTruthy();
    expect(errEl?.textContent).toContain('network down');
  });

  it('shows an empty-state message when service.list() returns []', async () => {
    registerStubService([]);
    render(<BrandPicker brand={undefined} onBrandSwitch={vi.fn()} />);
    const content = await openDropdown((c) =>
      !!c.querySelector('[data-brand-list="empty"]'),
    );
    const emptyEl = content.querySelector('[data-brand-list="empty"]');
    expect(emptyEl).toBeTruthy();
  });
});
