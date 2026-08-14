/**
 * The Build-with-AI helper.
 *
 * The retired flow's interaction, kept exactly: a small button beside the
 * "Describe your brand" label that opens a **floating popover** on click, with
 * three actions. They are never rendered permanently beneath the writing
 * surface — stacked, they read as three competing calls to action above the
 * one thing the screen actually wants (the description), and they push the
 * textarea below the fold on a laptop.
 *
 * "Open in…" hands the prompt to the user's own AI tool. The product supplies
 * the prompt and parses the answer; it does not call that tool.
 */
import { useEffect, useRef, useState } from 'react';
import { AI_TOOLS, buildBriefPrompt } from './prompt';

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

export function BuildWithAI({ brandName }: { brandName: string }) {
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

  const prompt = () => buildBriefPrompt(brandName);

  const onCopy = async () => {
    await copy(prompt());
    setCopied(true);
    setOpen(false);
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopied(false), 4000);
  };

  return (
    <div className="onb-ai" ref={wrap}>
      <button
        type="button"
        className={`onb-ai-btn${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="onb-ai-star">
          <path d="M12 2 13.5 8.5 20 10 13.5 11.5 12 18 10.5 11.5 4 10 10.5 8.5z" />
        </svg>
        {copied ? 'Copied' : 'Build with AI'}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" className="onb-ai-chev">
          <path d="M6 9.5 12 15.5 18 9.5" />
        </svg>
      </button>

      <div className={`onb-ai-pop${open ? ' is-open' : ''}`} role="menu" aria-hidden={!open}>
        <button type="button" className="onb-ai-item" role="menuitem" onClick={() => void onCopy()}>
          <span className="onb-ai-ico"><CopyIcon /></span>
          <span className="onb-ai-copy">
            <b>Copy prompt</b>
            <small>Paste it into any AI tool</small>
          </span>
        </button>
        {AI_TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className="onb-ai-item"
            role="menuitem"
            onClick={() => {
              window.open(tool.buildUrl(prompt()), '_blank', 'noopener,noreferrer');
              setOpen(false);
            }}
          >
            <span className="onb-ai-ico"><ToolIcon id={tool.id} /></span>
            <span className="onb-ai-copy">
              <b>
                {tool.label}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="onb-ai-ext">
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
