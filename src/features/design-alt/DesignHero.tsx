// DesignHero — centered hero on the brand-scoped Design page.
//
// Two generation modes side-by-side:
//   • Image (default) — flat ChatGPT/Nano-Banana-style image via the
//     ai-generate-image Edge Function (Pollinations under the hood).
//     Result renders inline with download / regenerate / make-editable.
//   • Editable design — seeds a brand-bound social-post doc, navigates
//     to the unified editor at /b/:slug/design/:id?prompt=…, where the
//     AI prompt bar mutates the doc via ai-apply-command (Claude).

import { useCallback, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, Sparkles, Download, RotateCcw, Layers, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Brand } from '@/shared/types/brand';
import type { IDesignStorage } from '@/core/types/services';
import { seedInstagramPostTemplate } from '@/features/brandkit/templateSeeds';
import { generateImage } from '@/features/editor/ai/generateImage';

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

interface ImageResult {
  url: string;
  prompt: string;
}

export function DesignHero({ brand, designStorage }: DesignHeroProps) {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<Mode>('image');
  const [busy, setBusy] = useState(false);
  const [imageResult, setImageResult] = useState<ImageResult | null>(null);

  const runImage = useCallback(async (text: string) => {
    setBusy(true);
    setImageResult(null);
    try {
      const result = await generateImage({ prompt: text, width: 1024, height: 1024 });
      setImageResult({ url: result.imageUrl, prompt: text });
      if (result.mock) {
        toast.message('Image generated in mock mode. Set AI_IMAGE_VENDOR to enable a real vendor.');
      }
    } catch (err) {
      console.error('[DesignHero] image generation failed:', err);
      toast.error('Could not generate image. Please try again.');
    } finally {
      setBusy(false);
    }
  }, []);

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
          Generate a finished image, or build an editable layered design — both
          tuned to your brand.
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

        {busy && mode === 'image' ? (
          <div className="dh-image-loading" role="status" aria-live="polite">
            <span className="dh-image-loading-spinner" aria-hidden />
            <span>Generating image…</span>
          </div>
        ) : null}

        {imageResult ? (
          <figure className="dh-image-result">
            <img
              className="dh-image-result-img"
              src={imageResult.url}
              alt={imageResult.prompt}
              referrerPolicy="no-referrer"
            />
            <figcaption className="dh-image-result-caption">{imageResult.prompt}</figcaption>
            <div className="dh-image-actions">
              <a
                className="dh-image-action"
                href={imageResult.url}
                target="_blank"
                rel="noopener noreferrer"
                download
              >
                <Download size={13} aria-hidden /> Download
              </a>
              <button
                type="button"
                className="dh-image-action"
                onClick={() => void runImage(imageResult.prompt)}
                disabled={busy}
              >
                <RotateCcw size={13} aria-hidden /> Regenerate
              </button>
              <button
                type="button"
                className="dh-image-action"
                onClick={() => void runEditable(imageResult.prompt)}
                disabled={busy}
              >
                <Layers size={13} aria-hidden /> Make editable
              </button>
            </div>
          </figure>
        ) : null}

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
