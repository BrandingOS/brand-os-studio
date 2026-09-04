/**
 * The wall has to actually be on the page.
 *
 * This is the failure this codebase keeps meeting: a renderer authored at its
 * own resolution, mounted in a host with no definite height, lays out at 0×0
 * and everything "succeeds" — the component renders, the test passes, and the
 * band is blank. `BentoCanvas` measures its container's `clientHeight` to pick
 * a scale, so `.bi-bento-host` MUST carry a height. Only a real layout engine
 * can prove it does, which is why this is a browser test and the rest of the
 * bento coverage is not.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { Brand } from '@/shared/types/brand';
import { buildIdentityModel, presentSections } from '../identityModel';
import { buildRegister } from '../identityRegister';
import { BentoSurface } from '../sections/BentoSurface';
import '../identity.css';

const SVG = 'data:image/svg+xml,%3Csvg%3E%3C/svg%3E';

const brand = () =>
  ({
    id: 'b-kaafex',
    slug: 'kaafex',
    name: 'Kaafex',
    primaryColor: '#1934EE',
    secondaryColor: '#F36123',
    fonts: { primary: 'Fraunces' },
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    logoSystem: { primary: { assetId: 'a1' } },
    brandAssets: [
      { id: 'a1', kind: 'logo', name: 'a1', formats: { svg: { url: SVG, size: 1 } }, metadata: {} },
    ],
    identity: {
      colors: {
        primary: { hex: '#1934EE' },
        secondary: { hex: '#F36123' },
        neutrals: [{ hex: '#111111' }, { hex: '#EFEFEF' }],
      },
      logos: {},
      typography: { primary: { family: 'Fraunces' } },
      voice: { personality: [], doList: [], dontList: [], examples: [] },
      strategy: { values: [], personality: [], aboutSections: [] },
    },
  }) as unknown as Brand;

function mount() {
  const b = brand();
  const model = buildIdentityModel({ brand: b });
  const register = buildRegister(model, presentSections(model));
  // `[data-identity]` is what every rule in identity.css is scoped to — the
  // same ancestor-scoping trap the kit's snapshot host fell into. A host
  // mounted outside it gets none of the sizing below.
  return render(
    <div data-identity style={{ width: 1100, ...(register.tokens as object) }}>
      <BentoSurface model={model} register={register} />
    </div>,
  );
}

afterEach(cleanup);

describe('the bento band on the identity page', () => {
  it('gives the artboard a box with real height', () => {
    const { container } = mount();
    const host = container.querySelector<HTMLElement>('.bi-bento-host');
    expect(host).not.toBeNull();
    expect(host!.getBoundingClientRect().height).toBeGreaterThan(200);
  });

  it('draws the maker’s own artboard, at a visible scale', () => {
    const { container } = mount();
    const artboard = container.querySelector<HTMLElement>('[data-bento-artboard]');
    // `data-bento-artboard` is BentoCanvas's own element — its presence is the
    // proof that this page renders the real bento rather than a copy of one.
    expect(artboard).not.toBeNull();
    const box = artboard!.getBoundingClientRect();
    expect(box.width).toBeGreaterThan(300);
    expect(box.height).toBeGreaterThan(150);
  });

  it('renders a tile for every cell of the template', () => {
    const { container } = mount();
    const artboard = container.querySelector<HTMLElement>('[data-bento-artboard]');
    expect(artboard!.children.length).toBeGreaterThan(2);
  });

  it('offers nothing to click — it is a document, not a canvas', () => {
    const { container } = mount();
    // `interactive={false}` must hold: no delete buttons, no add-block cells,
    // no pointer affordance. A control here would edit a bento the page does
    // not own and cannot save.
    expect(container.querySelectorAll('button')).toHaveLength(0);
    const artboard = container.querySelector<HTMLElement>('[data-bento-artboard]');
    for (const tile of Array.from(artboard!.children)) {
      expect(getComputedStyle(tile as HTMLElement).cursor).not.toBe('pointer');
    }
  });
});
