/**
 * The four shapes the whole page is built from.
 *
 * A guideline document earns its fluency by repeating a small number of
 * layouts, not by art-directing every section separately: the reader learns the
 * shape once and then reads fifteen sections without re-orienting. So there are
 * four, and every section is made of them.
 *
 *   Eyebrow       an accent dot and a sentence-case label
 *   SplitHeader   heading left, explanation right — how a section opens
 *   RuleCard      a narrow text cell beside a large specimen — how a rule reads
 *   CopyableValue a specification you can take with you
 *
 * Art direction comes from the CONTENT filling these — a logo's own proportions,
 * a palette's own colours — not from each section inventing a layout.
 */
import { useState, type ReactNode } from 'react';
import { useReveal } from '../motion/useReveal';

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="bi-eyebrow">{children}</span>;
}

export function SplitHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow?: string;
  title: ReactNode;
  body?: ReactNode;
}) {
  const head = useReveal();
  const aside = useReveal({ delay: 80 });
  return (
    <div className="bi-split-header">
      <div {...head}>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="bi-title">{title}</h2>
      </div>
      {body && (
        <div {...aside}>
          <p className="bi-body">{body}</p>
        </div>
      )}
    </div>
  );
}

export function RuleCard({
  title,
  body,
  action,
  specimen,
  specimenGround = 'light',
  delay = 0,
}: {
  title: string;
  body?: ReactNode;
  /** Usually a download — it belongs under the rule that governs the thing. */
  action?: ReactNode;
  specimen: ReactNode;
  specimenGround?: 'light' | 'dark';
  delay?: number;
}) {
  const reveal = useReveal({ delay });
  return (
    <div className="bi-rule" {...reveal}>
      <div className="bi-rule-text">
        <h3 className="bi-card-title">{title}</h3>
        {body && <p className="bi-body">{body}</p>}
        {action}
      </div>
      <div className="bi-specimen" data-ground={specimenGround}>
        {specimen}
      </div>
    </div>
  );
}

/**
 * A specification value you can take with you.
 *
 * The WHOLE row is the button. A 16px copy icon in the corner of a swatch is a
 * target most people miss and nobody discovers; if a value is worth publishing
 * it is worth being able to grab without aiming.
 */
export function CopyableValue({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard refused (insecure context, permissions). Say nothing and
      // leave the value on screen — it is selectable either way.
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <button
      type="button"
      className={className ? `bi-copyable ${className}` : 'bi-copyable'}
      onClick={copy}
      aria-label={`Copy ${label} ${value}`}
    >
      <span className="bi-copyable-label">{label}</span>
      <span className="bi-copyable-value">{copied ? 'Copied' : value}</span>
    </button>
  );
}

export function DownloadPill({
  children,
  onClick,
  href,
  download,
  ghost,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  download?: string;
  ghost?: boolean;
  disabled?: boolean;
}) {
  const cls = ghost ? 'bi-download bi-download--ghost' : 'bi-download';
  const glyph = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );

  if (href) {
    return (
      <a className={cls} href={href} download={download} target="_blank" rel="noreferrer noopener">
        {glyph}
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick} disabled={disabled}>
      {glyph}
      {children}
    </button>
  );
}

/** One section of the page. `ground` is what makes the two crescendos land. */
export function Section({
  id,
  ground,
  children,
}: {
  id: string;
  ground?: 'panel' | 'brand';
  children: ReactNode;
}) {
  return (
    <section className="bi-section" id={id} data-ground={ground}>
      <div className="bi-container">{children}</div>
    </section>
  );
}
