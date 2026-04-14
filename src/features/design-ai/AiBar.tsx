/**
 * Floating AI prompt bar — the "design with AI" surface.
 *
 * Pinned bottom-center. Types a natural-language prompt, hits enter → calls
 * the existing ai-design agent, adds the returned nodes to the canvas. Skill
 * pills pre-bias the agent toward a specific output type.
 */
import { useState } from 'react';
import { Sparkles, Loader2, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDesignAiStore } from './store';
import type { SkillId } from '@/features/ai-design/types';

const SKILLS: { id: SkillId; label: string }[] = [
  { id: 'social-post', label: 'Social post' },
  { id: 'ad-creative', label: 'Ad creative' },
  { id: 'branding', label: 'Branding' },
  { id: 'illustration', label: 'Illustration' },
];

const EXAMPLES = [
  'A minimalist social post announcing our spring launch',
  'A bold hero banner with the brand tagline',
  'A 3-color swatch row for our palette',
];

interface Props {
  onSubmit: (text: string, skill: SkillId | null) => Promise<void>;
}

export function AiBar({ onSubmit }: Props) {
  const [text, setText] = useState('');
  const [skill, setSkill] = useState<SkillId | null>(null);
  const isGenerating = useDesignAiStore((s) => s.isGenerating);

  const submit = async () => {
    const value = text.trim();
    if (!value || isGenerating) return;
    setText('');
    await onSubmit(value, skill);
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[min(720px,calc(100%-2rem))]">
      <div className="rounded-2xl border border-border bg-white shadow-[0_20px_48px_-12px_rgba(0,0,0,0.18)] p-2">
        <div className="flex items-center gap-1 px-2 pt-1 pb-2 overflow-x-auto">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          {SKILLS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSkill(skill === s.id ? null : s.id)}
              className={cn(
                'text-[11px] px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap',
                skill === s.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-2 px-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Describe what you want to design…"
            className="flex-1 resize-none bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground/70 focus:outline-none max-h-32"
          />
          <button
            onClick={submit}
            disabled={!text.trim() || isGenerating}
            className={cn(
              'h-9 w-9 rounded-xl flex items-center justify-center transition-colors shrink-0',
              text.trim() && !isGenerating
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
            title="Generate (↵)"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {!text && !isGenerating && (
        <div className="flex flex-wrap gap-1.5 mt-2 justify-center">
          {EXAMPLES.map((e) => (
            <button
              key={e}
              onClick={() => setText(e)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white/80 border border-border text-muted-foreground hover:text-foreground hover:bg-white transition-colors"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
