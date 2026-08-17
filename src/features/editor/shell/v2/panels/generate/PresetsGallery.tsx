// Creation intents.
//
// Text-first on purpose. The previous gallery fired eight uncached external
// image requests every time the panel opened, to show thumbnails of images
// nobody asked for. A preset's job is to set the prompt intent AND the shape,
// which is exactly what the label promises.

import type { Brand } from '@/shared/types/brand';
import { PROMPT_PRESETS, type PromptPreset } from './formats';

export function PresetsGallery({
  brand, onApply, disabled,
}: { brand?: Brand; onApply: (p: PromptPreset) => void; disabled?: boolean }) {
  return (
    <section className="flex flex-col gap-1.5 mt-1" data-generate-presets>
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
          Start from
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {brand ? `On ${brand.name}` : 'Generic'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {PROMPT_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => onApply(p)}
            data-generate-preset={p.id}
            title={p.prompt.replace(/\{brand\}/g, brand?.name ?? 'your brand')}
            className="flex flex-col gap-0.5 rounded-lg border px-2 py-1.5 text-left transition-colors hover:bg-muted disabled:opacity-50"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          >
            <span className="text-[11px] font-medium truncate">{p.title}</span>
            <span className="text-[9.5px] truncate" style={{ color: 'var(--text-muted)' }}>{p.intent}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
