/**
 * BrandBoardCanvas — a proper brand-board poster preview.
 *
 * Replaces the old SaaS/Portfolio/Ecommerce *webpage* mockups. This is a
 * branding deliverable: a single landscape poster with the brand name,
 * color palette (primary/secondary/accent + neutrals with hex codes),
 * typography specimens, brand adjectives, and a small application mockup.
 * Everything reads off the draft in the store so changes in the side
 * panels flow through instantly.
 */
import React, { useMemo } from 'react';
import { useBrandBoardStore } from '../store/useBrandBoardStore';
import { useBrandStore } from '@/shared/store/brandStore';
import { logoUrl, hasLogo } from '@/shared/brand/logoUrl';
import { SHADOW_MAP } from '../engine/uiPresets';

/** Canvas intrinsic size — renders at this dimension; the outer scroller
 *  centers and scales it. Matches a 16:10 poster aspect. */
const CANVAS_W = 1600;
const CANVAS_H = 1000;

function readableOn(bgHex: string): '#ffffff' | '#0a0a0f' {
  const h = bgHex.replace('#', '');
  if (h.length !== 6) return '#0a0a0f';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#0a0a0f' : '#ffffff';
}

export function BrandBoardCanvas() {
  const draft = useBrandBoardStore((s) => s.draft);
  const currentBrand = useBrandStore((s) => s.current);

  const brandLogo = hasLogo(currentBrand) ? logoUrl(currentBrand) : undefined;
  const tone = currentBrand?.tone;
  const audience = currentBrand?.audience;
  const values = currentBrand?.guidelines?.strategy?.values ?? [];
  const toneAttributes = currentBrand?.guidelines?.voiceAndTone?.toneAttributes ?? [];

  const vars = useMemo<React.CSSProperties>(
    () =>
      ({
        '--bb-primary': draft.colors.primary,
        '--bb-secondary': draft.colors.secondary,
        '--bb-accent': draft.colors.accent,
        '--bb-bg': draft.colors.background,
        '--bb-fg': draft.colors.foreground,
        '--bb-neutral-50': draft.colors.neutrals[0] || '#fafafa',
        '--bb-neutral-100': draft.colors.neutrals[1] || '#f5f5f5',
        '--bb-neutral-200': draft.colors.neutrals[2] || '#e5e5e5',
        '--bb-neutral-300': draft.colors.neutrals[3] || '#d4d4d4',
        '--bb-neutral-400': draft.colors.neutrals[4] || '#a3a3a3',
        '--bb-neutral-500': draft.colors.neutrals[5] || '#737373',
        '--bb-font-heading': draft.typography.heading,
        '--bb-font-body': draft.typography.body,
        '--bb-radius': `${draft.uiStyle.borderRadius}px`,
        '--bb-shadow': SHADOW_MAP[draft.uiStyle.shadowIntensity] || SHADOW_MAP.medium,
      }) as React.CSSProperties,
    [draft],
  );

  return (
    <div className="min-h-full flex items-center justify-center p-8">
      <div
        className="relative overflow-hidden shadow-2xl"
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          maxWidth: '100%',
          aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
          background: 'var(--bb-bg)',
          color: 'var(--bb-fg)',
          borderRadius: 12,
          fontFamily: 'var(--bb-font-body)',
          ...vars,
        }}
      >
        {/* Decorative corner ribbon */}
        <div
          className="absolute top-0 left-0 h-16 w-40"
          style={{ background: 'var(--bb-primary)' }}
        />
        <div
          className="absolute top-0 left-0 h-16 flex items-center pl-8 pr-6"
          style={{
            color: readableOn(draft.colors.primary),
            fontFamily: 'var(--bb-font-heading)',
            fontWeight: 700,
            letterSpacing: '0.18em',
            fontSize: 12,
            textTransform: 'uppercase',
          }}
        >
          Brand Board
        </div>
        <div
          className="absolute top-5 right-8 text-[11px] uppercase tracking-[0.18em]"
          style={{ color: 'var(--bb-neutral-400)', fontFamily: 'var(--bb-font-body)' }}
        >
          {new Date().getFullYear()} · Identity
        </div>

        {/* Main grid */}
        <div className="absolute inset-0 pt-24 pb-10 px-12 grid grid-cols-12 grid-rows-[auto_1fr_auto] gap-8">
          {/* HERO — brand name + tone */}
          <div className="col-span-7 row-start-1">
            <div
              className="text-[11px] uppercase tracking-[0.22em] mb-3"
              style={{ color: 'var(--bb-neutral-400)', fontFamily: 'var(--bb-font-body)' }}
            >
              The Brand
            </div>
            <div className="flex items-center gap-6">
              {brandLogo ? (
                <img
                  src={brandLogo}
                  alt=""
                  className="h-20 w-20 object-contain rounded-lg p-2"
                  style={{ background: 'var(--bb-neutral-50)' }}
                />
              ) : (
                <div
                  className="h-20 w-20 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'var(--bb-primary)',
                    color: readableOn(draft.colors.primary),
                    fontFamily: 'var(--bb-font-heading)',
                    fontSize: 36,
                    fontWeight: 700,
                  }}
                >
                  {draft.brandName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h1
                  style={{
                    fontFamily: 'var(--bb-font-heading)',
                    fontSize: 72,
                    lineHeight: 1,
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {draft.brandName}
                </h1>
                {tone && (
                  <p
                    className="mt-2"
                    style={{
                      fontFamily: 'var(--bb-font-body)',
                      color: 'var(--bb-neutral-500)',
                      fontSize: 16,
                    }}
                  >
                    {tone}
                    {audience ? ` · ${audience}` : ''}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* LOGO MARK CARD — stacked alongside hero */}
          <div className="col-span-5 row-start-1 flex justify-end">
            <div
              className="flex items-center justify-center"
              style={{
                width: 260,
                height: 140,
                borderRadius: 'var(--bb-radius)',
                background: 'var(--bb-fg)',
                color: 'var(--bb-bg)',
              }}
            >
              {brandLogo ? (
                <img
                  src={brandLogo}
                  alt=""
                  className="max-h-20 max-w-40 object-contain"
                  style={{ filter: 'invert(1) brightness(2)' }}
                />
              ) : (
                <span
                  style={{
                    fontFamily: 'var(--bb-font-heading)',
                    fontWeight: 700,
                    fontSize: 28,
                  }}
                >
                  {draft.brandName}
                </span>
              )}
            </div>
          </div>

          {/* COLOR PALETTE */}
          <section className="col-span-7 row-start-2 flex flex-col">
            <SectionLabel>Color Palette</SectionLabel>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <ColorBlock hex={draft.colors.primary} label="Primary" size="lg" />
              <ColorBlock hex={draft.colors.secondary} label="Secondary" size="lg" />
              <ColorBlock hex={draft.colors.accent} label="Accent" size="lg" />
            </div>
            <div className="grid grid-cols-6 gap-2">
              {draft.colors.neutrals.map((n, i) => (
                <ColorBlock key={i} hex={n} label={`N${i}`} size="sm" />
              ))}
            </div>
          </section>

          {/* TYPOGRAPHY */}
          <section className="col-span-5 row-start-2 flex flex-col">
            <SectionLabel>Typography</SectionLabel>
            <div
              className="flex-1 flex flex-col p-6"
              style={{
                background: 'var(--bb-neutral-50)',
                borderRadius: 'var(--bb-radius)',
              }}
            >
              <div>
                <div
                  className="text-[10px] uppercase tracking-[0.22em] mb-1"
                  style={{ color: 'var(--bb-neutral-500)' }}
                >
                  Heading · {draft.typography.heading}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--bb-font-heading)',
                    fontSize: 44,
                    fontWeight: 700,
                    lineHeight: 1.05,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Aa Bb Cc Dd
                </div>
                <div
                  style={{
                    fontFamily: 'var(--bb-font-heading)',
                    fontSize: 14,
                    color: 'var(--bb-neutral-500)',
                  }}
                >
                  0 1 2 3 4 5 6 7 8 9 &amp; ?
                </div>
              </div>
              <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--bb-neutral-200)' }}>
                <div
                  className="text-[10px] uppercase tracking-[0.22em] mb-1"
                  style={{ color: 'var(--bb-neutral-500)' }}
                >
                  Body · {draft.typography.body}
                </div>
                <p
                  style={{
                    fontFamily: 'var(--bb-font-body)',
                    fontSize: 14,
                    lineHeight: 1.55,
                  }}
                >
                  The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.
                </p>
              </div>
            </div>
          </section>

          {/* BRAND VOICE / APPLICATION */}
          <section className="col-span-12 row-start-3 grid grid-cols-12 gap-6">
            <div className="col-span-7 flex flex-col">
              <SectionLabel>Voice &amp; Values</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {(toneAttributes.length ? toneAttributes : ['Confident', 'Clear', 'Human']).map((t) => (
                  <span
                    key={t}
                    className="px-4 py-1.5 text-sm"
                    style={{
                      background: 'var(--bb-neutral-100)',
                      color: 'var(--bb-fg)',
                      borderRadius: 999,
                      fontFamily: 'var(--bb-font-body)',
                    }}
                  >
                    {t}
                  </span>
                ))}
                {values.slice(0, 4).map((v) => (
                  <span
                    key={v}
                    className="px-4 py-1.5 text-sm"
                    style={{
                      background: 'var(--bb-primary)',
                      color: readableOn(draft.colors.primary),
                      borderRadius: 999,
                      fontFamily: 'var(--bb-font-body)',
                    }}
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>

            <div className="col-span-5">
              <SectionLabel>Application</SectionLabel>
              {/* Business card mock */}
              <div className="relative">
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1.75 / 1',
                    background: 'var(--bb-bg)',
                    border: '1px solid var(--bb-neutral-200)',
                    borderRadius: 'var(--bb-radius)',
                    boxShadow: 'var(--bb-shadow)',
                    padding: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--bb-font-heading)',
                      fontSize: 18,
                      fontWeight: 700,
                    }}
                  >
                    {draft.brandName}
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--bb-font-body)',
                        fontSize: 11,
                        color: 'var(--bb-neutral-500)',
                      }}
                    >
                      hello@{draft.brandName.toLowerCase().replace(/\s+/g, '')}.com
                    </div>
                    <div
                      className="mt-1"
                      style={{
                        height: 3,
                        width: 56,
                        background: 'var(--bb-primary)',
                        borderRadius: 2,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10px] uppercase tracking-[0.22em] mb-3"
      style={{ color: 'var(--bb-neutral-500)', fontFamily: 'var(--bb-font-body)' }}
    >
      {children}
    </div>
  );
}

function ColorBlock({
  hex,
  label,
  size,
}: {
  hex: string;
  label: string;
  size: 'lg' | 'sm';
}) {
  const fg = readableOn(hex);
  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: hex,
        borderRadius: 'var(--bb-radius)',
        aspectRatio: size === 'lg' ? '4 / 3' : '1 / 1',
        padding: size === 'lg' ? 14 : 8,
        color: fg,
        fontFamily: 'var(--bb-font-body)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        border: '1px solid rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          fontSize: size === 'lg' ? 13 : 9,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          opacity: 0.9,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: size === 'lg' ? 13 : 9,
          fontFamily: 'ui-monospace, monospace',
          opacity: 0.85,
          textTransform: 'uppercase',
        }}
      >
        {hex}
      </div>
    </div>
  );
}
