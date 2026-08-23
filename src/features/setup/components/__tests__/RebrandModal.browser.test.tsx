// The rebrand flow end to end in a real browser: direction → paste →
// per-section review → apply payload — plus the two safety rules this modal
// exists for: replacement starts UNTICKED, and a refused paste cannot apply.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RebrandModal, type RebrandApply } from '../RebrandModal';
import { buildBrandingPrompt } from '../../strategy/brandingPrompt';
import { saveCheckpoint, clearCheckpoints } from '../../strategy/checkpoints';
import { EMPTY_STRATEGY, type MockBrand } from '../../data/mockBrand';

const blank: MockBrand = {
  name: 'Northwind',
  logos: [],
  colors: { core: [], accent: [], grey: [] },
  fonts: [],
  icons: [],
  photos: [],
  websites: [],
  voice: { essay: '', pillars: [] },
  about: [],
  strategy: { ...EMPTY_STRATEGY },
  links: [],
};

const filled: MockBrand = {
  ...blank,
  colors: {
    core: [{ hex: '#7231FF', name: 'Violet' }],
    accent: [{ hex: '#00D4AA', name: 'Mint' }],
    grey: [],
  },
  fonts: [
    { id: 'f1', family: 'Instrument Serif', role: 'Display', weights: 'Regular' },
    { id: 'f2', family: 'Inter', role: 'Text', weights: '400' },
  ],
  icons: ['fi-rr-star', 'fi-rr-heart'],
  strategy: { ...EMPTY_STRATEGY, mission: 'The old mission.' },
};

const REPLY = [
  'Brand summary: Northwind moves freight for small importers.',
  'Mission: To make shipping boring.',
  'Colors: #1B4D3E #E8DCC8 #C05621',
  'Fonts: Playfair Display + Source Sans Pro',
].join('\n');

const open = (brand: MockBrand = blank, brandId = 'rb-test') => {
  const onApply = vi.fn<(r: RebrandApply) => void>();
  const onRestore = vi.fn();
  const utils = render(
    <RebrandModal
      open
      brandName={brand.name}
      brand={brand}
      brandId={brandId}
      onClose={vi.fn()}
      onApply={onApply}
      onRestore={onRestore}
    />,
  );
  return { ...utils, onApply, onRestore };
};

const paste = (text: string) => {
  const ta = document.querySelector('[data-rebrand-paste] , textarea[data-rebrand-paste]') as HTMLTextAreaElement;
  fireEvent.change(ta, { target: { value: text } });
};

afterEach(() => {
  cleanup();
  clearCheckpoints('rb-test');
});

describe('RebrandModal — review blocks', () => {
  it('renders a block per recognised section', () => {
    open(blank);
    paste(REPLY);
    expect(document.querySelector('[data-rebrand-block="colors"]')).toBeTruthy();
    expect(document.querySelector('[data-rebrand-block="fonts"]')).toBeTruthy();
    expect(document.querySelector('[data-rebrand-block="strategy"]')).toBeTruthy();
    // Icons follow the new strategy, so a strategy answer produces a set.
    expect(document.querySelector('[data-rebrand-block="icons"]')).toBeTruthy();
  });

  // The rule this feature was commissioned with: replacing needs opt-in.
  it('a section that REPLACES starts unticked; one that FILLS starts ticked', () => {
    open(filled);
    paste(REPLY);
    const colors = document.querySelector('[data-rebrand-block="colors"] .rb-block-head');
    const fonts = document.querySelector('[data-rebrand-block="fonts"] .rb-block-head');
    expect(colors?.getAttribute('aria-pressed')).toBe('false');
    expect(fonts?.getAttribute('aria-pressed')).toBe('false');

    cleanup();
    open(blank);
    paste(REPLY);
    expect(
      document.querySelector('[data-rebrand-block="colors"] .rb-block-head')?.getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('the same rule holds per strategy answer', () => {
    open(filled); // mission is set, summary is empty
    paste(REPLY);
    expect(document.querySelector('[data-field="mission"]')?.getAttribute('aria-pressed')).toBe('false');
    expect(document.querySelector('[data-field="summary"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(/replaces .*The old mission/)).toBeTruthy();
  });

  it('warns when replacing typography that carries uploaded files', () => {
    const withFiles: MockBrand = {
      ...filled,
      fonts: [
        {
          id: 'f1', family: 'Custom Sans', role: 'Display', weights: 'Bold',
          files: [{ name: 'c.ttf', weight: 'Bold', format: 'ttf', dataUrl: 'data:font/ttf;base64,AA', size: 2 }],
        },
      ],
    };
    open(withFiles);
    paste(REPLY);
    expect(document.querySelector('[data-rebrand-files-warning]')).toBeTruthy();
  });
});

describe('RebrandModal — apply payload', () => {
  it('applies exactly the ticked sections, nothing else', () => {
    const { onApply } = open(filled);
    paste(REPLY);
    // Everything replacing is off by default; opt colors in, tick mission on.
    fireEvent.click(document.querySelector('[data-rebrand-block="colors"] .rb-block-head') as HTMLElement);
    fireEvent.click(document.querySelector('[data-field="mission"]') as HTMLElement);
    fireEvent.click(document.querySelector('[data-rebrand-apply]') as HTMLElement);

    expect(onApply).toHaveBeenCalledTimes(1);
    const result = onApply.mock.calls[0][0];
    expect(result.palette?.core.map((c) => c.hex)).toEqual(['#1B4D3E', '#E8DCC8', '#C05621']);
    expect(result.pairing).toBeUndefined(); // fonts stayed unticked
    expect(result.strategy?.map((f) => f.key).sort()).toEqual(['mission', 'summary']);
  });

  it('cannot apply an empty selection', () => {
    open(filled);
    paste(REPLY);
    // Untick the only default-on rows (the empty-filling strategy answer + icons).
    fireEvent.click(document.querySelector('[data-field="summary"]') as HTMLElement);
    const icons = document.querySelector('[data-rebrand-block="icons"] .rb-block-head');
    if (icons?.getAttribute('aria-pressed') === 'true') fireEvent.click(icons);
    expect((document.querySelector('[data-rebrand-apply]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('carries the direction into the payload', () => {
    const { onApply } = open(blank);
    fireEvent.change(document.querySelector('[data-rebrand-direction]') as HTMLElement, {
      target: { value: 'go premium' },
    });
    paste(REPLY);
    fireEvent.click(document.querySelector('[data-rebrand-apply]') as HTMLElement);
    expect(onApply.mock.calls[0][0].direction).toBe('go premium');
  });
});

describe('RebrandModal — refusing what is not a reply', () => {
  it('refuses its own prompt and cannot apply', () => {
    open(filled);
    paste(buildBrandingPrompt('Northwind'));
    expect(document.querySelector('[data-problem]')?.getAttribute('data-problem')).toBe('prompt');
    expect((document.querySelector('[data-rebrand-apply]') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('RebrandModal — checkpoints', () => {
  it('lists checkpoints and restores whole or one section', () => {
    saveCheckpoint(
      'rb-test',
      {
        colors: { core: [{ hex: '#111111', name: 'Ink' }], accent: [] },
        fonts: [{ id: 'f1', family: 'Inter', role: 'Text', weights: '400' }],
        strategy: { ...EMPTY_STRATEGY, mission: 'Before.' },
        about: [],
        icons: ['fi-rr-star'],
      },
      ['colors'],
      'the premium push',
    );
    const { onRestore } = open(filled);
    fireEvent.click(document.querySelector('[data-rebrand-history-toggle]') as HTMLElement);
    expect(screen.getByText('the premium push')).toBeTruthy();

    fireEvent.click(screen.getByText('Restore all'));
    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(onRestore.mock.calls[0][1]).toEqual(['colors', 'fonts', 'strategy', 'icons']);

    fireEvent.click(document.querySelector('[data-restore-section="colors"]') as HTMLElement);
    expect(onRestore.mock.calls[1][1]).toEqual(['colors']);
  });
});
