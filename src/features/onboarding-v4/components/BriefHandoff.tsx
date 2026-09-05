/**
 * Step 2's "Describe your brand" field, rebuilt so the RECOMMENDED path is the
 * visible one.
 *
 * The old layout was a 140px empty textarea with a typing placeholder and a
 * small animated pill beside its label. Size is the instruction: the box was
 * the call to action, and the pill — whose copy had no verb — read as
 * decoration. People typed two sentences by hand when a minute in ChatGPT
 * would have answered all twelve fields.
 *
 * Now the three steps are on screen and stateful: get the prompt, run it,
 * paste the reply. The paste box is the LAST step, not the first thing you
 * see. Writing it yourself survives as a demoted disclosure that swaps in the
 * same textarea, bound to the same store field — nothing downstream changes,
 * because `parseBrief` already tells a labelled reply from prose.
 */
import { useEffect, useRef, useState } from 'react';
import { AI_TOOLS } from '@/shared/ai-handoff/AiPromptMenu';
import { countBriefSections, looksLikeBrief, looksLikeBriefPrompt } from '@/features/onboarding/brief/parseBrief';
import { AI_TOOL_NAMES, buildAIPrompt } from '../data/typedPrompts';
import { useV4Store } from '../store/onboardingV4Store';
import { groupFontAssets } from '../utils/fontFamily';
import { AITextarea } from './AITextarea';
import '../styles/briefHandoff.css';

interface Props {
  brandName: string;
  value: string;
  onChange(value: string): void;
  /** Fires when the user switches between pasting an AI reply and writing it themselves. */
  onAuthorship?(authorship: 'pasted' | 'written'): void;
  autoFocus?: boolean;
}

/** What the brand demonstrably already has at the moment the prompt is built. */
function knownAssets() {
  const assets = useV4Store.getState().assets;
  return {
    colors: assets.filter((a) => a.kind === 'color' && a.value).map((a) => (a.value ?? '').toUpperCase()),
    fonts: groupFontAssets(assets.filter((a) => a.kind === 'font')).map((f) => f.family),
    hasLogo: assets.some((a) => a.kind === 'image' && (a.isLogo || a.logoSlot)),
  };
}

export type PasteVerdict =
  | { kind: 'empty' }
  | { kind: 'prompt' }
  | { kind: 'brief'; sections: number }
  | { kind: 'prose' };

/** Pure, so the three outcomes are unit-testable without the DOM. */
export function judgePaste(text: string): PasteVerdict {
  if (!text.trim()) return { kind: 'empty' };
  if (looksLikeBriefPrompt(text)) return { kind: 'prompt' };
  if (looksLikeBrief(text)) return { kind: 'brief', sections: countBriefSections(text) };
  return { kind: 'prose' };
}

async function copyText(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    /* fall through */
  }
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

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export function BriefHandoff({ brandName, value, onChange, onAuthorship, autoFocus }: Props) {
  const [mode, setModeState] = useState<'ai' | 'manual'>('ai');
  const setMode = (next: 'ai' | 'manual') => {
    setModeState(next);
    onAuthorship?.(next === 'manual' ? 'written' : 'pasted');
  };
  /** Set once the prompt has left the app — step ① done, step ② waiting. */
  const [sent, setSent] = useState<null | 'copied' | 'chatgpt' | 'claude'>(null);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const pasteRef = useRef<HTMLTextAreaElement>(null);
  const copiedTimer = useRef<number | null>(null);

  const verdict = judgePaste(value);
  const promptText = buildAIPrompt(brandName, knownAssets());
  const prompt = () => promptText;
  // The prompt opens with blank lines; a preview of "the first four lines" was
  // one sentence. Show the first few lines that SAY something.
  const previewText = promptText.split('\n').filter((l) => l.trim()).slice(0, 3).join('\n');
  const name = brandName.trim();
  /** The prompt text with the brand's name in bold — it is the one word in it that is the user's. */
  const emphasised = (text: string) => {
    if (!name) return text;
    const parts = text.split(name);
    return parts.flatMap((part, i) => (i === 0 ? [part] : [<b key={i}>{name}</b>, part]));
  };

  // The user comes BACK to this tab holding the reply: put the caret in the box.
  useEffect(() => {
    if (!sent || verdict.kind !== 'empty') return;
    const onFocus = () => pasteRef.current?.focus();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [sent, verdict.kind]);

  useEffect(() => () => { if (copiedTimer.current) window.clearTimeout(copiedTimer.current); }, []);

  const handleCopy = async () => {
    await copyText(prompt());
    setSent('copied');
    setCopied(true);
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(false), 6000);
  };

  const openIn = (tool: (typeof AI_TOOLS)[number]) => {
    window.open(tool.buildUrl(prompt()), '_blank', 'noopener,noreferrer');
    setSent(tool.id);
  };

  if (mode === 'manual') {
    return (
      <div className="bh" data-brief-mode="manual">
        <div className="bh-manual-head">
          <label htmlFor="description">Describe your brand</label>
          <button type="button" className="bh-link" data-brief-switch="ai" onClick={() => setMode('ai')}>
            Let AI write it instead ›
          </button>
        </div>
        <AITextarea autoFocus value={value} onChange={onChange} />
      </div>
    );
  }

  const step1Done = sent !== null;
  const step3Done = verdict.kind === 'brief' || verdict.kind === 'prose';
  const active: 1 | 2 | 3 = step3Done ? 3 : step1Done ? 2 : 1;

  return (
    <div className="bh" data-brief-mode="ai" data-brief-step={active}>
      <div className="bh-card">
        <div className="bh-head">
          <span className="bh-spark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 13.5 8.5 20 10 13.5 11.5 12 18 10.5 11.5 4 10 10.5 8.5z" /></svg>
          </span>
          <div>
            <div className="bh-title">Let your AI describe your brand</div>
            <div className="bh-sub">We wrote the prompt. Copy it, send it, paste the answer back — about a minute.</div>
          </div>
        </div>

        <ol className="bh-steps">
          <li className="bh-step" data-step="1" data-state={step1Done ? 'done' : 'active'}>
            <span className="bh-num">{step1Done ? <Check /> : '1'}</span>
            <div className="bh-body">
              <div className="bh-label">Copy this prompt</div>
              <div className={`bh-prompt${expanded ? ' is-expanded' : ''}${copied ? ' is-copied' : ''}`} data-brief-prompt>
                <div className="bh-prompt-bar">
                  <span className="bh-prompt-tag">Prompt · ready to send</span>
                  <button type="button" className="bh-link" data-brief-expand onClick={() => setExpanded((v) => !v)}>
                    {expanded ? 'Show less' : 'Show full prompt'}
                  </button>
                </div>
                <pre className="bh-prompt-text">
                  {emphasised(expanded ? promptText : previewText)}
                </pre>
                {!expanded && <div className="bh-prompt-fade" aria-hidden="true" />}
              </div>
              <div className="bh-actions">
                <button type="button" className={`bh-btn bh-btn--primary${copied ? ' is-copied' : ''}`} data-brief-copy onClick={() => void handleCopy()}>
                  {copied ? <><Check /> Copied</> : <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
                    Copy prompt
                  </>}
                </button>
                <span className="bh-or">or</span>
                {AI_TOOLS.map((tool) => (
                  <button key={tool.id} type="button" className="bh-btn" data-brief-open={tool.id} onClick={() => openIn(tool)}>
                    {tool.label}
                    <svg className="bh-ext" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
                  </button>
                ))}
              </div>
              {copied && (
                <div className="bh-copied-note" data-brief-copied-note role="status">
                  <Check /> Prompt copied — now paste it into {AI_TOOL_NAMES[0]}, {AI_TOOL_NAMES[1]} or any AI and hit send.
                </div>
              )}
            </div>
          </li>

          <li className="bh-step" data-step="2" data-state={step3Done ? 'done' : step1Done ? 'active' : 'idle'}>
            <span className="bh-num">{step3Done ? <Check /> : '2'}</span>
            <div className="bh-body">
              <div className="bh-label">
                {sent === 'copied'
                  ? 'Paste it into your AI, then copy its reply'
                  : sent
                    ? 'Hit send there, then copy the reply'
                    : 'Send it, then copy the reply'}
              </div>
            </div>
          </li>

          {/* Step 3 lights up when there is a reply IN it, not when the prompt was copied —
              copying is step 1's business; nothing has happened here yet. */}
          <li className="bh-step" data-step="3" data-state={step3Done ? 'done' : 'idle'}>
            <span className="bh-num">{step3Done ? <Check /> : '3'}</span>
            <div className="bh-body">
              <label className="bh-label" htmlFor="description">Paste the reply here</label>
              <textarea
                ref={pasteRef}
                id="description"
                className="bh-paste"
                data-brief-paste
                data-verdict={verdict.kind}
                autoFocus={autoFocus}
                placeholder="Paste what the AI wrote…"
                value={value}
                onChange={(e) => onChange(e.target.value)}
              />
              <div className="bh-status" data-brief-status={verdict.kind} aria-live="polite">
                {verdict.kind === 'brief' && (
                  <><Check /> Brand brief recognised — {verdict.sections} of 12 sections</>
                )}
                {verdict.kind === 'prose' && <>We’ll read this as your own description.</>}
                {verdict.kind === 'prompt' && (
                  <>That’s the prompt itself — send it to your AI and paste the <b>reply</b> instead.</>
                )}
              </div>
            </div>
          </li>
        </ol>
      </div>

      <button type="button" className="bh-link bh-manual-link" data-brief-switch="manual" onClick={() => setMode('manual')}>
        Prefer to write it yourself? ›
      </button>
    </div>
  );
}
