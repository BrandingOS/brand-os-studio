// GenerateWithAiSection — Phase 4.3 inline AI generation surface
// inside TemplatesPanel.
//
// Two outputs:
//   • "Editable design"  — calls Mode 1 → replace → save → navigate.
//   • "Image only"       — calls ai-generate-image Edge Function →
//     copies the image URL to clipboard for now (full canvas-place
//     flow is a Phase 5+ polish; the surface ships here so users
//     can verify image gen works end-to-end against mock mode).
//
// Defensive lookups so the section gracefully degrades when an
// agent or templates service isn't registered (test mounts).

import { useCallback, useState } from 'react';
import { Sparkles, Image as ImageIcon, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { CONTENT_TYPES } from '@/features/editor/content-types';
import type { AIAgent } from '@/features/editor/ai/types';
import type { Brand } from '@/shared/types/brand';
import type { BrandKit } from '@/features/editor/brand/BrandKit';
import type { IDesignStorage } from '@/core/types/services';
import { generateFromPrompt } from '@/features/templates/generateFromPrompt';
import { generateImage } from '@/features/editor/ai/generateImage';
import { useNavigate } from 'react-router-dom';

interface Props {
  agent: AIAgent | null;
  brand: Brand | null;
  brandKit: BrandKit | null;
  designStorage: IDesignStorage | null;
  /** Optional: prefill prompt from a clicked AI-prompt-preset card. */
  initialPrompt?: string;
  onClose?: () => void;
  /** Phase 5 — when present, after a successful image gen the
   *  user can place it on the active canvas instead of (or in
   *  addition to) clipboard-copy. The handler decides where to
   *  place; this section just hands over the URL + dimensions. */
  onPlaceImage?: (imageUrl: string, dims: { width: number; height: number }) => void;
}

const COMMON_CONTENT_TYPES = [
  'social-post', 'presentation', 'business-card', 'banner',
  'invoice', 'letterhead', 'poster', 'profile-icon',
];

export function GenerateWithAiSection({
  agent, brand, brandKit, designStorage, initialPrompt, onClose, onPlaceImage,
}: Props) {
  const [prompt, setPrompt] = useState(initialPrompt ?? '');
  const [contentTypeId, setContentTypeId] = useState<string>('social-post');
  const [outputKind, setOutputKind] = useState<'editable' | 'image'>('editable');
  const [busy, setBusy] = useState(false);
  // Phase 5 — last AI image result, kept around so the user can
  // "Place on canvas" after the toast clears.
  const [lastImage, setLastImage] = useState<{ url: string; width: number; height: number } | null>(null);
  const navigate = useNavigate();

  const submit = useCallback(async () => {
    const trimmed = prompt.trim();
    if (trimmed.length === 0) {
      toast.error('Type a prompt first.');
      return;
    }
    if (!brand) {
      toast.error('No brand context — open this from inside a brand.');
      return;
    }
    setBusy(true);
    try {
      if (outputKind === 'editable') {
        if (!agent) {
          toast.error('AI agent is not configured. (Mock-mode path expected.)');
          return;
        }
        if (!designStorage) {
          toast.error('Design storage is not available.');
          return;
        }
        const result = await generateFromPrompt({ agent, brand, brandKit, prompt: trimmed, contentTypeId });
        if (!result.ok || !result.doc) {
          toast.error(result.message);
          return;
        }
        const newDesignId = crypto.randomUUID();
        const next = { ...result.doc, id: newDesignId };
        await designStorage.saveDesign(brand.id, newDesignId, next, {
          id: newDesignId,
          name: trimmed.slice(0, 60),
          contentType: next.contentType,
          width: next.pages[0]?.width,
          height: next.pages[0]?.height,
        });
        toast.success(result.message || 'AI generated a new design.');
        navigate(`/b/${brand.slug}/design/${newDesignId}`);
        onClose?.();
      } else {
        const cfg = CONTENT_TYPES[contentTypeId];
        const w = cfg?.defaultDimensions.width ?? 1024;
        const h = cfg?.defaultDimensions.height ?? 1024;
        const ratio = w === h ? '1:1' : w > h ? '16:9' : '4:5';
        const result = await generateImage({
          brandId: brand.id,
          userPrompt: trimmed,
          aspectRatio: ratio,
          count: 1,
        });
        const first = result.images[0];
        toast.success(
          result.chargedCredits > 0
            ? `Image generated · ${result.chargedCredits} credits`
            : 'Image generated.',
        );
        // Keep the result around so the user can "Place on canvas" below.
        setLastImage({ url: first.url, width: first.width ?? w, height: first.height ?? h });
      }
    } catch (err) {
      console.error('[GenerateWithAi] failed:', err);
      toast.error('AI generation failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [agent, brand, brandKit, contentTypeId, designStorage, navigate, onClose, outputKind, prompt]);

  return (
    <div
      data-generate-with-ai
      className="rounded-md border bg-muted/10 p-2 flex flex-col gap-2"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-medium">
        <Wand2 className="h-3 w-3" aria-hidden />
        Generate with AI
      </div>
      <textarea
        data-generate-with-ai-prompt
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={2}
        placeholder="Describe what you want to design…"
        disabled={busy}
        className="w-full text-[11px] rounded-md border bg-background px-1.5 py-1 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
        style={{ borderColor: 'var(--border)' }}
      />
      <div className="flex flex-wrap gap-1">
        <select
          data-generate-with-ai-content-type
          value={contentTypeId}
          onChange={(e) => setContentTypeId(e.target.value)}
          disabled={busy}
          className="text-[10px] rounded-md border bg-background px-1.5 py-0.5"
          style={{ borderColor: 'var(--border)' }}
        >
          {COMMON_CONTENT_TYPES.map((id) => (
            <option key={id} value={id}>{CONTENT_TYPES[id]?.label ?? id}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 text-[10px]">
        <label className="flex items-center gap-1">
          <input
            type="radio"
            data-generate-with-ai-output="editable"
            checked={outputKind === 'editable'}
            onChange={() => setOutputKind('editable')}
            disabled={busy}
          />
          <Sparkles className="h-2.5 w-2.5" aria-hidden /> Editable design
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            data-generate-with-ai-output="image"
            checked={outputKind === 'image'}
            onChange={() => setOutputKind('image')}
            disabled={busy}
          />
          <ImageIcon className="h-2.5 w-2.5" aria-hidden /> Image only
        </label>
      </div>
      <button
        type="button"
        data-generate-with-ai-submit
        onClick={() => void submit()}
        disabled={busy || prompt.trim().length === 0}
        className="rounded-md bg-primary text-primary-foreground text-[11px] px-2 py-1 font-medium disabled:opacity-50 hover:bg-primary/90"
      >
        {busy ? 'Generating…' : 'Generate'}
      </button>

      {/* Phase 5 — Place-on-canvas surface. Shows after a
          successful image gen when the parent provided onPlaceImage
          (i.e. the panel has adapter + activePageId). Empty
          otherwise (back-compat with test mounts). */}
      {lastImage && onPlaceImage ? (
        <button
          type="button"
          data-generate-with-ai-place-image
          onClick={() => {
            onPlaceImage(lastImage.url, { width: lastImage.width, height: lastImage.height });
            setLastImage(null);
          }}
          className="rounded-md border bg-background text-[11px] px-2 py-1 hover:bg-muted/30 flex items-center justify-center gap-1"
          style={{ borderColor: 'var(--border)' }}
        >
          <ImageIcon className="h-3 w-3" aria-hidden /> Place on canvas
        </button>
      ) : null}
    </div>
  );
}
