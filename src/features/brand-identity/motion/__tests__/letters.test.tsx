/**
 * Text that arrives a piece at a time — without losing the ability to wrap.
 *
 * The whole risk of this component is invisible in a unit test that only checks
 * the rendered string: adjacent inline-block boxes with no whitespace between
 * them are one unbreakable run, so a per-character reveal silently removes
 * every line-break opportunity the heading had and the text runs out of its
 * box. These pin the structure that prevents it.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Letters } from '../Letters';

function matchMedia(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: reduced && query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('character mode', () => {
  it('groups characters inside a per-word box', () => {
    matchMedia(false);
    const { container } = render(<Letters text="Bricolage Grotesque" mode="char" />);
    // Two words, so two unbreakable boxes — and the line may break between
    // them exactly as it would in plain text.
    expect(container.querySelectorAll('.bi-letter-word')).toHaveLength(2);
    expect(container.querySelectorAll('.bi-letter')).toHaveLength('BricolageGrotesque'.length);
  });

  it('keeps the real space between words', () => {
    matchMedia(false);
    const { container } = render(<Letters text="Bricolage Grotesque" mode="char" />);
    // The space is a TEXT NODE, not a span and not a gap: a CSS gap is not a
    // break opportunity, and an animated space is an invisible element that
    // can still take a line of its own.
    expect(container.textContent).toBe('Bricolage Grotesque');
    const spaces = Array.from(container.querySelectorAll('span')).filter(
      (s) => s.textContent === ' ',
    );
    expect(spaces).toHaveLength(0);
  });

  it('staggers continuously across words rather than restarting', () => {
    matchMedia(false);
    const { container } = render(<Letters text="ab cd" mode="char" stagger={10} />);
    const delays = Array.from(container.querySelectorAll('.bi-letter')).map((el) =>
      (el as HTMLElement).style.getPropertyValue('--bi-letter-delay'),
    );
    // A per-word counter would restart at the second word and the ripple would
    // visibly stutter at every space.
    expect(delays).toEqual(['0ms', '10ms', '20ms', '30ms']);
  });
});

describe('word mode', () => {
  it('animates whole words and leaves the spaces alone', () => {
    matchMedia(false);
    const { container } = render(<Letters text="one two three" mode="word" />);
    expect(container.querySelectorAll('.bi-letter')).toHaveLength(3);
    expect(container.querySelectorAll('.bi-letter-word')).toHaveLength(0);
    expect(container.textContent).toBe('one two three');
  });
});

describe('reduced motion', () => {
  it('renders the plain string with no pieces at all', () => {
    matchMedia(true);
    const { container } = render(<Letters as="h2" className="bi-title" text="Logo usage" />);
    // Not a gentler animation — none. The safest version of this effect is the
    // one that never ran.
    expect(container.querySelectorAll('span')).toHaveLength(0);
    expect(screen.getByRole('heading', { name: 'Logo usage' })).toBeTruthy();
  });

  it('keeps the styling hooks its callers depend on', () => {
    matchMedia(true);
    const { container } = render(
      <Letters as="p" className="bi-statement-text" text="Short." data-size="lg" />,
    );
    // The purpose cards size their statement from `data-size`; wrapping the
    // text in this component must not cost them that in either branch.
    expect(container.querySelector('[data-size="lg"]')).toBeTruthy();
  });
});
