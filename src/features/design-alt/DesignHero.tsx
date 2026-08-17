// DesignHero — the Creation Hub's entry point at /b/:slug/design.
//
// Typing a prompt here creates a PROJECT and opens it. The hub's job is to get
// someone started with as little ceremony as possible; the project workspace is
// where the composer, the settings and the history live. Nothing is generated
// on this page, so nothing is lost if the user changes their mind on the way.
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
import { createImageProject } from '@/features/image-generation';
import { PROMPT_PRESETS } from '@/features/editor/shell/v2/panels/generate/formats';

interface DesignHeroProps {
  brand: Brand;
  designStorage: IDesignStorage;
}

type Mode = 'image' | 'editable';

/** Seed and local demo brands have no workspace, so they cannot own a project. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function DesignHero({ brand, designStorage }: DesignHeroProps) {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<Mode>('image');
  const [busy, setBusy] = useState(false);

  const startImageProject = useCallback(async (text: string) => {
    if (!UUID_RE.test(brand.id)) {
      toast.error('This is a local demo brand. Create or open a saved brand to generate images.');
      return;
    }
    setBusy(true);
    try {
      const project = await createImageProject({
        brandId: brand.id,
        title: text.slice(0, 60),
      });
      navigate(`/b/${brand.slug}/design/${project.id}?prompt=${encodeURIComponent(text)}`);
    } catch (err) {
      console.error('[DesignHero] could not create a project:', err);
      toast.error('Could not start a project. Please try again.');
      setBusy(false);
    }
  }, [brand.id, brand.slug, navigate]);

  const startEditableDesign = useCallback(async (text: string) => {
    setBusy(true);
    try {
      const doc = seedInstagramPostTemplate(brand);
      await designStorage.saveDesign(brand.id, doc.id, doc);
      navigate(`/b/${brand.slug}/design/${doc.id}?prompt=${encodeURIComponent(text)}`);
    } catch (err) {
      console.error('[DesignHero] failed to start a design:', err);
      toast.error('Could not start a new design. Please try again.');
      setBusy(false);
    }
  }, [brand, designStorage, navigate]);

  const submit = useCallback(async () => {
    const text = prompt.trim();
    if (!text || busy) return;
    if (mode === 'image') await startImageProject(text);
    else await startEditableDesign(text);
  }, [prompt, busy, mode, startImageProject, startEditableDesign]);

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
          Describe an image and we&rsquo;ll open a project where you can choose what the
          brand contributes, generate, and iterate.
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
              aria-label={mode === 'image' ? 'Start an image project' : 'Start a design'}
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
