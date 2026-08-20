// BrandIncludes — what of the brand may appear in the result.
//
// Replaces the On-brand / Raw switch, which asked the wrong question. "Raw"
// meant "forget the brand entirely", so a user who wanted their own colours on
// one poster had to throw away the logo, the typography and the brand name
// with them — and the switch label told them nothing about which of those four
// things it was about to drop.
//
// Everything is included by default. Each toggle is an INSTRUCTION carried in
// the brief and in the reference images; none of them rewrites, annotates or
// clutters the words the user typed.

import { Fingerprint, Palette, Shapes, Type } from 'lucide-react';
import type { BrandInclusions } from '@/features/editor/ai/imagePrompt/artDirection';

const ITEMS: Array<{
  key: keyof BrandInclusions;
  label: string;
  Icon: typeof Palette;
  on: string;
  off: string;
}> = [
  {
    key: 'logo', label: 'Logo', Icon: Shapes,
    on: 'The real logo is attached and placed in the frame.',
    off: 'No logo, wordmark or watermark anywhere in the result.',
  },
  {
    key: 'text', label: 'Text', Icon: Type,
    on: 'Words may be set — exactly the ones you type, never invented ones.',
    off: 'No words at all: no headline, no caption, no signage.',
  },
  {
    key: 'colours', label: 'Colours', Icon: Palette,
    on: "The brand palette is sent as a swatch reference and used by role.",
    off: 'The brand palette is left out; colour comes from your request alone.',
  },
  {
    key: 'identity', label: 'Brand identity', Icon: Fingerprint,
    on: "The brand's typography character and visual language guide the look.",
    off: "The brand's style cues are left out; only your request directs the look.",
  },
];

export function BrandIncludes({
  value, onChange, disabled, brandName,
}: {
  value: BrandInclusions;
  onChange: (next: BrandInclusions) => void;
  disabled?: boolean;
  brandName?: string;
}) {
  const offCount = ITEMS.filter((i) => !value[i.key]).length;

  return (
    <section className="flex flex-col gap-1" data-generate-brand-includes>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Brand includes
        </span>
        <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
          {offCount === 0
            ? brandName ? `All of ${brandName}` : 'Everything'
            : `${offCount} left out`}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {ITEMS.map(({ key, label, Icon, on, off }) => {
          const active = value[key];
          return (
            <button
              key={key}
              type="button"
              role="switch"
              aria-checked={active}
              aria-label={`Include ${label}`}
              data-generate-include={key}
              disabled={disabled}
              title={active ? on : off}
              onClick={() => onChange({ ...value, [key]: !active })}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border px-1.5 text-[10.5px] font-medium transition-colors disabled:opacity-50"
              style={{
                borderColor: active ? 'var(--accent)' : 'var(--border)',
                background: active
                  ? 'color-mix(in oklab, var(--accent) 10%, transparent)'
                  : 'var(--surface)',
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                textDecoration: active ? 'none' : 'line-through',
              }}
            >
              <Icon className="h-3 w-3 shrink-0" aria-hidden style={{ opacity: active ? 1 : 0.6 }} />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
