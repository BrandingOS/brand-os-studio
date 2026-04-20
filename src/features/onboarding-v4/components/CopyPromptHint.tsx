import { useEffect, useRef, useState } from 'react';
import { AI_TOOL_NAMES, buildAIPrompt } from '../data/typedPrompts';

interface Props {
  brandName: string;
}

export function CopyPromptHint({ brandName }: Props) {
  const [copied, setCopied] = useState(false);
  const [toolIdx, setToolIdx] = useState(0);
  const [swapping, setSwapping] = useState(false);
  const resetTimer = useRef<number | null>(null);
  const rotateTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      if (rotateTimer.current) window.clearInterval(rotateTimer.current);
    };
  }, []);

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

    const startIdx = Math.floor(Math.random() * AI_TOOL_NAMES.length);
    setCopied(true);
    startRotation(startIdx);

    resetTimer.current = window.setTimeout(() => {
      if (rotateTimer.current) window.clearInterval(rotateTimer.current);
      rotateTimer.current = null;
      setCopied(false);
    }, 5200);
  };

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
          <svg
            className="ai-hint-copy"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x={9} y={9} width={11} height={11} rx={2} />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
        </>
      )}
    </button>
  );
}
