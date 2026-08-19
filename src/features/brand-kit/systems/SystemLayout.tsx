import type { ReactNode } from 'react';

/**
 * Shared scaffold for the Brand Kit's composed views — Strategy, the
 * Social Media System, the Presentation System and the Brand Board.
 *
 * These views are not template grids. They read the brand and explain
 * something about it, then show that something applied. The scaffold is
 * just the rhythm they share: a band with a heading and a lede, and a
 * block that holds either rules or examples.
 *
 * It renders INSIDE the drilldown body, so the back button, the title
 * and the download action all stay where they were — the shared
 * drilldown chrome is unchanged and so is its transition.
 */

export function SystemBand({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  return (
    <section className="bk-sys-band">
      <header className="bk-sys-band-head">
        <h3 className="bk-sys-band-title">{title}</h3>
        {lede && <p className="bk-sys-band-lede">{lede}</p>}
      </header>
      {children}
    </section>
  );
}

/** A rule: what the brand does, stated, with the proof beside it. */
export function SystemRule({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <article className="bk-sys-rule">
      <div className="bk-sys-rule-head">
        <span className="bk-sys-rule-label">{label}</span>
        {note && <span className="bk-sys-rule-note">{note}</span>}
      </div>
      <div className="bk-sys-rule-body">{children}</div>
    </article>
  );
}

/** Grid of rules. */
export function SystemRules({ children }: { children: ReactNode }) {
  return <div className="bk-sys-rules">{children}</div>;
}

/**
 * One applied example, framed at its natural aspect.
 *
 * `aspect` is width / height — the same convention the deliverable
 * registry uses, so a caller can hand it `def.aspect` directly.
 */
export function SystemExample({
  caption,
  aspect,
  children,
}: {
  caption: string;
  aspect: number;
  children: ReactNode;
}) {
  return (
    <figure className="bk-sys-example">
      <div className="bk-sys-example-frame" style={{ aspectRatio: String(aspect) }}>
        <div className="bk-sys-example-render">{children}</div>
      </div>
      <figcaption className="bk-sys-example-caption">{caption}</figcaption>
    </figure>
  );
}

/** Grid of applied examples. `min` sizes the columns. */
export function SystemExamples({
  min = 260,
  children,
}: {
  min?: number;
  children: ReactNode;
}) {
  return (
    <div
      className="bk-sys-examples"
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))` }}
    >
      {children}
    </div>
  );
}

/** Shown when the brand has not got enough for a view to say anything. */
export function SystemEmpty({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="bk-sys-empty">
      <span className="bk-sys-empty-title">{title}</span>
      <span className="bk-sys-empty-sub">{sub}</span>
    </div>
  );
}
