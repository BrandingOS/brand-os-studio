// DesignHero — the Creation Hub's entry point at /b/:slug/design.
//
// Typing a prompt here creates a DESIGN and opens the editor on it. Both modes
// do the same thing and land in the same place; they differ only in what the
// starting document holds — an empty AI canvas, or a layered template. The
// editor's Generate rail then picks the prompt up from the URL.
//
// The hub's job is to get someone started with as little ceremony as possible.
// Nothing is generated on this page, so nothing is lost if the user changes
// their mind on the way.
//
// The quick-format chips deliberately no longer exist: every one of them
// navigated away from the generation flow with no way back.

import { useCallback, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, Sparkles, Layers, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Brand } from '@/shared/types/brand';
import type { IDesignStorage } from '@/core/types/services';
import { seedInstagramPostTemplate } from '@/features/brandkit/templateSeeds';
import { seedAiImageCanvas } from '@/features/editor/shell/v2/panels/generate/aiCanvasSeed';
import { PROMPT_PRESETS } from '@/features/editor/shell/v2/panels/generate/formats';

interface DesignHeroProps {
  brand: Brand;
  designStorage: IDesignStorage;
}

type Mode = 'image' | 'editable';

export function DesignHero({ brand, designStorage }: DesignHeroProps) {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<Mode>('image');
  const [busy, setBusy] = useState(false);

  // Image mode opens the editor on an EMPTY canvas with the prompt staged, so
  // the Generate rail is the first thing the user sees. Same route, same shell
  // and same panel as every other way into generation.
  const startImageDesign = useCallback(async (text: string) => {
    setBusy(true);
    try {
      const doc = seedAiImageCanvas(brand, { prompt: text });
      await designStorage.saveDesign(brand.id, doc.id, doc);
      navigate(`/b/${brand.slug}/design/${doc.id}?prompt=${encodeURIComponent(text)}&mode=image`);
    } catch (err) {
      console.error('[DesignHero] failed to start an image design:', err);
      toast.error('Could not start a new design. Please try again.');
      setBusy(false);
    }
  }, [brand, designStorage, navigate]);

  const startEditableDesign = useCallback(async (text: string) => {
    setBusy(true);
    try {
      const doc = seedInstagramPostTemplate(brand);
      await designStorage.saveDesign(brand.id, doc.id, doc);
      navigate(`/b/${brand.slug}/design/${doc.id}?prompt=${encodeURIComponent(text)}&mode=editable`);
    } catch (err) {
      console.error('[DesignHero] failed to start a design:', err);
      toast.error('Could not start a new design. Please try again.');
      setBusy(false);
    }
  }, [brand, designStorage, navigate]);

  const submit = useCallback(async () => {
    const text = prompt.trim();
    if (!text || busy) return;
    if (mode === 'image') await startImageDesign(text);
    else await startEditableDesign(text);
  }, [prompt, busy, mode, startImageDesign, startEditableDesign]);

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }, [submit]);

  return (
    <section className="dh-hero" aria-labelledby="dh-hero-title">
      <div className="dh-hero-inner">
        <p className="dh-hero-eyebrow">
          <Sparkles size={14} aria-hidden />
          <span>{brand.name} · Design</span>
        </p>
        <h1 id="dh-hero-title" className="dh-hero-title">
          Make something for <span className="dh-hero-title-accent">{brand.name}</span>
        </h1>
        <p className="dh-hero-sub">
          Describe an image and we&rsquo;ll open the design editor with the Generate
          panel ready — choose what the brand contributes, generate, and keep editing.
        </p>

        <form
          className="dh-prompt"
          onSubmit={(e) => { e.preventDefault(); void submit(); }}
          aria-busy={busy}
        >
          <textarea
            id="dh-prompt-input"
            name="prompt"
            className="dh-prompt-input"
            placeholder={mode === 'image'
              ? `Describe an image — "a matte black coffee cup on oak, morning light"`
              : `Describe a layered design to start from…`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onKeyDown}
            rows={3}
            disabled={busy}
            aria-label="Describe what you want to make"
          />
          <div className="dh-prompt-bar">
            <div className="dh-mode-group" role="radiogroup" aria-label="What to make">
              <button
                type="button"
                role="radio"
                aria-checked={mode === 'image'}
                className={`dh-mode-btn ${mode === 'image' ? 'dh-mode-btn--active' : ''}`}
                onClick={() => setMode('image')}
                disabled={busy}
                data-hero-mode="image"
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
                data-hero-mode="editable"
              >
                <Layers size={13} aria-hidden /> Editable design
              </button>
            </div>
            <button
              type="submit"
              className="dh-prompt-send"
              disabled={busy || !prompt.trim()}
              aria-label={mode === 'image' ? 'Generate an image' : 'Start a design'}
              data-hero-submit
            >
              {busy ? <span className="dh-prompt-send-spinner" aria-hidden /> : <ArrowUp size={16} aria-hidden />}
            </button>
          </div>
        </form>

        {mode === 'image' ? (
          <div className="dh-chips" role="list" aria-label="Start from an intent">
            {PROMPT_PRESETS.slice(0, 6).map((p) => (
              <button
                key={p.id}
                type="button"
                role="listitem"
                className="dh-chip"
                disabled={busy}
                data-hero-preset={p.id}
                title={p.intent}
                onClick={() => setPrompt(p.prompt.replace(/\{brand\}/g, brand.name))}
              >
                {p.title}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default DesignHero;
