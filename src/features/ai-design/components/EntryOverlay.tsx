/**
 * EntryOverlay — Lovart-home style welcome panel floating over the canvas.
 *
 * Unlike the earlier `EntryScreen`, this does NOT replace the canvas — the
 * canvas stays mounted behind it so the workspace geometry never shifts
 * when the user submits their first prompt. The overlay just fades out.
 */
import { useState, KeyboardEvent } from 'react';
import type { Brand } from '@/shared/types/brand';
import type { SkillId } from '../types';
import { SkillPills } from './SkillPills';
import { Button } from '@/components/ui/button';
import { ArrowUp, Lightbulb, Sparkles, BookOpen, Plus } from 'lucide-react';

interface Props {
  brand: Brand | null | undefined;
  activeSkill: SkillId | null;
  onSkillChange: (id: SkillId | null) => void;
  onSubmit: (text: string) => void;
}

export function EntryOverlay({ brand, activeSkill, onSkillChange, onSubmit }: Props) {
  const [value, setValue] = useState('');
  const logo = brand?.logoAssets?.icon ?? brand?.logoAssets?.full ?? brand?.logo;
  const name = brand?.name ?? 'your brand';

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onSubmit(v);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center px-6 bg-white overflow-y-auto">
      <div className="relative w-full max-w-2xl flex flex-col items-center gap-7 py-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-3 text-3xl sm:text-4xl font-semibold tracking-tight">
            <span>Design is easier with</span>
            <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 shadow-sm">
              {logo ? (
                <img src={logo} alt={name} className="h-7 w-7 rounded-full object-contain" />
              ) : (
                <span
                  className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: brand?.primaryColor ?? '#111' }}
                >
                  {name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="text-xl font-semibold">{name}</span>
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            The AI design agent that knows your brand and gets the job done.
          </p>
        </div>

        <div className="w-full rounded-2xl border bg-background shadow-lg focus-within:ring-2 focus-within:ring-primary/30 transition">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
            placeholder={`Ask the agent to make a high-converting ad for ${name}…`}
            className="w-full resize-none bg-transparent px-5 pt-4 pb-2 text-[15px] outline-none placeholder:text-muted-foreground min-h-[84px]"
            rows={3}
            autoFocus
          />
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="Attach">
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="Open library">
                <BookOpen className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="Ideas">
                <Lightbulb className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="Brand-aware">
                <Sparkles className="h-4 w-4" />
              </Button>
              <Button
                onClick={submit}
                disabled={!value.trim()}
                size="icon"
                className="h-8 w-8 rounded-full"
                title="Send"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <SkillPills active={activeSkill} onSelect={onSkillChange} />

        {/* Recent Projects row — stub placeholders for now */}
        <div className="w-full mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Recent Projects</h3>
            <button className="text-xs text-muted-foreground hover:text-foreground">See All ›</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => onSubmit('Start a new blank project')}
              className="aspect-square rounded-xl border-2 border-dashed hover:border-primary/60 hover:bg-muted/40 flex items-center justify-center transition"
              title="New project"
            >
              <Plus className="h-5 w-5 text-muted-foreground" />
            </button>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="aspect-square rounded-xl bg-muted/50 border flex items-end p-2"
              >
                <span className="text-[10px] text-muted-foreground">Untitled</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
