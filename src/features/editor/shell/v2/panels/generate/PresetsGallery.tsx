// PresetsGallery — premade prompts with Pollinations preview thumbnails
// that adapt to the active brand on click.

import { useMemo } from 'react';
import type { Brand } from '@/shared/types/brand';
import { PROMPT_PRESETS, type PromptPreset } from './formats';

export function PresetsGallery({
  brand, onApply,
}: { brand?: Brand; onApply: (p: PromptPreset) => void }) {
  const previews = useMemo(() => {
    const brandName = brand?.name ?? 'modern brand';
    return PROMPT_PRESETS.map((p) => {
      const text = p.prompt.replace(/\{brand\}/g, brandName);
      const enc = encodeURIComponent(text).slice(0, 1200);
      const params = new URLSearchParams({
        width: '512', height: '512', nologo: 'true', enhance: 'true',
        model: 'flux', referrer: 'brandos-preview', seed: String(p.previewSeed),
      });
      return { ...p, previewUrl: `https://image.pollinations.ai/prompt/${enc}?${params.toString()}`, fullPrompt: text };
    });
  }, [brand?.name]);

  return (
    <section className="flex flex-col gap-1.5 mt-1" data-generate-presets>
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
          Premade designs
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {brand ? `On ${brand.name}` : 'Generic'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {previews.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onApply(p)}
            title={p.fullPrompt}
            className="group flex flex-col gap-0.5 rounded-lg border overflow-hidden text-left transition-transform hover:-translate-y-0.5"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          >
            <div
              className="aspect-square w-full overflow-hidden"
              style={{ background: `linear-gradient(135deg, color-mix(in oklab, var(--accent) 18%, var(--surface-sunken, transparent)), var(--surface-sunken, transparent))` }}
            >
              <img
                src={p.previewUrl}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
              />
            </div>
            <div className="px-1.5 py-1">
              <div className="text-[10.5px] font-medium truncate">{p.title}</div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
