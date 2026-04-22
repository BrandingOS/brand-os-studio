/**
 * WebsiteShowcase — a modern SaaS marketing page.
 *
 * Design language: mostly neutral surfaces with strategic brand
 * accents. The brand color appears as: logo mark, "new" pill, primary
 * CTA, stat accents, testimonial quote mark, and a subtle decorative
 * blob behind the hero. No monolithic brand-color hero — instead a
 * split layout with neutral left column and a dashboard screenshot on
 * the right, plus a floating stat card that uses brand color as an
 * accent ring.
 *
 * Inspired by Linear / Vercel / Stripe landing pages.
 */
import { ArrowRight, Check, Sparkles, Quote, Star, ArrowUpRight } from 'lucide-react';

import { pickOn, type ShowcaseProps } from './showcase-shared';
import { WEB_PHOTOS } from './photos';
import { Photo } from './Photo';

export function WebsiteShowcase({ palette, secondary }: ShowcaseProps) {
  const p = palette.roles.primary.shades;
  const n = palette.roles.neutral.shades;
  const s = secondary?.shades ?? p;

  const onPrimary = pickOn(p[600].hex, n[50].hex, n[950].hex);
  const onDarkCTA = pickOn(n[950].hex, n[50].hex, n[950].hex);

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{ background: n[50].hex, borderColor: n[200].hex }}
    >
      {/* ─── Nav ─── */}
      <div
        className="flex items-center justify-between gap-4 border-b px-6 py-3"
        style={{ background: '#ffffff', borderColor: n[200].hex }}
      >
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[12px] font-bold"
              style={{ background: p[600].hex, color: onPrimary }}
            >
              B
            </span>
            <span className="text-[14px] font-semibold" style={{ color: n[900].hex }}>
              Brandos
            </span>
          </div>
          <div className="hidden items-center gap-6 text-[13px] md:flex" style={{ color: n[600].hex }}>
            <span>Product</span>
            <span>Templates</span>
            <span>Pricing</span>
            <span>Docs</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md px-3 py-1.5 text-[13px] font-medium"
            style={{ color: n[700].hex }}
          >
            Sign in
          </button>
          <button
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[13px] font-semibold"
            style={{ background: n[950].hex, color: onDarkCTA }}
          >
            Start free
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Hero ─── */}
      <div className="relative overflow-hidden" style={{ background: '#ffffff' }}>
        {/* Subtle brand accent shapes in the hero corners */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-20 h-80 w-80 rounded-full opacity-40 blur-3xl"
          style={{ background: p[200].hex }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
          style={{ background: s[200].hex }}
        />

        <div className="relative grid gap-8 px-8 py-12 md:grid-cols-[1.1fr_1fr] md:px-12 md:py-16 lg:gap-12">
          {/* Left column */}
          <div className="flex flex-col items-start gap-5">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
              style={{
                background: p[100].hex,
                color: p[900].hex,
                border: `1px solid ${p[200].hex}`,
              }}
            >
              <Sparkles className="h-3 w-3" style={{ color: p[700].hex }} />
              New · Vibrant theme
            </span>
            <h1
              className="text-balance text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl"
              style={{ color: n[900].hex }}
            >
              Build a brand system that{' '}
              <span style={{ color: p[700].hex }}>actually ships.</span>
            </h1>
            <p className="max-w-[46ch] text-[15px] leading-relaxed" style={{ color: n[600].hex }}>
              One palette. Every token. Every surface. Brandos turns your brand
              color into a full UI system — not just a swatch you paste into Figma.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[14px] font-semibold"
                style={{ background: n[950].hex, color: onDarkCTA }}
              >
                Start for free
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-[14px] font-semibold"
                style={{ borderColor: n[300].hex, color: n[900].hex, background: '#ffffff' }}
              >
                View demo
              </button>
            </div>

            {/* Social proof row */}
            <div className="mt-2 flex items-center gap-3">
              <div className="flex -space-x-2">
                {[WEB_PHOTOS.avatar1, WEB_PHOTOS.avatar2, WEB_PHOTOS.avatar3, WEB_PHOTOS.avatar4].map((src, i) => (
                  <div
                    key={i}
                    className="inline-flex h-7 w-7 overflow-hidden rounded-full border-2"
                    style={{ borderColor: '#ffffff', background: n[200].hex }}
                  >
                    <Photo src={src} alt="Customer avatar" fallback={{ from: n[200].hex, to: n[400].hex }} />
                  </div>
                ))}
              </div>
              <div className="flex flex-col text-[11px]" style={{ color: n[600].hex }}>
                <div className="flex items-center gap-1" style={{ color: p[700].hex }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-current" />
                  ))}
                </div>
                <span>
                  <b style={{ color: n[900].hex }}>14,000+</b> product teams ship faster with Brandos
                </span>
              </div>
            </div>
          </div>

          {/* Right column — dashboard mockup in a frame */}
          <div className="relative">
            <div
              className="relative overflow-hidden rounded-2xl border shadow-2xl"
              style={{
                borderColor: n[200].hex,
                boxShadow: '0 30px 60px -20px rgba(0,0,0,0.25)',
              }}
            >
              <div
                className="flex items-center gap-1.5 border-b px-3 py-2"
                style={{ background: n[100].hex, borderColor: n[200].hex }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#ef4444' }} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#f59e0b' }} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#22c55e' }} />
                <span className="ml-3 text-[10px]" style={{ color: n[500].hex }}>
                  brandos.design/dashboard
                </span>
              </div>
              <div className="relative aspect-[4/3]">
                <Photo
                  src={WEB_PHOTOS.heroDashboard}
                  alt="Brandos dashboard preview"
                  fallback={{ from: p[100].hex, to: p[300].hex }}
                  style={{ position: 'absolute', inset: 0 }}
                />
              </div>
            </div>

            {/* Floating stat card */}
            <div
              className="absolute -bottom-4 -left-4 hidden max-w-[180px] flex-col gap-1.5 rounded-xl border p-3 shadow-xl md:flex"
              style={{ background: '#ffffff', borderColor: n[200].hex }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: n[500].hex }}>
                  Accessibility
                </span>
                <span
                  className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold"
                  style={{ background: p[100].hex, color: p[800].hex }}
                >
                  <ArrowUpRight className="h-2.5 w-2.5" />
                  +24%
                </span>
              </div>
              <div className="text-xl font-bold" style={{ color: n[900].hex }}>
                100%
              </div>
              <div className="flex items-center gap-1 text-[10px]" style={{ color: n[600].hex }}>
                <Check className="h-2.5 w-2.5" style={{ color: p[600].hex }} />
                WCAG AA passing
              </div>
            </div>

            {/* Secondary float (only when palette has secondary) */}
            {secondary && (
              <div
                className="absolute -top-3 -right-3 hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold shadow-lg md:flex"
                style={{ background: '#ffffff', borderColor: n[200].hex, color: n[900].hex }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: s[500].hex }} />
                <span>Live sync</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Stats strip ─── */}
      <div
        className="grid gap-8 border-y px-8 py-8 md:grid-cols-3 md:px-12"
        style={{ background: n[50].hex, borderColor: n[200].hex }}
      >
        {[
          { value: '14,000+', label: 'teams shipping', accent: p[700].hex },
          { value: '2 mins', label: 'from seed to tokens', accent: secondary ? s[700].hex : p[700].hex },
          { value: '99.9%', label: 'accessible by default', accent: p[700].hex },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col gap-1">
            <span
              className="font-bold tracking-tight"
              style={{ fontSize: 36, lineHeight: 1, color: stat.accent }}
            >
              {stat.value}
            </span>
            <span className="text-[13px]" style={{ color: n[600].hex }}>
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* ─── Features ─── */}
      <div className="grid gap-4 px-8 py-12 md:grid-cols-3 md:px-12" style={{ background: '#ffffff' }}>
        {/* Card 1 — icon + text */}
        <div
          className="flex flex-col gap-3 rounded-2xl border p-6"
          style={{ background: n[50].hex, borderColor: n[200].hex }}
        >
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: p[100].hex, color: p[700].hex, border: `1px solid ${p[200].hex}` }}
          >
            <Sparkles className="h-4 w-4" />
          </span>
          <h3 className="text-[16px] font-semibold" style={{ color: n[900].hex }}>
            Brand-aware by default
          </h3>
          <p className="text-[13px] leading-relaxed" style={{ color: n[600].hex }}>
            Drop in one hex and Brandos generates shades, semantic tokens, and
            theme variables that actually match your identity.
          </p>
        </div>

        {/* Card 2 — checklist */}
        <div
          className="flex flex-col gap-3 rounded-2xl border p-6"
          style={{ background: '#ffffff', borderColor: n[200].hex }}
        >
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: secondary ? s[100].hex : p[100].hex, color: secondary ? s[700].hex : p[700].hex, border: `1px solid ${secondary ? s[200].hex : p[200].hex}` }}
          >
            <Check className="h-4 w-4" />
          </span>
          <h3 className="text-[16px] font-semibold" style={{ color: n[900].hex }}>
            Accessible on every pair
          </h3>
          <ul className="flex flex-col gap-1.5 text-[13px]" style={{ color: n[700].hex }}>
            {['WCAG 2 contrast grid', 'APCA for modern screens', 'Fixes suggested inline'].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5" style={{ color: p[600].hex }} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Card 3 — photo + overlay */}
        <div
          className="relative flex flex-col justify-end overflow-hidden rounded-2xl"
          style={{ minHeight: 220, background: n[900].hex, color: n[50].hex }}
        >
          <div className="absolute inset-0">
            <Photo
              src={WEB_PHOTOS.featureTeam}
              alt="Design team collaborating"
              fallback={{ from: p[700].hex, to: n[900].hex }}
            />
          </div>
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, transparent 40%, ${n[950].hex}e0 100%)`,
            }}
          />
          <div className="relative z-10 flex flex-col gap-2 p-6">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: p[200].hex }}>
              Built for teams
            </span>
            <h3 className="text-[18px] font-bold leading-tight">
              Ship a full design system, not a swatch PDF.
            </h3>
          </div>
        </div>
      </div>

      {/* ─── Testimonial + logo cloud ─── */}
      <div
        className="flex flex-col gap-6 border-t px-8 py-10 md:flex-row md:items-center md:px-12"
        style={{ background: n[50].hex, borderColor: n[200].hex }}
      >
        <div
          className="relative flex max-w-md flex-col gap-3 rounded-2xl border p-6"
          style={{ background: '#ffffff', borderColor: n[200].hex }}
        >
          <Quote className="h-6 w-6" style={{ color: p[300].hex }} />
          <p className="text-[14px] leading-relaxed" style={{ color: n[800].hex }}>
            "We replaced three tools with Brandos. The handoff from design to
            production is invisible now — tokens just show up."
          </p>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 overflow-hidden rounded-full" style={{ background: n[200].hex }}>
              <Photo src={WEB_PHOTOS.avatar3} alt="Nora Liu" fallback={{ from: n[200].hex, to: n[400].hex }} />
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] font-semibold" style={{ color: n[900].hex }}>
                Nora Liu
              </span>
              <span className="text-[11px]" style={{ color: n[600].hex }}>
                Design Lead · Horizon Health
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: n[500].hex }}>
            Trusted by
          </p>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-[13px] font-semibold uppercase tracking-[0.12em]" style={{ color: n[700].hex }}>
            <span>Linear</span>
            <span>Vercel</span>
            <span>Stripe</span>
            <span>Figma</span>
            <span>Notion</span>
            <span>Raycast</span>
          </div>
        </div>
      </div>
    </div>
  );
}
