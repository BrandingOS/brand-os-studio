/**
 * Hand a prompt to the user's own AI tool.
 *
 * A small pill that opens a floating popover with three actions: copy the
 * prompt, or open it prefilled in ChatGPT or Claude. The product AUTHORS the
 * prompt and PARSES the answer; it never calls that tool itself, which is what
 * makes this work with no key, no cost and no vendor lock.
 *
 * The three actions are never rendered permanently beneath the writing
 * surface: stacked, they read as three competing calls to action above the one
 * thing the screen actually wants, and they push the input below the fold on a
 * laptop.
 *
 * It arrived as onboarding's `BuildWithAI`. It is shared now because Setup's
 * Brand Strategy section wants the same thing for the same reason — a
 * different prompt, the identical handoff. The prompt is therefore a PROP:
 * this component knows how to hand one over and nothing about what is in it.
 */
import { useEffect, useRef, useState } from 'react';
import './aiPromptMenu.css';

/** Deep links that open a chat with the prompt prefilled, ready to send. */
export const AI_TOOLS = [
  {
    id: 'chatgpt' as const,
    label: 'Open in ChatGPT',
    hint: 'Prompt prefilled — just hit send',
    buildUrl: (prompt: string) => `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`,
  },
  {
    id: 'claude' as const,
    label: 'Open in Claude',
    hint: 'Prompt prefilled — just hit send',
    buildUrl: (prompt: string) => `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
  },
];

/** Clipboard, with the fallback an insecure context needs. */
async function copy(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
);

const ToolIcon = ({ id }: { id: 'chatgpt' | 'claude' }) =>
  id === 'chatgpt' ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5v9M7.5 12h9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 3.5v3.4M12 17.1v3.4M3.5 12h3.4M17.1 12h3.4M6.2 6.2l2.4 2.4M15.4 15.4l2.4 2.4M17.8 6.2l-2.4 2.4M8.6 15.4l-2.4 2.4" />
    </svg>
  );

export interface AiPromptMenuProps {
  /**
   * Built on demand, not passed as a string — the prompt usually depends on
   * state the caller is still editing, and building it on every keystroke to
   * hand over a value nobody has asked for yet is wasted work.
   */
  prompt: () => string;
  /** The pill's label. */
  label?: string;
  /** What the pill says for four seconds after a copy. */
  copiedLabel?: string;
  className?: string;
}

export function AiPromptMenu({
  prompt,
  label = 'Build with AI',
  copiedLabel = 'Copied',
  className,
}: AiPromptMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(
    () => () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    },
    [],
  );

  const onCopy = async () => {
    await copy(prompt());
    setCopied(true);
    setOpen(false);
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopied(false), 4000);
  };

  return (
    <div className={['aih', className].filter(Boolean).join(' ')} ref={wrap}>
      <button
        type="button"
        className={`aih-btn${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="aih-star">
          <path d="M12 2 13.5 8.5 20 10 13.5 11.5 12 18 10.5 11.5 4 10 10.5 8.5z" />
        </svg>
        {copied ? copiedLabel : label}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" className="aih-chev">
          <path d="M6 9.5 12 15.5 18 9.5" />
        </svg>
      </button>

      <div className={`aih-pop${open ? ' is-open' : ''}`} role="menu" aria-hidden={!open}>
        <button type="button" className="aih-item" role="menuitem" onClick={() => void onCopy()}>
          <span className="aih-ico"><CopyIcon /></span>
          <span className="aih-copy">
            <b>Copy prompt</b>
            <small>Paste it into any AI tool</small>
          </span>
        </button>
        {AI_TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className="aih-item"
            role="menuitem"
            onClick={() => {
              window.open(tool.buildUrl(prompt()), '_blank', 'noopener,noreferrer');
              setOpen(false);
            }}
          >
            <span className="aih-ico"><ToolIcon id={tool.id} /></span>
            <span className="aih-copy">
              <b>
                {tool.label}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="aih-ext">
                  <path d="M7 17 17 7M9 7h8v8" />
                </svg>
              </b>
              <small>{tool.hint}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
