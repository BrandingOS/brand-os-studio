// DesignHero — centered hero on the brand-scoped Design page.
//
// Brand-aware title + subtitle + a prompt textarea + format chips.
// Submitting the prompt seeds a brand-bound social-post document,
// persists via IDesignStorage, and navigates to the unified editor
// at /b/:slug/design/:newId?prompt=<typed-text>. The editor reads
// the prompt query param on mount and stages it in the AI prompt bar
// so the user can hit Send without retyping.
//
// Format chips (Social post, Story, Presentation, Brand board, Bento,
// Print poster, Guidelines doc) skip the prompt and go straight to the
// matching surface. They're the "I know what I want" affordance.

import { useCallback, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { Brand } from '@/shared/types/brand';
import type { IDesignStorage } from '@/core/types/services';
import { seedInstagramPostTemplate } from '@/features/brandkit/templateSeeds';

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

export function DesignHero({ brand, designStorage }: DesignHeroProps) {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const doc = seedInstagramPostTemplate(brand);
      await designStorage.saveDesign(brand.id, doc.id, doc);
      const q = new URLSearchParams({ prompt: trimmed }).toString();
      navigate(`/b/${brand.slug}/design/${doc.id}?${q}`);
    } catch (err) {
      console.error('[DesignHero] failed to start design:', err);
      toast.error('Could not start a new design. Please try again.');
      setBusy(false);
    }
  }, [prompt, busy, brand, designStorage, navigate]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Cmd/Ctrl+Enter or plain Enter (without shift) submits.
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
          The agent that knows your brand and gets the job done.
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
            placeholder={`Ask ${brand.name} AI to craft scroll-stopping visuals…`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onKeyDown}
            rows={3}
            disabled={busy}
            aria-label="Describe the design you want"
          />
          <div className="dh-prompt-bar">
            <span className="dh-prompt-hint">
              Press <kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> for newline
            </span>
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
