/**
 * HeadingsShowcase — typography hierarchy in-palette.
 *
 * Checks that headings still read clearly at every size, that inline
 * highlights using brand hues don't wreck paragraph legibility, and
 * that the blockquote rail looks natural against the neutral scale.
 */
import { pickOn, type ShowcaseProps } from './showcase-shared';

export function HeadingsShowcase({ palette, secondary }: ShowcaseProps) {
  const p = palette.roles.primary.shades;
  const n = palette.roles.neutral.shades;
  const s = secondary?.shades ?? p;

  return (
    <div
      className="flex flex-col gap-6 rounded-2xl border p-8"
      style={{ background: n[50].hex, borderColor: n[200].hex, color: n[900].hex }}
    >
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: p[700].hex }}>
          Brand voice
        </p>
        <h1 className="text-5xl font-bold tracking-tight md:text-6xl" style={{ color: n[900].hex }}>
          Build the system,{' '}
          <span
            className="rounded px-2"
            style={{ background: p[100].hex, color: p[900].hex }}
          >
            then the product.
          </span>
        </h1>
        <p className="mt-2 max-w-[48ch] text-base" style={{ color: n[700].hex }}>
          Most brand work falls apart the moment real engineers touch it. We
          ship tokens, not PDFs — so nothing gets lost in translation.
        </p>
      </div>

      <hr style={{ border: 0, borderTop: `1px solid ${n[200].hex}` }} />

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold" style={{ color: n[900].hex }}>
            Heading 2 — product sections
          </h2>
          <p className="mt-2 text-sm" style={{ color: n[700].hex }}>
            Paragraph text is tuned for long-form. Links like{' '}
            <a style={{ color: p[700].hex, textDecoration: 'underline' }} href="#">
              this one
            </a>{' '}
            stay underlined. Inline code looks{' '}
            <code
              className="rounded px-1 py-0.5 font-mono text-[12px]"
              style={{ background: n[100].hex, color: s[800].hex }}
            >
              like this
            </code>
            .
          </p>
        </div>

        <blockquote
          className="rounded-lg border-l-4 p-4"
          style={{ borderLeftColor: p[600].hex, background: p[100].hex, color: n[900].hex }}
        >
          <p className="text-[15px] italic">
            "A design system is a contract. Color is the signature that every
            team member carries with them."
          </p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: p[800].hex }}>
            — Brandos manifesto
          </p>
        </blockquote>
      </div>

      <hr style={{ border: 0, borderTop: `1px solid ${n[200].hex}` }} />

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <h3 className="text-xl font-semibold" style={{ color: n[900].hex }}>H3 — subsection</h3>
          <p className="mt-1 text-[13px]" style={{ color: n[700].hex }}>
            Secondary headings stay legible without screaming.
          </p>
        </div>
        <div>
          <h4 className="text-base font-semibold" style={{ color: n[800].hex }}>H4 — card title</h4>
          <p className="mt-1 text-[13px]" style={{ color: n[700].hex }}>
            Works on cards, list items, and side-by-side panels.
          </p>
        </div>
        <div>
          <h5
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: p[700].hex }}
          >
            H5 — eyebrow
          </h5>
          <p className="mt-1 text-[13px]" style={{ color: n[700].hex }}>
            Eyebrow uses the primary scale as an accent.
          </p>
        </div>
      </div>
    </div>
  );
}
