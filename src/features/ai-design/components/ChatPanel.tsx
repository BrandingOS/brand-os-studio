/**
 * Left-rail chat/agent panel used in the split workspace layout.
 */
import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import type { ChatMessage, SkillId } from '../types';
import { SKILLS } from './SkillPills';
import { Button } from '@/components/ui/button';
import { ArrowUp, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  messages: ChatMessage[];
  isThinking: boolean;
  activeSkill: SkillId | null;
  onSkillChange: (id: SkillId | null) => void;
  onSend: (text: string) => void;
  suggestions?: string[];
  /** When true, skip the internal header row (caller provides its own). */
  hideHeader?: boolean;
}

export function ChatPanel({ messages, isThinking, activeSkill, onSkillChange, onSend, suggestions, hideHeader }: Props) {
  const [value, setValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, isThinking]);

  const submit = (text?: string) => {
    const v = (text ?? value).trim();
    if (!v) return;
    onSend(v);
    if (!text) setValue('');
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <aside className="flex flex-col h-full bg-background">
      {!hideHeader && (
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">AI Design Agent</span>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !isThinking && (
          <div className="text-center text-muted-foreground text-sm pt-6">
            <p className="mb-3 font-medium">Try these Skills</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {SKILLS.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => submit(`Create a ${s.label.toLowerCase()} concept`)}
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-muted/60"
                  >
                    <Icon className={cn('h-3.5 w-3.5', s.accent)} />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              'rounded-xl px-3 py-2 text-sm leading-relaxed',
              m.role === 'user'
                ? 'bg-primary text-primary-foreground ml-6'
                : 'bg-muted/60 mr-6',
            )}
          >
            {m.content}
          </div>
        ))}

        {isThinking && (
          <div className="bg-muted/60 mr-6 rounded-xl px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Designing…
          </div>
        )}

        {!isThinking && suggestions && suggestions.length > 0 && (
          <div className="mr-6 flex flex-wrap gap-1.5">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => submit(s)}
                className="text-xs rounded-full border px-2.5 py-1 hover:bg-muted/60"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t p-3 space-y-2">
        <div className="flex flex-wrap gap-1">
          {SKILLS.slice(0, 4).map((s) => {
            const Icon = s.icon;
            const isActive = activeSkill === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onSkillChange(isActive ? null : s.id)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]',
                  isActive ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted/60',
                )}
              >
                <Icon className={cn('h-3 w-3', isActive ? 'text-primary' : s.accent)} />
                {s.label}
              </button>
            );
          })}
        </div>
        <div className="rounded-xl border bg-background focus-within:ring-1 focus-within:ring-primary/40">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
            placeholder="Start with an idea, or refine the design…"
            className="w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-sm outline-none placeholder:text-muted-foreground min-h-[56px]"
            rows={2}
          />
          <div className="flex items-center justify-end px-2 pb-2">
            <Button
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => submit()}
              disabled={!value.trim() || isThinking}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
