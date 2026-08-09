import * as React from 'react';
import { useBrandAssistant } from './BrandAssistantProvider';
import { useBrandStore } from '@/shared/store/brandStore';
import { X, Send, Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  "What's my brand voice?",
  'Write 4 tagline ideas',
  'Explain my color palette',
  'How should I describe my audience?',
  'Suggest 3 instagram post angles',
];

export function BrandAssistantDrawer() {
  const { open, setOpen, messages, send, isThinking, reset } = useBrandAssistant();
  const brand = useBrandStore((s) => s.current);
  const [input, setInput] = React.useState('');
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [open, messages, isThinking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input;
    setInput('');
    await send(text);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />
      <aside
        className={cn(
          'fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col border-l border-border bg-card/95 shadow-2xl backdrop-blur-2xl',
          'sm:bottom-4 sm:right-4 sm:top-auto sm:h-[80vh] sm:max-h-[720px] sm:w-[420px] sm:rounded-2xl sm:border',
          'animate-slide-in-right',
        )}
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </span>
            <div className="leading-tight">
              <h3 className="text-sm font-semibold text-foreground">Brand Assistant</h3>
              <p className="text-[11px] text-muted-foreground">
                {brand ? `Grounded in ${brand.name}` : 'No brand selected'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={reset}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                aria-label="Reset conversation"
                title="Reset"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-start justify-end gap-4">
              <div className="rounded-2xl rounded-bl-sm border border-border bg-muted/30 px-4 py-3 text-sm text-foreground">
                Hi — I'm your brand assistant. Ask me anything about{' '}
                <span className="font-semibold">{brand?.name ?? 'your brand'}</span>: voice, taglines, color, audience, strategy.
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground transition hover:border-primary/50 hover:bg-primary/5"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ol className="flex flex-col gap-3">
              {messages.map((msg) => (
                <li
                  key={msg.id}
                  className={cn(
                    'max-w-[88%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed',
                    msg.role === 'user'
                      ? 'self-end rounded-br-sm bg-primary text-primary-foreground'
                      : 'self-start rounded-bl-sm border border-border bg-muted/30 text-foreground',
                  )}
                >
                  {renderMarkdownLite(msg.content)}
                </li>
              ))}
              {isThinking && (
                <li className="self-start max-w-[88%] rounded-2xl rounded-bl-sm border border-border bg-muted/30 px-4 py-2.5 text-sm text-muted-foreground">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/60" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/60 [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/60 [animation-delay:240ms]" />
                  </span>
                </li>
              )}
            </ol>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-border bg-background/50 p-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the assistant…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground transition disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">
            Claude · via secure server proxy · ⌘J to toggle
          </p>
        </form>
      </aside>
    </>
  );
}

/** Tiny markdown helper — bold + line breaks. Avoids a real markdown dep. */
function renderMarkdownLite(content: string): React.ReactNode {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return <span key={i}>{p}</span>;
  });
}
