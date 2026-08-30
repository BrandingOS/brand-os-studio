/**
 * QR codes — the one family where "it renders" was never the question.
 *
 * The designs this replaced drew a convincing picture: three finder
 * squares in the corners and a field of cells filled by `(r * 13 + c * 7 +
 * ((r ^ c) * 17)) % 5 < 2`. It looked exactly like a QR code and it
 * encoded nothing. That defect survives every review a human can do by
 * eye, and it survives a screenshot test, because the failure only
 * happens later — on somebody else's phone, holding a printed card.
 *
 * So the assertions here are about the SYMBOL, not the picture:
 *
 *   • the matrix is a real encoding, big enough to be one (a version-1
 *     code is 21 × 21 and no payload we ship fits in one);
 *   • it CHANGES with the payload, which a fixed mask never would;
 *   • the mark in the middle removes modules rather than covering them;
 *   • and the quiet zone is really empty, because a code bled to the edge
 *     of a card is a code a scanner cannot find.
 *
 * The binding half is the ordinary one: every kept design declares both
 * fields. `payload` is declared on the `<svg>` itself — the code IS the
 * field, and there is no text to hang it on.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { Brand } from '@/shared/types/brand';
import type { QrContent } from '@/features/brandkit/content/kinds';
import { hydrateContent } from '@/features/brandkit/content/kinds';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { isGeneratedName } from '../../data/cardPresentation';
import { curatedName, isArchived, tagsFor } from '../curation';
import { SWEEP_BRAND } from '../__guards__/bindSweep';
import {
  BrandedQrRenderer,
  MinimalQrRenderer,
  QR_ARCHIVED_IDS,
  QR_BRANDED_EXTENDED,
  QR_KEPT_NAMES,
  QR_MINIMAL_EXTENDED,
  QR_NAMES,
  QR_ROUNDED_EXTENDED,
  QR_SQUARE_EXTENDED,
  QR_TYPES,
  RoundedQrRenderer,
  SquareQrRenderer,
  qrMatrix,
} from '../QrCodeExtended';

afterEach(cleanup);

const RENDERERS = {
  'qr-branded': BrandedQrRenderer,
  'qr-minimal': MinimalQrRenderer,
  'qr-rounded': RoundedQrRenderer,
  'qr-square': SquareQrRenderer,
} as const;

const LISTS = {
  'qr-branded': QR_BRANDED_EXTENDED,
  'qr-minimal': QR_MINIMAL_EXTENDED,
  'qr-rounded': QR_ROUNDED_EXTENDED,
  'qr-square': QR_SQUARE_EXTENDED,
} as const;

const BRAND = SWEEP_BRAND as Brand;

function content(over: Partial<QrContent> = {}): QrContent {
  const base = hydrateContent('qr', mockBrand, undefined) as QrContent;
  return { ...base, ...over };
}

/** Render one design and hand back its container. */
function renderDesign(type: (typeof QR_TYPES)[number], index: number, c: QrContent) {
  const Renderer = RENDERERS[type];
  return render(<Renderer brand={BRAND} templateIndex={index} content={{ kind: 'qr', ...c }} />)
    .container;
}

describe('the code is a real encoding', () => {
  it('encodes the payload, and refuses to invent one', () => {
    const m = qrMatrix('https://example.test/scan');
    expect(m).not.toBeNull();
    // Version 1 is 21×21; every URL we ship needs more than that at 'H'.
    expect(m!.size).toBeGreaterThanOrEqual(21);
    expect(m!.dark.filter(Boolean).length).toBeGreaterThan(100);
    // Nothing to encode is answered with nothing, never with a pattern.
    expect(qrMatrix('')).toBeNull();
    expect(qrMatrix('   ')).toBeNull();
  });

  it('changes when the payload changes', () => {
    const a = qrMatrix('https://example.test/one')!;
    const b = qrMatrix('https://example.test/two')!;
    expect(a.dark.join('')).not.toEqual(b.dark.join(''));
  });

  it.each(QR_TYPES)('%s draws more than a hundred modules', (type) => {
    const container = renderDesign(type, 0, content({ payload: 'https://example.test/scan' }));
    const cells = container.querySelectorAll('[data-qr-cell]');
    expect(cells.length).toBeGreaterThan(100);
  });

  it.each(QR_TYPES)('%s redraws when the payload changes', (type) => {
    const one = renderDesign(type, 0, content({ payload: 'https://example.test/one' }));
    const first = one.querySelector('svg')!.innerHTML;
    cleanup();
    const two = renderDesign(type, 0, content({ payload: 'https://example.test/two' }));
    const second = two.querySelector('svg')!.innerHTML;
    expect(first).not.toEqual(second);
  });

  it('leaves the quiet zone empty on every side', () => {
    const container = renderDesign('qr-square', 0, content({ payload: 'https://example.test/qz' }));
    const svg = container.querySelector('svg')!;
    const [, , total] = svg.getAttribute('viewBox')!.split(' ').map(Number);
    const size = Number(svg.getAttribute('data-qr-size'));
    // The viewBox is the symbol plus four modules of margin on each side.
    expect(total).toBe(size + 8);
    for (const cell of Array.from(svg.querySelectorAll('rect[data-qr-cell]'))) {
      const x = Number(cell.getAttribute('x'));
      const y = Number(cell.getAttribute('y'));
      expect(x).toBeGreaterThanOrEqual(4);
      expect(y).toBeGreaterThanOrEqual(4);
      expect(x).toBeLessThan(total - 4);
      expect(y).toBeLessThan(total - 4);
    }
  });

  it('the centred mark removes modules instead of covering them', () => {
    const c = content({ payload: 'https://example.test/mark' });
    // Branded carries the mark; Square is the same square cell without it.
    const withMark = renderDesign('qr-branded', 0, c).querySelectorAll('[data-qr-cell]').length;
    cleanup();
    const without = renderDesign('qr-square', 0, c).querySelectorAll('[data-qr-cell]').length;
    expect(withMark).toBeLessThan(without);
  });

  it('draws an empty plate rather than a decorative matrix', () => {
    const container = renderDesign('qr-minimal', 0, content({ payload: '' }));
    expect(container.querySelectorAll('[data-qr-cell]')).toHaveLength(0);
    expect(container.querySelector('[data-qr-empty]')).not.toBeNull();
    // Still a field: an empty payload is editable, not a dead card.
    expect(container.querySelector('[data-bind="payload"]')).not.toBeNull();
  });
});

describe('binding', () => {
  it.each(QR_TYPES)('%s — every kept design declares payload and label', (type) => {
    for (let i = 0; i < QR_KEPT_NAMES.length; i += 1) {
      const container = renderDesign(type, i, content());
      const paths = new Set(
        Array.from(container.querySelectorAll('[data-bind]')).map((el) =>
          el.getAttribute('data-bind'),
        ),
      );
      expect([...paths].sort(), `${type}-ext-${i + 1}`).toEqual(['label', 'payload']);
      cleanup();
    }
  });

  it('paints the label the customer supplied, not a literal', () => {
    const container = renderDesign('qr-branded', 0, content({ label: 'members.example.test' }));
    expect(container.textContent).toContain('members.example.test');
  });
});

describe('curation', () => {
  it('keeps six presentations per style and reserves the rest', () => {
    for (const type of QR_TYPES) {
      const allIds = LISTS[type].map((t) => `${type}-${t.idSuffix}`);
      expect(allIds).toHaveLength(30);
      for (const id of allIds.slice(0, 6)) expect(isArchived(id)).toBe(false);
      for (const id of allIds.slice(6)) expect(isArchived(id)).toBe(true);
    }
    expect(QR_ARCHIVED_IDS).toHaveLength(4 * 24);
  });

  it('gives every kept design a designer’s name and its own tags', () => {
    expect(Object.keys(QR_NAMES)).toHaveLength(4 * 6);
    for (const id of Object.keys(QR_NAMES)) {
      const name = curatedName(id);
      expect(name, id).toBeTruthy();
      expect(isGeneratedName(name!), `${id} → ${name}`).toBe(false);
      expect(tagsFor(id).length, id).toBeGreaterThanOrEqual(2);
    }
    // Within one card the six names have to be distinguishable.
    for (const type of QR_TYPES) {
      const names = Object.keys(QR_NAMES)
        .filter((id) => id.startsWith(`${type}-`))
        .map((id) => QR_NAMES[id]);
      expect(new Set(names).size).toBe(6);
    }
  });

  it('never renumbers — ext-1 is still the first design', () => {
    expect(QR_NAMES['qr-branded-ext-1']).toBe(QR_KEPT_NAMES[0]);
    expect(QR_BRANDED_EXTENDED[0].idSuffix).toBe('ext-1');
    expect(QR_SQUARE_EXTENDED[29].idSuffix).toBe('ext-30');
  });
});
