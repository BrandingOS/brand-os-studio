import { useEffect, useRef, useState } from 'react';
import { AI_TOOL_NAMES, buildAIPrompt } from '../data/typedPrompts';
import { CopyIcon, type OrganicIconHandle } from '@/features/setup/components/organic-icons';

const ANCHOR_PHRASE = 'Brand intelligence';
const ROTATING_PHRASES = ['Tell me everything', 'Copy AI prompt', 'Get AI-ready'];

interface Props {
  brandName: string;
  variant?: 'link' | 'badge';
}

export function CopyPromptHint({ brandName, variant = 'link' }: Props) {
  const [copied, setCopied] = useState(false);
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
    const text = buildAIPrompt(brandName);
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

  if (variant === 'badge') {
    return (
      <button
        type="button"
        className={`ai-badge ai-badge-button${copied ? ' is-copied' : ''}`}
        data-tip="Copy a ready prompt"
        onClick={handleCopy}
        aria-label="Copy AI prompt"
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
        <CopyIcon ref={copyIconRef} size={11} className="ai-badge-copy" aria-hidden="true" />
      </button>
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
