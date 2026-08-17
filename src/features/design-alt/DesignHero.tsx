// DesignHero — centered hero on the brand-scoped Design page.
//
// Two generation modes side-by-side. BOTH paths navigate to a brand-
// new design page when the user submits — the hero never renders the
// result inline. The user always lands inside the editor.
//
//   • Image (default) — AI Studio hand-off. The hero does NOT generate
//     here: it seeds an EMPTY 1080² doc tagged `metadata.ai.origin =
//     'ai-image'`, saves it, and navigates to
//     /b/:slug/design/:newId?prompt=…&mode=image&model=…&format=… — the
//     editor opens on the Generate panel and runs the brand-aware
//     compile → review → generate flow on the canvas (Lovart-style: the
//     busy state lives where the result lands, the hero never blocks).
//   • Editable design — seeds a brand-bound social-post template
//     (text/shape/logo slot-refs) and navigates to the editor with
//     the prompt staged on the AI prompt bar so Claude can mutate the
//     doc on submit.

import { useCallback, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, Sparkles, Layers, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Brand } from '@/shared/types/brand';
import type { IDesignStorage } from '@/core/types/services';
import type { BrandOSDocument } from '@/features/editor/schema';
import { seedInstagramPostTemplate } from '@/features/brandkit/templateSeeds';
import { withAiMetadata } from '@/features/editor/shell/v2/panels/generate/aiMetadata';
import { FORMAT_PRESETS } from '@/features/editor/shell/v2/panels/generate/formats';
import { AUTO_MODEL_ID, IMAGE_MODEL_INFOS } from '@/features/editor/ai/imageModels';

interface DesignHeroProps {
  brand: Brand;
  designStorage: IDesignStorage;
}

interface FormatChip {
  id: string;
  label: string;
  href: (slug: string) => string;
}

const FORMAT_CHIPS: FormatChip[] = [
  { id: 'social-post', label: 'Social post',
    href: (s) => `/b/${s}/social-media?platform=instagram&format=post` },
  { id: 'social-story', label: 'Story',
    href: (s) => `/b/${s}/social-media?platform=instagram&format=story` },
  { id: 'presentation', label: 'Presentation',
    href: (s) => `/b/${s}/presentations` },
  { id: 'brand-board', label: 'Brand board',
    href: (s) => `/b/${s}/brand-board` },
  { id: 'bento', label: 'Bento grid',
    href: (s) => `/b/${s}/bento` },
  { id: 'guideline', label: 'Guidelines doc',
    href: (s) => `/b/${s}/guidelines/canvas` },
];

type Mode = 'image' | 'editable';


function buildAiStudioDoc(brand: Brand, docId: string, pendingPrompt: string, w: number, h: number): BrandOSDocument {
  const doc: BrandOSDocument = {
    schemaVersion: 1,
    id: docId,
    contentType: 'social-post',
    brandId: brand.id,
    masterPages: [],
    pages: [
      {
        id: crypto.randomUUID(),
        name: 'Page 1',
        width: w,
        height: h,
        background: '#ffffff',
        masterPageId: null,
        layers: [],
      },
    ],
    metadata: {},
  };
  return withAiMetadata(doc, { origin: 'ai-image', pendingPrompt });
}

const HERO_MODELS = [
  { id: AUTO_MODEL_ID, label: 'Auto' },
  ...IMAGE_MODEL_INFOS.filter((m) => m.listed).map((m) => ({ id: m.id, label: m.label })),
];
const HERO_FORMATS = FORMAT_PRESETS.filter((f) => f.id !== 'auto');

export function DesignHero({ brand, designStorage }: DesignHeroProps) {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<Mode>('image');
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState<string>(AUTO_MODEL_ID);
  const [formatId, setFormatId] = useState<string>('square');

  const runImage = useCallback(async (text: string) => {
    setBusy(true);
    try {
      const format = HERO_FORMATS.find((f) => f.id === formatId) ?? HERO_FORMATS[0];
      const newDocId = crypto.randomUUID();
      const doc = buildAiStudioDoc(brand, newDocId, text, format.width, format.height);
      await designStorage.saveDesign(brand.id, newDocId, doc, {
        id: newDocId,
        name: text.slice(0, 60) || 'AI image',
        contentType: 'social-post',
        width: format.width,
        height: format.height,
      });
      const q = new URLSearchParams({ prompt: text, mode: 'image', model, format: format.id }).toString();
      navigate(`/b/${brand.slug}/design/${newDocId}?${q}`);
    } catch (err) {
      console.error('[DesignHero] failed to open AI studio:', err);
      toast.error('Could not start a new design. Please try again.');
      setBusy(false);
    }
  }, [brand, designStorage, navigate, model, formatId]);

  const runEditable = useCallback(async (text: string) => {
    setBusy(true);
    try {
      const doc = seedInstagramPostTemplate(brand);
      await designStorage.saveDesign(brand.id, doc.id, doc);
      const q = new URLSearchParams({ prompt: text }).toString();
      navigate(`/b/${brand.slug}/design/${doc.id}?${q}`);
    } catch (err) {
      console.error('[DesignHero] failed to start design:', err);
      toast.error('Could not start a new design. Please try again.');
      setBusy(false);
    }
  }, [brand, designStorage, navigate]);

  const submit = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed || busy) return;
    if (mode === 'image') {
      await runImage(trimmed);
    } else {
      await runEditable(trimmed);
    }
  }, [prompt, busy, mode, runImage, runEditable]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void submit();
      }
    },
    [submit],
  );

  return (
    <section className="dh-hero" aria-labelledby="dh-hero-title">
      <div className="dh-hero-inner">
        <p className="dh-hero-eyebrow">
          <Sparkles size={14} aria-hidden />
          <span>{brand.name} · Design</span>
        </p>
        <h1 id="dh-hero-title" className="dh-hero-title">
          Design with {brand.name}'s <span className="dh-hero-title-accent">AI</span>
        </h1>
        <p className="dh-hero-sub">
          Generate an on-brand image with the model you choose, or build an
          editable layered design — then keep working on the canvas.
        </p>

        <form
          className="dh-prompt"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          aria-busy={busy}
        >
          <textarea
            id="dh-prompt-input"
            name="prompt"
            className="dh-prompt-input"
            placeholder={
              mode === 'image'
                ? `Describe an image to generate — e.g. "neon ${brand.name} logo on a foggy street"…`
                : `Ask ${brand.name} AI to craft scroll-stopping visuals…`
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onKeyDown}
            rows={3}
            disabled={busy}
            aria-label="Describe the design you want"
          />
          <div className="dh-prompt-bar">
            <div className="dh-mode-group" role="radiogroup" aria-label="Generation mode">
              <button
                type="button"
                role="radio"
                aria-checked={mode === 'image'}
                className={`dh-mode-btn ${mode === 'image' ? 'dh-mode-btn--active' : ''}`}
                onClick={() => setMode('image')}
                disabled={busy}
              >
                <ImageIcon size={13} aria-hidden /> Image
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={mode === 'editable'}
                className={`dh-mode-btn ${mode === 'editable' ? 'dh-mode-btn--active' : ''}`}
                onClick={() => setMode('editable')}
                disabled={busy}
              >
                <Layers size={13} aria-hidden /> Editable design
              </button>
            </div>
            {mode === 'image' ? (
              <div className="dh-prompt-opts">
                <label className="dh-opt">
                  <span className="dh-opt-label">Model</span>
                  <select
                    className="dh-opt-select"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    disabled={busy}
                    aria-label="Image model"
                    data-hero-model
                  >
                    {HERO_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </label>
                <label className="dh-opt">
                  <span className="dh-opt-label">Format</span>
                  <select
                    className="dh-opt-select"
                    value={formatId}
                    onChange={(e) => setFormatId(e.target.value)}
                    disabled={busy}
                    aria-label="Image format"
                    data-hero-format
                  >
                    {HERO_FORMATS.map((f) => (
                      <option key={f.id} value={f.id}>{f.ratio} {f.name}</option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
            <button
              type="submit"
              className="dh-prompt-send"
              disabled={busy || !prompt.trim()}
              aria-label="Send prompt"
            >
              {busy ? (
                <span className="dh-prompt-send-spinner" aria-hidden />
              ) : (
                <ArrowUp size={16} aria-hidden />
              )}
            </button>
          </div>
        </form>

        <div className="dh-chips" role="list" aria-label="Quick formats">
          {FORMAT_CHIPS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="listitem"
              className="dh-chip"
              onClick={() => navigate(c.href(brand.slug))}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default DesignHero;
