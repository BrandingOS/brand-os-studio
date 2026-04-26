// src/shared/presentation/theme/__tests__/DeckThemeProvider.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DeckThemeProvider } from '../DeckThemeProvider';
import { EMPTY_THEME } from '../types';
import type { Brand } from '@/shared/types/brand';

const baseBrand: Brand = {
  id: 'b1', slug: 'b1', name: 'Test',
  primaryColor: '#001563',
  fonts: { primary: 'Inter' },
  tone: '', audience: '', assets: [],
  createdAt: new Date(), updatedAt: new Date(),
};

describe('DeckThemeProvider', () => {
  it('writes --deck-* vars on the wrapping element', () => {
    const { container } = render(
      <DeckThemeProvider brand={baseBrand} theme={EMPTY_THEME} deckKind="pitch-deck">
        <div data-testid="child">hi</div>
      </DeckThemeProvider>,
    );
    const wrap = container.firstElementChild as HTMLElement;
    expect(wrap.getAttribute('data-deck')).toBe('pitch-deck');
    // Inline-style CSS vars are surfaced via .style — read directly.
    expect(wrap.style.getPropertyValue('--deck-text-h1')).toMatch(/px$/);
    expect(wrap.style.getPropertyValue('--deck-bg-page')).toMatch(/^#/);
  });

  it('emits data-logo-pos from theme.style.logoPlacement', () => {
    const { container } = render(
      <DeckThemeProvider brand={baseBrand} theme={{ ...EMPTY_THEME, style: { ...EMPTY_THEME.style, logoPlacement: 'tr' } }} deckKind="pitch-deck">
        <span />
      </DeckThemeProvider>,
    );
    const wrap = container.firstElementChild as HTMLElement;
    expect(wrap.getAttribute('data-logo-pos')).toBe('tr');
  });
});
