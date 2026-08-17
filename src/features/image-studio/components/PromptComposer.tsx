// PromptComposer — the one place a generation starts.
//
// Shape of the thing: a prompt, what to attach, what shape to make it, and one
// primary action that says exactly what it will cost. Model choice sits under
// Advanced because "Auto" is right for almost everyone, and every control is
// rendered from the ACTIVE MODEL'S declared capabilities — a switch that cannot
// be honoured is never offered.

import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Paperclip, Settings2, Sparkles, Square, RectangleHorizontal, RectangleVertical, Smartphone, MonitorPlay } from 'lucide-react';
import { DsButton, DsChip } from '@/shared/ds';
import type { Brand } from '@/shared/types/brand';
import type { AspectRatio, ImageModelCaps } from '@/features/image-generation';
import { AUTO_MODEL_ID, displayFor } from '@/features/editor/ai/imageModels';
import { PROMPT_PRESETS, type PromptPreset } from '@/features/editor/shell/v2/panels/generate/formats';
import { useBrandContextOptions, type BrandContextKey } from '../useBrandAssetPicker';
import { ReferenceStrip, type AttachedReference } from './ReferenceStrip';
import type { CapabilityState } from '@/features/editor/shell/v2/panels/generate/useImageModelAvailability';
import { pickerModels } from '@/features/editor/shell/v2/panels/generate/useImageModelAvailability';

const RATIO_ICON: Record<string, typeof Square> = {
  '1:1': Square, '4:5': RectangleVertical, '2:3': RectangleVertical, '9:16': Smartphone,
  '4:3': RectangleHorizontal, '3:2': RectangleHorizontal, '16:9': RectangleHorizontal, '21:9': MonitorPlay,
};

export interface ComposerValue {
  prompt: string;
  aspectRatio: AspectRatio;
  count: number;
  quality?: 'low' | 'medium' | 'high';
  model: string;
  negativePrompt: string;
  brandContext: Set<BrandContextKey>;
  references: AttachedReference[];
}

export interface PromptComposerProps {
  brand: Brand | null | undefined;
  value: ComposerValue;
  onChange: (patch: Partial<ComposerValue>) => void;
  caps: ImageModelCaps;
  capabilities: CapabilityState;
  busy: boolean;
  /** Credits the current settings will cost, from the server. */
  estimate: number | null;
  estimating: boolean;
  balance: number | null;
  onSubmit: () => void;
  onAttach: (file: File) => Promise<void>;
  uploading?: boolean;
  autoFocus?: boolean;
}

export function PromptComposer({
  brand, value, onChange, caps, capabilities, busy,
  estimate, estimating, balance, onSubmit, onAttach, uploading, autoFocus,
}: PromptComposerProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const contextOptions = useBrandContextOptions(brand);
  const models = useMemo(() => pickerModels(capabilities, value.model), [capabilities, value.model]);

  const canAfford = balance == null || estimate == null || balance >= estimate;
  const ready = value.prompt.trim().length > 0 && !busy && canAfford;

  const submit = useCallback(() => { if (ready) onSubmit(); }, [ready, onSubmit]);
  const onKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
  }, [submit]);

  const applyPreset = useCallback((p: PromptPreset) => {
    const ratioByFormat: Record<string, AspectRatio> = {
      square: '1:1', portrait: '4:5', tall: '2:3', vertical: '9:16',
      classic: '4:3', landscape: '3:2', widescreen: '16:9', cinematic: '21:9',
    };
    const ratio = ratioByFormat[p.formatId] ?? '1:1';
    onChange({
      prompt: p.prompt.replace(/\{brand\}/g, brand?.name ?? 'the brand'),
      // A preset sets the SHAPE too — a preset that only filled in words would
      // leave the user to guess the rest. Snap it if the model can't do it.
      aspectRatio: caps.supportedAspectRatios.includes(ratio) ? ratio : caps.supportedAspectRatios[0],
    });
  }, [brand?.name, caps.supportedAspectRatios, onChange]);

  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) void onAttach(f);
  }, [onAttach]);

  const removeRef = useCallback((id: string) => {
    onChange({ references: value.references.filter((r) => r.id !== id) });
  }, [onChange, value.references]);

  const moveRef = useCallback((id: string, dir: -1 | 1) => {
    const list = [...value.references];
    const i = list.findIndex((r) => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    onChange({ references: list });
  }, [onChange, value.references]);

  const toggleContext = useCallback((key: BrandContextKey) => {
    const next = new Set(value.brandContext);
    if (next.has(key)) next.delete(key); else next.add(key);
    onChange({ brandContext: next });
  }, [onChange, value.brandContext]);

  return (
    <section className="is-composer" data-image-composer aria-label="Describe the image to generate">
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile} hidden />

      {/* Prompt */}
      <div className="is-composer-field">
        <textarea
          data-composer-prompt
          value={value.prompt}
          onChange={(e) => onChange({ prompt: e.target.value })}
          onKeyDown={onKeyDown}
          rows={3}
          autoFocus={autoFocus}
          disabled={busy}
          aria-label="Prompt"
          placeholder={brand
            ? `Describe an image for ${brand.name} — "a matte black coffee cup on oak, morning light"`
            : 'Describe the image you want…'}
        />
        <ReferenceStrip
          references={value.references}
          maxReferences={caps.maxReferenceImages}
          onRemove={removeRef}
          onMove={moveRef}
          disabled={busy}
        />
        <div className="is-composer-toolbar">
          <button
            type="button"
            data-composer-attach
            onClick={() => fileRef.current?.click()}
            disabled={busy || uploading || !caps.supportsReferenceImages}
            title={caps.supportsReferenceImages
              ? 'Attach a reference image'
              : 'This model does not accept reference images'}
            className="is-icon-btn"
          >
            <Paperclip size={14} strokeWidth={1.8} aria-hidden />
            {uploading ? 'Uploading…' : 'Reference'}
          </button>
          <span className="is-composer-kbd">⌘/Ctrl + Enter</span>
        </div>
      </div>

      {/* Brand context — chosen deliberately, never implied. */}
      <div className="is-composer-row" data-brand-context>
        <span className="is-row-label">Use from brand</span>
        <div className="is-chiprow">
          {contextOptions.map((opt) => (
            <DsChip
              key={opt.key}
              active={value.brandContext.has(opt.key)}
              disabled={busy || !opt.available || (opt.key !== 'style' && !caps.supportsReferenceImages)}
              onClick={() => toggleContext(opt.key)}
              data-brand-context-chip={opt.key}
              title={
                !opt.available ? opt.unavailableReason
                  : opt.key !== 'style' && !caps.supportsReferenceImages
                    ? 'This model is prompt-only'
                    : opt.detail
              }
            >
              {opt.label}
            </DsChip>
          ))}
        </div>
      </div>

      {/* Shape + count */}
      <div className="is-composer-row">
        <span className="is-row-label">Shape</span>
        <div className="is-chiprow" role="radiogroup" aria-label="Aspect ratio">
          {caps.supportedAspectRatios.map((r) => {
            const Icon = RATIO_ICON[r] ?? Square;
            return (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={value.aspectRatio === r}
                data-composer-ratio={r}
                disabled={busy}
                onClick={() => onChange({ aspectRatio: r })}
                className={`is-ratio ${value.aspectRatio === r ? 'is-ratio--on' : ''}`}
              >
                <Icon size={12} strokeWidth={1.8} aria-hidden />
                {r}
              </button>
            );
          })}
        </div>
      </div>

      {caps.supportsMultipleOutputs ? (
        <div className="is-composer-row">
          <span className="is-row-label">Images</span>
          <div className="is-chiprow" role="radiogroup" aria-label="Number of images">
            {Array.from({ length: caps.maxOutputs }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={value.count === n}
                data-composer-count={n}
                disabled={busy}
                onClick={() => onChange({ count: n })}
                className={`is-count ${value.count === n ? 'is-count--on' : ''}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Presets */}
      <div className="is-composer-row is-composer-row--wrap" data-composer-presets>
        <span className="is-row-label">Start from</span>
        <div className="is-chiprow">
          {PROMPT_PRESETS.map((p) => (
            <DsChip
              key={p.id}
              disabled={busy}
              onClick={() => applyPreset(p)}
              data-composer-preset={p.id}
              title={p.intent}
            >
              {p.title}
            </DsChip>
          ))}
        </div>
      </div>

      {/* Advanced */}
      <div className="is-composer-advanced">
        <button
          type="button"
          className="is-icon-btn"
          aria-expanded={advancedOpen}
          data-composer-advanced
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          <Settings2 size={13} strokeWidth={1.8} aria-hidden />
          {advancedOpen ? 'Hide advanced' : 'Advanced'}
        </button>
        {advancedOpen ? (
          <div className="is-advanced-body">
            <label className="is-field">
              <span>Model</span>
              <select
                data-composer-model
                value={value.model}
                disabled={busy || !capabilities.loaded}
                onChange={(e) => onChange({ model: e.target.value })}
              >
                <option value={AUTO_MODEL_ID}>
                  Auto{capabilities.auto ? ` · ${displayFor(capabilities.auto)?.label ?? capabilities.auto}` : ''}
                </option>
                {models.map((m) => (
                  <option key={m.id} value={m.id} disabled={!m.available}>
                    {m.label}{m.available ? (m.tier === 'free' ? ' — free' : '') : ' — not enabled'}
                  </option>
                ))}
              </select>
            </label>

            {caps.supportedQualities.length > 0 ? (
              <label className="is-field">
                <span>Quality</span>
                <select
                  data-composer-quality
                  value={value.quality ?? 'medium'}
                  disabled={busy}
                  onChange={(e) => onChange({ quality: e.target.value as ComposerValue['quality'] })}
                >
                  {caps.supportedQualities.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </label>
            ) : null}

            {caps.supportsNegativePrompt ? (
              <label className="is-field is-field--wide">
                <span>Avoid</span>
                <input
                  data-composer-negative
                  value={value.negativePrompt}
                  disabled={busy}
                  onChange={(e) => onChange({ negativePrompt: e.target.value })}
                  placeholder="text, watermark, blurry"
                />
              </label>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* One primary action, and it says what it costs. */}
      <div className="is-composer-submit">
        <DsButton
          tone="primary"
          data-composer-submit
          disabled={!ready}
          onClick={submit}
          aria-label={estimate != null ? `Generate for ${estimate} credits` : 'Generate'}
        >
          <Sparkles size={15} strokeWidth={1.8} aria-hidden />
          {busy ? 'Generating…' : `Generate${value.count > 1 ? ` ${value.count} images` : ''}`}
        </DsButton>
        <span className="is-cost" data-composer-cost>
          {estimating
            ? 'Estimating…'
            : estimate == null
              ? ''
              : estimate === 0
                ? 'Free'
                : `${estimate} credits`}
        </span>
        {!canAfford ? (
          <span className="is-cost is-cost--warn" data-composer-insufficient>
            Not enough credits
          </span>
        ) : null}
      </div>
    </section>
  );
}
