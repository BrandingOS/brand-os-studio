// Phase 11.2 — BrandSetupChecklist render tests.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BrandSetupChecklist } from './BrandSetupChecklist';
import type { Brand } from '@/shared/types/brand';

const blankBrand: Brand = {
  id: 'b',
  slug: 'raqm',
  name: 'Raqm',
  primaryColor: '',
  fonts: { primary: '' },
  tone: '',
  audience: '',
  assets: [],
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Brand;

const wrap = (b: Brand) =>
  render(
    <MemoryRouter>
      <BrandSetupChecklist brand={b} />
    </MemoryRouter>,
  );

afterEach(() => cleanup());

describe('BrandSetupChecklist', () => {
  it('renders 4 step rows on a blank brand', () => {
    const { container } = wrap(blankBrand);
    expect(container.querySelectorAll('[data-step-id]').length).toBe(4);
  });

  it('progress badge reads 0 / 4 on a blank brand', () => {
    const { container } = wrap(blankBrand);
    const wrapper = container.querySelector('[data-brand-setup-checklist]');
    expect(wrapper?.getAttribute('data-progress')).toBe('0/4');
  });

  it('progress badge reads 2 / 4 when half done', () => {
    const half: Brand = { ...blankBrand, primaryColor: '#ff0000', tone: 'playful' };
    const { container } = wrap(half);
    expect(
      container.querySelector('[data-brand-setup-checklist]')?.getAttribute('data-progress'),
    ).toBe('2/4');
  });

  it('renders nothing when every step is satisfied', () => {
    const full: Brand = {
      ...blankBrand,
      primaryColor: '#ff0000',
      logo: '/logo.svg',
      fonts: { primary: 'Inter' },
      tone: 'playful',
    };
    const { container } = wrap(full);
    expect(container.firstChild).toBeNull();
  });

  it('done steps carry data-step-done="true"', () => {
    const half: Brand = { ...blankBrand, primaryColor: '#ff0000' };
    const { container } = wrap(half);
    const colors = container.querySelector('[data-step-id="colors"]');
    expect(colors?.getAttribute('data-step-done')).toBe('true');
    const voice = container.querySelector('[data-step-id="voice"]');
    expect(voice?.getAttribute('data-step-done')).toBe('false');
  });

  it('progress fill width matches done ratio', () => {
    const three: Brand = {
      ...blankBrand,
      primaryColor: '#f00',
      logo: '/a.svg',
      tone: 'playful',
    };
    const { container } = wrap(three);
    const fill = container.querySelector(
      '[data-brand-setup-progress-fill]',
    ) as HTMLElement;
    // 3 of 4 done → 75%
    expect(fill.style.width).toBe('75%');
  });
});
