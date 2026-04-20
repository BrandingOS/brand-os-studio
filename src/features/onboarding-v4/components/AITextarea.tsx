import { useEffect, useRef, useState } from 'react';
import { TYPED_PROMPTS } from '../data/typedPrompts';

interface Props {
  value: string;
  onChange(value: string): void;
}

/** AI-styled textarea: typed placeholder rotates while empty; sparkle icon pulses. */
export function AITextarea({ value, onChange }: Props) {
  const [typedChars, setTypedChars] = useState<string[]>([]);
  const tokenRef = useRef(0);
  const idxRef = useRef(0);
  const isEmpty = value.length === 0;

  useEffect(() => {
    let cancelled = false;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    if (!isEmpty) {
      tokenRef.current++;
      setTypedChars([]);
      return;
    }

    const myToken = ++tokenRef.current;

    async function loop() {
      while (!cancelled && myToken === tokenRef.current) {
        const line = TYPED_PROMPTS[idxRef.current % TYPED_PROMPTS.length];
        idxRef.current++;

        // type line
        setTypedChars([]);
        for (const ch of line) {
          if (cancelled || myToken !== tokenRef.current) return;
          setTypedChars((prev) => [...prev, ch]);
          await sleep(30 + Math.random() * 48);
        }
        await sleep(1700);
        if (cancelled || myToken !== tokenRef.current) return;

        // erase
        for (;;) {
          if (cancelled || myToken !== tokenRef.current) return;
          let stop = false;
          setTypedChars((prev) => {
            if (prev.length === 0) {
              stop = true;
              return prev;
            }
            return prev.slice(0, -1);
          });
          if (stop) break;
          await sleep(14);
        }
        await sleep(260);
      }
    }

    loop();
    return () => {
      cancelled = true;
    };
  }, [isEmpty]);

  return (
    <div className="ai-wrap textarea-wrap">
      <textarea
        id="description"
        className="textarea ai-textarea"
        placeholder=""
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className={`typed-placeholder${isEmpty ? '' : ' is-hidden'}`} aria-hidden="true">
        <span className="typed-text">
          {typedChars.map((c, i) => (
            <span key={`${i}-${c}`}>{c}</span>
          ))}
        </span>
        <span className="typed-caret" />
      </div>
      <div className="ai-sparkle" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
          <circle cx={12} cy={12} r={2.4} fill="currentColor" stroke="none" />
        </svg>
      </div>
    </div>
  );
}
