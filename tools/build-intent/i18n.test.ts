import { describe, expect, it } from 'vitest';
import { translate } from './i18n';
import { seed } from './model';

describe('workspace localization', () => {
  it('localizes the curated example without changing its stored intent', () => {
    const original = JSON.stringify(seed);
    expect(translate(seed[0].intent, 'en')).toContain('The brand owner starts');
    expect(translate(seed[0].intent, 'ar')).toBe(seed[0].intent);
    expect(JSON.stringify(seed)).toBe(original);
  });
  it('preserves original user content and localizes only system framing', () => {
    expect(translate('My custom request', 'ar')).toBe('My custom request');
    expect(translate('عايز شكل مختلف', 'en')).toBe('عايز شكل مختلف');
    expect(translate('تصحيح: عايز شكل مختلف', 'en')).toBe('Correction: عايز شكل مختلف');
    expect(translate('إضافة معيار قبول: النص كما كتبته', 'en')).toBe('Acceptance criterion added: النص كما كتبته');
    expect(translate('اعتمد صاحب المنتج الاتجاه، نسخة 3.', 'en')).toBe('Product owner approved the direction, revision 3.');
  });
});
