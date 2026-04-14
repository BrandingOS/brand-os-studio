/**
 * Phase 1 entry — Lovart-style hero: centered brand logo + title + prompt
 * input + skill pills. Submitting transitions to the split workspace.
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

export function EntryScreen({ brand, activeSkill, onSkillChange, onSubmit }: Props) {
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
    <div className="flex-1 flex items-center justify-center px-6 py-16 overflow-auto">
      <div className="w-full max-w-2xl flex flex-col items-center gap-8">
        {/* Hero headline */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="inline-flex items-center gap-3 text-3xl sm:text-4xl font-semibold tracking-tight">
            <span>Design is easier with</span>
            <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 shadow-sm">
              {logo ? (
                <img
                  src={logo}
                  alt={name}
                  className="h-7 w-7 rounded-full object-contain"
                />
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
          <p className="text-muted-foreground">
            The AI design agent that knows your brand and gets the job done.
          </p>
        </div>

        {/* Prompt input */}
        <div className="w-full rounded-2xl border bg-background shadow-sm focus-within:shadow-md focus-within:ring-1 focus-within:ring-primary/40 transition">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
            placeholder={`Ask the agent to make a high-converting ad for ${name}…`}
            className="w-full resize-none bg-transparent px-5 pt-4 pb-2 text-[15px] outline-none placeholder:text-muted-foreground min-h-[88px]"
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

        {/* Skill pills */}
        <SkillPills active={activeSkill} onSelect={onSkillChange} />
      </div>
    </div>
  );
}
