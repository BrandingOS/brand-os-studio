/**
 * The role a logo was given is a QUESTION until the owner answers it.
 *
 * The system places every mark it recognises, and it is sometimes wrong in a
 * way only a person can see — a wide logotype exported as `Logomark.svg` looks
 * like an icon to a filename and nothing like one to an eye. So the board asks,
 * and this proves the asking is real: that a placement we made carries a
 * confirm affordance, that answering it removes the question, and that nothing
 * afterwards puts our answer back over theirs.
 *
 * A real browser, because the chip, its glyph and its button are the whole
 * feature — there is nothing here a jsdom snapshot would tell the truth about.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LogoSlots } from '../panels/LogoSlots';
import { useV4Store } from '../store/onboardingV4Store';
import type { OnboardingAsset } from '../types';

const logo = (over: Partial<OnboardingAsset> = {}): OnboardingAsset => ({
  id: 'l1',
  name: 'Logomark.svg',
  sub: '',
  kind: 'image',
  isLogo: true,
  // A 1×1 transparent GIF — enough for an <img> to render with.
  previewUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  uploadStatus: 'done',
  uploadProgress: 1,
  ...over,
});

/**
 * The board, wired to the store the way the review wires it.
 *
 * `assets` is a prop there too, fed from the store — so a test that passed a
 * frozen array would never see the board react to its own writes.
 */
function Board() {
  const assets = useV4Store((s) => s.assets);
  return <LogoSlots assets={assets} />;
}

function board(assets: OnboardingAsset[]) {
  useV4Store.setState({ assets, extraLogoSlots: [] });
  return render(<Board />);
}

beforeEach(() => useV4Store.getState().reset());
afterEach(cleanup);

describe('a placement the system made', () => {
  it('asks to be confirmed', () => {
    board([logo({ logoSlot: 'mark' })]);
    expect(screen.getByRole('button', { name: /confirm this is the icon/i })).toBeTruthy();
  });

  it('stops asking once the owner says yes', async () => {
    board([logo({ logoSlot: 'mark' })]);
    fireEvent.click(screen.getByRole('button', { name: /confirm this is the icon/i }));
    // A beat, for the control to answer before it retires.
    await new Promise((r) => setTimeout(r, 700));
    expect(useV4Store.getState().assets[0].slotConfirmed).toBe(true);
    expect(screen.queryByRole('button', { name: /confirm this is the/i })).toBeNull();
  });

  it('is left alone once confirmed', () => {
    board([logo({ logoSlot: 'mark', slotConfirmed: true })]);
    expect(screen.queryByRole('button', { name: /confirm this is the/i })).toBeNull();
  });

  it('never asks about a variant it derived itself', () => {
    // The black/white twin exists BECAUSE of the logo the user already placed.
    // Its role is the reason it was generated; there is nothing to answer.
    board([logo({ logoSlot: 'dark', generated: true })]);
    expect(screen.queryByRole('button', { name: /confirm this is the/i })).toBeNull();
  });
});

describe('the chip opens the variants, and only the variants', () => {
  // It used to open the whole logo menu — Replace, two of the seven roles, and
  // a red Remove. The chip asks which kind of logo this is; what it opens
  // should be the answer to that question.
  it('shows every role as a card, marking the one it has', async () => {
    board([logo({ logoSlot: 'mark' })]);
    fireEvent.click(document.querySelector('.logo-slot-name')!);
    await screen.findByText('Wordmark');
    const labels = [...document.querySelectorAll('.logo-variant-card-label')].map((e) => e.textContent);
    expect(labels).toEqual(['Primary', 'Wordmark', 'Icon', 'On dark', 'Horizontal', 'Vertical']);
    expect(document.querySelector('.logo-variant-card.is-current .logo-variant-card-label')?.textContent).toBe('Icon');
  });

  it('offers nothing but roles — no replace, no remove', async () => {
    board([logo({ logoSlot: 'mark' })]);
    fireEvent.click(document.querySelector('.logo-slot-name')!);
    await screen.findByText('Wordmark');
    const inPicker = [...document.querySelectorAll('.logo-variant-picker')]
      .map((p) => p.textContent ?? '')
      .join(' ');
    expect(inPicker).not.toMatch(/replace|remove/i);
  });

  it('moves the logo to the role picked, and that settles the question', async () => {
    board([logo({ logoSlot: 'mark' })]);
    fireEvent.click(document.querySelector('.logo-slot-name')!);
    const wordmark = (await screen.findByText('Wordmark')).closest('button')!;
    fireEvent.click(wordmark);
    const moved = useV4Store.getState().assets[0];
    expect(moved.logoSlot).toBe('wordmark');
    expect(moved.slotConfirmed).toBe(true);
  });
});

describe('the chip says which kind of logo this is', () => {
  it('draws the variant beside its name', () => {
    const { container } = board([logo({ logoSlot: 'mark' })]);
    const chip = container.querySelector('.logo-slot-name');
    expect(chip?.textContent).toContain('Icon');
    expect(chip?.querySelector('.logo-slot-name-icon svg')).toBeTruthy();
  });

  it('leaves the primary without one — it is the logo, not a variant of it', () => {
    const { container } = board([logo({ logoSlot: 'primary' })]);
    const chip = container.querySelector('.logo-slot-name');
    expect(chip?.textContent).toContain('Primary');
    expect(chip?.querySelector('.logo-slot-name-icon')).toBeNull();
  });
});

describe('the board starts with one question', () => {
  it('offers the Primary and nothing else', () => {
    board([]);
    const labels = [...document.querySelectorAll('.logo-slot-empty')].map((e) => e.textContent);
    expect(labels).toEqual(['+Add primary']);
  });

  it('never offers an On light slot — a light ground is the ordinary case', async () => {
    board([]);
    fireEvent.click(screen.getByRole('button', { name: /add variation/i }));
    const offered = [...document.querySelectorAll('.logo-variant-card-label')].map((e) => e.textContent);
    expect(offered).not.toContain('On light');
    expect(offered).toEqual(['Wordmark', 'Icon', 'On dark', 'Horizontal', 'Vertical', 'Other']);
  });

  it('lets the user name a variant this product has no name for', async () => {
    board([]);
    fireEvent.click(screen.getByRole('button', { name: /add variation/i }));
    fireEvent.click(screen.getByRole('button', { name: /add a variant of your own/i }));
    const field = await screen.findByLabelText('Variant name');
    expect(field).toBeTruthy();
  });
});

describe('an on-dark logo is shown on dark', () => {
  it('paints the tile so a white logo is visible at all', () => {
    board([logo({ logoSlot: 'dark' })]);
    expect(document.querySelector('.logo-slot')?.classList.contains('tone-dark')).toBe(true);
  });

  it('keeps its own label readable there', () => {
    // The chip on a dark tile is light-on-dark. An "unconfirmed" rule that set
    // a dark text colour would have made it unreadable on exactly the tile it
    // matters most on.
    board([logo({ logoSlot: 'dark' })]);
    const chip = document.querySelector('.logo-slot.tone-dark .logo-slot-name') as HTMLElement;
    const { color, backgroundColor } = getComputedStyle(chip);
    const lum = (c: string) => {
      const [r, g, b] = c.match(/\d+/g)!.map(Number);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    expect(Math.abs(lum(color) - lum(backgroundColor))).toBeGreaterThan(80);
  });

  it('is never conjured empty', () => {
    // Nothing was classified as on-dark, so there is no on-dark tile.
    board([logo({ logoSlot: 'primary' })]);
    const roles = [...document.querySelectorAll('.logo-slot-name')].map((e) => e.textContent);
    expect(roles).toEqual(['Primary']);
  });
});

describe('confirming says so', () => {
  it('asks in a word rather than a glyph', () => {
    board([logo({ logoSlot: 'mark' })]);
    expect(document.querySelector('.logo-slot-confirm')?.textContent).toContain('Confirm');
  });

  it('answers before it goes', async () => {
    board([logo({ logoSlot: 'mark' })]);
    fireEvent.click(document.querySelector('.logo-slot-confirm')!);
    expect(document.querySelector('.logo-slot-confirm')?.textContent).toContain('Confirmed');
    await new Promise((r) => setTimeout(r, 700));
    expect(useV4Store.getState().assets[0].slotConfirmed).toBe(true);
    expect(document.querySelector('.logo-slot-confirm')).toBeNull();
  });
});

describe('a JPEG logo is allowed, and said so', () => {
  it('names the file and what might be wrong with it', () => {
    board([logo({ logoSlot: 'primary', name: 'company-logo.jpg' })]);
    const note = document.querySelector('.logo-raster-note')?.textContent ?? '';
    expect(note).toContain('company-logo.jpg');
    expect(note).toMatch(/transparent PNG or SVG/i);
  });

  it('does not stand in the way of the upload', () => {
    board([logo({ logoSlot: 'primary', name: 'company-logo.jpg' })]);
    expect(document.querySelector('.logo-slot img')).toBeTruthy();
  });

  it('says nothing about a vector', () => {
    board([logo({ logoSlot: 'primary', name: 'logo.svg' })]);
    expect(document.querySelector('.logo-raster-note')).toBeNull();
  });
});
