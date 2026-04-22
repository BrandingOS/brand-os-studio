/**
 * WebsiteShowcase — a condensed marketing page mockup.
 *
 * Top navbar with the brand mark · full-bleed hero with a CTA pair ·
 * three feature tiles · testimonial ribbon. Both brand colors are used
 * when a secondary is defined — hero on primary, ribbon on secondary.
 */
import { pickOn, type ShowcaseProps } from './showcase-shared';

export function WebsiteShowcase({ palette, secondary }: ShowcaseProps) {
  const p = palette.roles.primary.shades;
  const n = palette.roles.neutral.shades;
  const s = secondary?.shades ?? p;

  const heroFg = pickOn(p[600].hex, n[50].hex, n[950].hex);
  const secondaryFg = pickOn(s[500].hex, n[50].hex, n[950].hex);

  return (
    <div className="overflow-hidden rounded-2xl border" style={{ background: n[50].hex }}>
      {/* nav */}
      <div
        className="flex items-center justify-between px-6 py-3"
        style={{ background: n[50].hex, borderBottom: `1px solid ${n[200].hex}` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold"
            style={{ background: p[600].hex, color: heroFg }}
          >
            B
          </span>
          <span className="text-sm font-semibold" style={{ color: n[900].hex }}>
            Brandos
          </span>
        </div>
        <div className="hidden items-center gap-5 text-[12px] md:flex" style={{ color: n[600].hex }}>
          <span>Product</span>
          <span>Templates</span>
          <span>Pricing</span>
          <span>Blog</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md px-3 py-1.5 text-[12px] font-medium"
            style={{ color: n[700].hex }}
          >
            Sign in
          </button>
          <button
            className="rounded-md px-3 py-1.5 text-[12px] font-semibold"
            style={{ background: p[600].hex, color: heroFg }}
          >
            Start free
          </button>
        </div>
      </div>

      {/* hero */}
      <div
        className="relative flex flex-col items-start gap-4 p-8 md:p-12"
        style={{
          background: `linear-gradient(135deg, ${p[500].hex}, ${p[700].hex})`,
          color: heroFg,
        }}
      >
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
          style={{ background: `${n[50].hex}33`, color: heroFg }}
        >
          New · Vibrant SaaS theme
        </span>
        <h1 className="max-w-[24ch] text-3xl font-bold leading-tight md:text-4xl">
          Build a brand system that actually ships.
        </h1>
        <p className="max-w-[48ch] text-sm opacity-90">
          One palette. Every token. Every surface. Designed to survive real
          product work — not just look good in a hero.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold"
            style={{ background: n[50].hex, color: n[900].hex }}
          >
            Start for free →
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: `${n[50].hex}55`, color: heroFg }}
          >
            View demo
          </button>
        </div>
      </div>

      {/* features */}
      <div className="grid gap-4 p-6 md:grid-cols-3">
        {[
          { title: 'Brand-aware', body: 'Your colors drive every mockup and export.' },
          { title: 'Accessible by default', body: 'WCAG and APCA checked before you ship.' },
          { title: 'Production-ready', body: 'Tailwind, CSS, JSON, W3C tokens — one click.' },
        ].map((f, i) => (
          <div
            key={f.title}
            className="flex flex-col gap-2 rounded-xl border p-4"
            style={{
              background: n[50].hex,
              borderColor: n[200].hex,
              color: n[900].hex,
            }}
          >
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[12px] font-bold"
              style={{ background: i === 1 && secondary ? s[100].hex : p[100].hex, color: i === 1 && secondary ? s[700].hex : p[700].hex }}
            >
              {i + 1}
            </span>
            <h3 className="text-sm font-semibold">{f.title}</h3>
            <p className="text-[12px]" style={{ color: n[600].hex }}>
              {f.body}
            </p>
          </div>
        ))}
      </div>

      {/* ribbon */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
        style={{ background: s[500].hex, color: secondaryFg }}
      >
        <p className="text-sm font-medium">Loved by 14,000+ product teams.</p>
        <div className="flex items-center gap-5 text-[11px] font-semibold uppercase tracking-widest opacity-80">
          <span>Linear</span>
          <span>Vercel</span>
          <span>Stripe</span>
          <span>Figma</span>
          <span>Notion</span>
        </div>
      </div>
    </div>
  );
}
