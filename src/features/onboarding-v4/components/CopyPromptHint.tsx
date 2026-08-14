import { useEffect, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AI_TOOL_NAMES, buildAIPrompt } from '../data/typedPrompts';
import { useV4Store } from '../store/onboardingV4Store';
import { groupFontAssets } from '../utils/fontFamily';
import { CopyIcon, type OrganicIconHandle } from '@/features/setup/components/organic-icons';

/** Deep links that open a chat with the prompt prefilled, ready to send. */
const OPEN_IN_TOOLS: Array<{
  id: 'chatgpt' | 'claude';
  label: string;
  hint: string;
  buildUrl: (prompt: string) => string;
  icon: JSX.Element;
}> = [
  {
    id: 'chatgpt',
    label: 'Open in ChatGPT',
    hint: 'Prompt prefilled — just hit send',
    buildUrl: (prompt) => `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v3.001l-2.597 1.5-2.607-1.5z" />
      </svg>
    ),
  },
  {
    id: 'claude',
    label: 'Open in Claude',
    hint: 'Prompt prefilled — just hit send',
    buildUrl: (prompt) => `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
        <path d="M12 2.5v4.4M12 17.1v4.4M2.5 12h4.4M17.1 12h4.4M5.3 5.3l3.1 3.1M15.6 15.6l3.1 3.1M18.7 5.3l-3.1 3.1M8.4 15.6l-3.1 3.1" />
      </svg>
    ),
  },
];

const ANCHOR_PHRASE = 'Brand intelligence';
const ROTATING_PHRASES = ['Tell me everything', 'Copy AI prompt', 'Get AI-ready'];

interface Props {
  brandName: string;
  variant?: 'link' | 'badge';
}

/**
 * What the brand demonstrably already has, read at the moment the prompt is
 * built. Evidence the user supplied outranks anything an AI would offer, so the
 * prompt states it as fact instead of asking for suggestions.
 */
function knownAssets() {
  const assets = useV4Store.getState().assets;
  return {
    colors: assets.filter((a) => a.kind === 'color' && a.value).map((a) => (a.value ?? '').toUpperCase()),
    fonts: groupFontAssets(assets.filter((a) => a.kind === 'font')).map((f) => f.family),
    hasLogo: assets.some((a) => a.kind === 'image' && (a.isLogo || a.logoSlot)),
  };
}

export function CopyPromptHint({ brandName, variant = 'link' }: Props) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toolIdx, setToolIdx] = useState(0);
  const [swapping, setSwapping] = useState(false);
  const [typedChars, setTypedChars] = useState<string[]>([]);
  const phraseIdxRef = useRef(0);
  const idleTokenRef = useRef(0);
  const resetTimer = useRef<number | null>(null);
  const rotateTimer = useRef<number | null>(null);
  const copyIconRef = useRef<OrganicIconHandle>(null);
  const copyIconLinkRef = useRef<OrganicIconHandle>(null);
  const copyIconRestoreTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      if (rotateTimer.current) window.clearInterval(rotateTimer.current);
      if (copyIconRestoreTimer.current) window.clearTimeout(copyIconRestoreTimer.current);
    };
  }, []);

  useEffect(() => {
    if (variant !== 'badge') return;
    if (copied) {
      idleTokenRef.current++;
      return;
    }

    let cancelled = false;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const myToken = ++idleTokenRef.current;
    let showAnchor = true;

    async function loop() {
      while (!cancelled && myToken === idleTokenRef.current) {
        const line = showAnchor
          ? ANCHOR_PHRASE
          : ROTATING_PHRASES[phraseIdxRef.current % ROTATING_PHRASES.length];
        setTypedChars([]);
        for (const ch of line) {
          if (cancelled || myToken !== idleTokenRef.current) return;
          setTypedChars((prev) => [...prev, ch]);
          await sleep(45 + Math.random() * 38);
        }
        await sleep(showAnchor ? 1500 : 1900);
        for (;;) {
          if (cancelled || myToken !== idleTokenRef.current) return;
          let stop = false;
          setTypedChars((prev) => {
            if (prev.length === 0) {
              stop = true;
              return prev;
            }
            return prev.slice(0, -1);
          });
          if (stop) break;
          await sleep(18);
        }
        await sleep(280);
        if (!showAnchor) phraseIdxRef.current++;
        showAnchor = !showAnchor;
      }
    }

    loop();
    return () => {
      cancelled = true;
    };
  }, [copied, variant]);

  const startRotation = (startIdx: number) => {
    setToolIdx(startIdx);
    rotateTimer.current = window.setInterval(() => {
      setSwapping(true);
      window.setTimeout(() => {
        setToolIdx((prev) => (prev + 1) % AI_TOOL_NAMES.length);
        setSwapping(false);
      }, 220);
    }, 900);
  };

  const handleCopy = async () => {
    const text = buildAIPrompt(brandName, knownAssets());
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch {
      /* ignore clipboard failures */
    }

    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    if (rotateTimer.current) window.clearInterval(rotateTimer.current);
    if (copyIconRestoreTimer.current) window.clearTimeout(copyIconRestoreTimer.current);

    copyIconRef.current?.startAnimation();
    copyIconLinkRef.current?.startAnimation();
    copyIconRestoreTimer.current = window.setTimeout(() => {
      copyIconRef.current?.stopAnimation();
      copyIconLinkRef.current?.stopAnimation();
    }, 600);

    const startIdx = Math.floor(Math.random() * AI_TOOL_NAMES.length);
    setCopied(true);
    startRotation(startIdx);

    resetTimer.current = window.setTimeout(() => {
      if (rotateTimer.current) window.clearInterval(rotateTimer.current);
      rotateTimer.current = null;
      setCopied(false);
    }, 5200);
  };

  const openInTool = (tool: (typeof OPEN_IN_TOOLS)[number]) => {
    const prompt = buildAIPrompt(brandName, knownAssets());
    window.open(tool.buildUrl(prompt), '_blank', 'noopener,noreferrer');
    setMenuOpen(false);
  };

  if (variant === 'badge') {
    return (
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`ai-badge ai-badge-button${copied ? ' is-copied' : ''}${menuOpen ? ' is-open' : ''}`}
            data-tip="Get the AI prompt"
            aria-label="Get AI prompt"
            aria-expanded={menuOpen}
          >
            <svg className="ai-badge-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2 13.5 8.5 20 10 13.5 11.5 12 18 10.5 11.5 4 10 10.5 8.5z" />
            </svg>
            <span className="ai-badge-text">
              {copied ? (
                <>
                  Copied&nbsp;·&nbsp;
                  <span className={`ai-tool-name${swapping ? ' is-swapping' : ''}`}>{AI_TOOL_NAMES[toolIdx]}</span>
                </>
              ) : (
                <>
                  <span className="ai-badge-typed">
                    {typedChars.map((c, i) => (
                      <span key={`${i}-${c}`}>{c}</span>
                    ))}
                  </span>
                  <span className="ai-badge-caret" aria-hidden="true" />
                </>
              )}
            </span>
            <svg className="ai-badge-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {/* The `d` is morphed via CSS (`.is-open`) — same segment count
                  both ways, so the points glide instead of the icon flipping. */}
              <path d="M6 9.5 12 15.5 18 9.5" />
            </svg>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="ai-prompt-menu" style={{ width: 252, padding: 5 }}>
            <button
              type="button"
              className="ai-prompt-menu-item"
              onClick={() => {
                void handleCopy();
                setMenuOpen(false);
              }}
            >
              <span className="ai-prompt-menu-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                </svg>
              </span>
              <span className="ai-prompt-menu-copy">
                <b>Copy prompt</b>
                <small>Paste it into any AI tool</small>
              </span>
            </button>
            {OPEN_IN_TOOLS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                className="ai-prompt-menu-item"
                onClick={() => openInTool(tool)}
              >
                <span className="ai-prompt-menu-icon">{tool.icon}</span>
                <span className="ai-prompt-menu-copy">
                  <b>
                    {tool.label}
                    <svg className="ai-prompt-menu-ext" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M7 17 17 7M9 7h8v8" />
                    </svg>
                  </b>
                  <small>{tool.hint}</small>
                </span>
              </button>
            ))}
          </PopoverContent>
      </Popover>
    );
  }

  return (
    <button
      type="button"
      className={`ai-hint${copied ? ' is-copied' : ''}`}
      data-tip="Copy a ready prompt for ChatGPT"
      onClick={handleCopy}
    >
      {copied ? (
        <>
          <svg
            className="ai-hint-star"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span>
            <b>Copied</b> — paste it into{' '}
            <span className={`ai-tool-name${swapping ? ' is-swapping' : ''}`}>{AI_TOOL_NAMES[toolIdx]}</span>
          </span>
        </>
      ) : (
        <>
          <svg className="ai-hint-star" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2 13.5 8.5 20 10 13.5 11.5 12 18 10.5 11.5 4 10 10.5 8.5z" />
          </svg>
          <span>
            <b>Tell me everything</b> — copy AI prompt
          </span>
          <CopyIcon ref={copyIconLinkRef} size={12} className="ai-hint-copy" aria-hidden="true" />
        </>
      )}
    </button>
  );
}
