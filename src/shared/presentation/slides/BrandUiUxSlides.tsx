/**
 * Brand UI/UX Slides
 *
 * A reusable 3-slide section that demonstrates how a brand's identity
 * (colors, fonts, logo) translates into product UI:
 *  1. BrandDesignSystemSlide — typography, colors, components, logo lockup
 *  2. BrandHeroSlide          — generic landing-page hero mockup
 *  3. BrandDashboardSlide     — generic internal dashboard mockup
 *
 * Plus a BrandUiSectionDivider for the section header.
 *
 * Every slide reads from a unified BrandUiContext so the SAME components
 * automatically reflect any brand. No real photos, no hard-coded copy.
 *
 * Two builder helpers are exported:
 *  - buildBrandUiSlidesForLogo(data)            → for Logo Presentation Simple
 *  - buildBrandUiSlidesForBrandGuide(brand, style, overrides) → for Brand Guide
 */
import type { SlideData, SlideRenderProps } from '@/shared/editor';
import type { Brand } from '@/shared/types/brand';
import type { LogoPresentationData } from '@/features/logo-presentation/types';
import type { PresentationStyle } from '../styles';
import type { SlideOverridesMap } from '../templates';

// ── Context ───────────────────────────────────────────────

export interface BrandUiContext {
  brandName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headingFont?: string;
  bodyFont?: string;
  bgDark: string;
  textOnDark: string;
  /** Light surface background for cards / hero / dashboard chrome */
  bgLight: string;
  /** Text color used on light surfaces */
  textOnLight: string;
}

const slideClass = 'absolute inset-0 w-full h-full overflow-hidden';

// ── Section Divider ───────────────────────────────────────

export function BrandUiSectionDivider({
  ctx,
  sectionNumber,
  label,
}: {
  ctx: BrandUiContext;
  sectionNumber: string;
  label: string;
}) {
  return (
    <div
      className={`${slideClass} flex flex-col justify-center`}
      style={{ backgroundColor: ctx.bgDark, padding: '7%', fontFamily: ctx.headingFont }}
    >
      <div className="text-[28cqi] leading-none font-black select-none" style={{ color: ctx.textOnDark, opacity: 0.07 }}>
        {sectionNumber}
      </div>
      <h2
        className="leading-[1.05] tracking-tight"
        style={{
          color: ctx.textOnDark,
          opacity: 0.92,
          fontSize: 'clamp(28px, 4.5cqi, 56px)',
          fontWeight: 300,
          marginTop: '-1.5cqi',
        }}
      >
        {label}
      </h2>
      <p
        className="uppercase mt-[1cqi]"
        style={{
          color: ctx.textOnDark,
          opacity: 0.25,
          fontSize: 'clamp(9px, 1cqi, 13px)',
          letterSpacing: '0.2em',
        }}
      >
        Brand In Use · {ctx.brandName}
      </p>
    </div>
  );
}

// ── 1. Brand Design System Slide ──────────────────────────

export function BrandDesignSystemSlide({ ctx }: { ctx: BrandUiContext }) {
  const headFont = ctx.headingFont || 'inherit';
  const bodyFont = ctx.bodyFont || 'inherit';

  return (
    <div className={`${slideClass}`} style={{ backgroundColor: ctx.bgLight, padding: '5cqi', fontFamily: bodyFont }}>
      {/* Header label */}
      <p
        className="uppercase mb-[2cqi]"
        style={{ color: ctx.textOnLight, opacity: 0.4, fontSize: 'clamp(8px, 0.95cqi, 11px)', letterSpacing: '0.2em' }}
      >
        Brand Design System
      </p>

      {/* 2x2 grid of zones */}
      <div className="grid grid-cols-2 gap-[2.5cqi]" style={{ height: 'calc(100% - 4cqi)' }}>
        {/* Typography zone */}
        <div
          className="flex flex-col justify-between"
          style={{ padding: '2.5cqi', borderRadius: '1.2cqi', backgroundColor: 'rgba(0,0,0,0.025)', border: '1px solid rgba(0,0,0,0.05)' }}
        >
          <p
            className="uppercase"
            style={{ color: ctx.textOnLight, opacity: 0.4, fontSize: 'clamp(7px, 0.8cqi, 10px)', letterSpacing: '0.15em' }}
          >
            Typography
          </p>
          <div>
            <div
              style={{
                color: ctx.textOnLight,
                fontFamily: headFont,
                fontSize: 'clamp(28px, 4.5cqi, 60px)',
                fontWeight: 700,
                lineHeight: 0.95,
                letterSpacing: '-0.02em',
              }}
            >
              Aa
            </div>
            <div
              className="mt-[0.5cqi]"
              style={{
                color: ctx.textOnLight,
                opacity: 0.6,
                fontFamily: headFont,
                fontSize: 'clamp(11px, 1.4cqi, 18px)',
                fontWeight: 600,
              }}
            >
              {ctx.headingFont || 'Display'} · Heading
            </div>
            <div
              className="mt-[0.5cqi]"
              style={{
                color: ctx.textOnLight,
                opacity: 0.45,
                fontFamily: bodyFont,
                fontSize: 'clamp(10px, 1.1cqi, 14px)',
                fontWeight: 400,
              }}
            >
              {ctx.bodyFont || 'Sans'} · The quick brown fox jumps
            </div>
          </div>
        </div>

        {/* Colors zone */}
        <div
          className="flex flex-col"
          style={{ padding: '2.5cqi', borderRadius: '1.2cqi', backgroundColor: 'rgba(0,0,0,0.025)', border: '1px solid rgba(0,0,0,0.05)' }}
        >
          <p
            className="uppercase mb-[1.5cqi]"
            style={{ color: ctx.textOnLight, opacity: 0.4, fontSize: 'clamp(7px, 0.8cqi, 10px)', letterSpacing: '0.15em' }}
          >
            Colors
          </p>
          <div className="flex-1 grid grid-cols-2 gap-[1cqi]">
            <ColorSwatch color={ctx.primaryColor} label="Primary" textOnLight={ctx.textOnLight} />
            <ColorSwatch color={ctx.secondaryColor} label="Secondary" textOnLight={ctx.textOnLight} />
            <ColorSwatch color={ctx.accentColor} label="Accent" textOnLight={ctx.textOnLight} />
            <ColorSwatch color={ctx.bgDark} label="Dark" textOnLight={ctx.textOnLight} />
          </div>
        </div>

        {/* Components zone */}
        <div
          className="flex flex-col"
          style={{ padding: '2.5cqi', borderRadius: '1.2cqi', backgroundColor: 'rgba(0,0,0,0.025)', border: '1px solid rgba(0,0,0,0.05)' }}
        >
          <p
            className="uppercase mb-[1.5cqi]"
            style={{ color: ctx.textOnLight, opacity: 0.4, fontSize: 'clamp(7px, 0.8cqi, 10px)', letterSpacing: '0.15em' }}
          >
            Components
          </p>
          <div className="flex-1 flex flex-col justify-around gap-[1cqi]">
            {/* Buttons row */}
            <div className="flex items-center gap-[1cqi]">
              <div
                style={{
                  backgroundColor: ctx.primaryColor,
                  color: '#fff',
                  padding: '0.7cqi 1.6cqi',
                  borderRadius: '0.6cqi',
                  fontFamily: bodyFont,
                  fontSize: 'clamp(8px, 0.95cqi, 12px)',
                  fontWeight: 600,
                }}
              >
                Get Started
              </div>
              <div
                style={{
                  backgroundColor: 'transparent',
                  color: ctx.primaryColor,
                  border: `1px solid ${ctx.primaryColor}`,
                  padding: '0.6cqi 1.5cqi',
                  borderRadius: '0.6cqi',
                  fontFamily: bodyFont,
                  fontSize: 'clamp(8px, 0.95cqi, 12px)',
                  fontWeight: 600,
                }}
              >
                Learn More
              </div>
            </div>
            {/* Input */}
            <div
              className="flex items-center"
              style={{
                border: '1px solid rgba(0,0,0,0.12)',
                borderRadius: '0.6cqi',
                padding: '0.7cqi 1cqi',
                fontFamily: bodyFont,
                fontSize: 'clamp(8px, 0.95cqi, 12px)',
                color: ctx.textOnLight,
                opacity: 0.55,
              }}
            >
              <span>Enter your email…</span>
            </div>
            {/* Mini card */}
            <div
              className="flex items-center gap-[1cqi]"
              style={{
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '0.8cqi',
                padding: '0.8cqi 1cqi',
                backgroundColor: '#fff',
              }}
            >
              <div
                className="rounded-full"
                style={{ width: '1.6cqi', height: '1.6cqi', backgroundColor: ctx.primaryColor }}
              />
              <div className="flex-1">
                <div
                  style={{
                    fontFamily: headFont,
                    fontWeight: 600,
                    color: ctx.textOnLight,
                    fontSize: 'clamp(8px, 0.95cqi, 12px)',
                  }}
                >
                  Card Title
                </div>
                <div
                  style={{
                    color: ctx.textOnLight,
                    opacity: 0.5,
                    fontSize: 'clamp(7px, 0.8cqi, 10px)',
                  }}
                >
                  Supporting copy
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Logo lockup zone */}
        <div
          className="grid grid-cols-2 gap-[1cqi]"
          style={{ padding: '2.5cqi', borderRadius: '1.2cqi', backgroundColor: 'rgba(0,0,0,0.025)', border: '1px solid rgba(0,0,0,0.05)' }}
        >
          {/* Light card */}
          <div
            className="relative flex items-center justify-center"
            style={{ backgroundColor: '#fff', borderRadius: '0.8cqi', border: '1px solid rgba(0,0,0,0.06)' }}
          >
            <p
              className="absolute uppercase"
              style={{ top: '0.8cqi', left: '0.8cqi', fontSize: 'clamp(6px, 0.7cqi, 9px)', letterSpacing: '0.15em', color: ctx.textOnLight, opacity: 0.4 }}
            >
              On Light
            </p>
            {ctx.logoUrl ? (
              <img src={ctx.logoUrl} alt="" className="object-contain" style={{ maxWidth: '60%', maxHeight: '60%' }} />
            ) : (
              <div
                style={{ color: ctx.primaryColor, fontFamily: headFont, fontWeight: 800, fontSize: 'clamp(16px, 2.2cqi, 28px)' }}
              >
                {ctx.brandName}
              </div>
            )}
          </div>
          {/* Dark card */}
          <div
            className="relative flex items-center justify-center"
            style={{ backgroundColor: ctx.bgDark, borderRadius: '0.8cqi' }}
          >
            <p
              className="absolute uppercase"
              style={{ top: '0.8cqi', left: '0.8cqi', fontSize: 'clamp(6px, 0.7cqi, 9px)', letterSpacing: '0.15em', color: ctx.textOnDark, opacity: 0.4 }}
            >
              On Dark
            </p>
            {ctx.logoUrl ? (
              <img
                src={ctx.logoUrl}
                alt=""
                className="object-contain"
                style={{ maxWidth: '60%', maxHeight: '60%', filter: 'brightness(0) invert(1)' }}
              />
            ) : (
              <div
                style={{ color: '#fff', fontFamily: headFont, fontWeight: 800, fontSize: 'clamp(16px, 2.2cqi, 28px)' }}
              >
                {ctx.brandName}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorSwatch({ color, label, textOnLight }: { color: string; label: string; textOnLight: string }) {
  return (
    <div className="flex flex-col">
      <div className="flex-1 rounded-[0.6cqi] min-h-[3.5cqi]" style={{ backgroundColor: color, border: '1px solid rgba(0,0,0,0.06)' }} />
      <div className="mt-[0.5cqi] flex items-center justify-between">
        <span style={{ color: textOnLight, opacity: 0.6, fontSize: 'clamp(7px, 0.8cqi, 10px)', fontWeight: 600 }}>{label}</span>
        <span className="font-mono uppercase" style={{ color: textOnLight, opacity: 0.4, fontSize: 'clamp(6px, 0.7cqi, 9px)' }}>
          {color}
        </span>
      </div>
    </div>
  );
}

// ── 2. Brand Hero Slide ───────────────────────────────────

export function BrandHeroSlide({ ctx }: { ctx: BrandUiContext }) {
  const headFont = ctx.headingFont || 'inherit';
  const bodyFont = ctx.bodyFont || 'inherit';

  return (
    <div className={`${slideClass}`} style={{ backgroundColor: ctx.bgLight }}>
      {/* Soft brand-tinted background */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 80% 20%, ${ctx.secondaryColor}18 0%, transparent 55%), radial-gradient(ellipse at 10% 90%, ${ctx.primaryColor}10 0%, transparent 50%)`,
        }}
      />

      {/* Top nav */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between"
        style={{ padding: '2.5cqi 5cqi' }}
      >
        <div className="flex items-center gap-[1.2cqi]">
          {ctx.logoUrl ? (
            <img src={ctx.logoUrl} alt="" className="object-contain" style={{ height: '2.4cqi', width: 'auto' }} />
          ) : (
            <div
              className="rounded-md flex items-center justify-center"
              style={{ width: '2.4cqi', height: '2.4cqi', backgroundColor: ctx.primaryColor, color: '#fff', fontFamily: headFont, fontWeight: 800, fontSize: 'clamp(10px, 1.2cqi, 14px)' }}
            >
              {ctx.brandName.charAt(0)}
            </div>
          )}
          <span style={{ color: ctx.textOnLight, fontFamily: headFont, fontWeight: 700, fontSize: 'clamp(11px, 1.3cqi, 16px)' }}>
            {ctx.brandName}
          </span>
        </div>
        <div className="flex items-center gap-[2.5cqi]" style={{ fontFamily: bodyFont, fontSize: 'clamp(8px, 1cqi, 12px)' }}>
          {['Product', 'Features', 'Pricing', 'Company'].map((item) => (
            <span key={item} style={{ color: ctx.textOnLight, opacity: 0.7 }}>
              {item}
            </span>
          ))}
          <div
            style={{
              backgroundColor: ctx.primaryColor,
              color: '#fff',
              padding: '0.7cqi 1.5cqi',
              borderRadius: '0.5cqi',
              fontWeight: 600,
            }}
          >
            Sign Up
          </div>
        </div>
      </div>

      {/* Hero content */}
      <div className="absolute inset-0 flex items-center" style={{ padding: '0 5cqi' }}>
        <div className="flex-1 max-w-[60%]">
          <p
            className="uppercase mb-[1.2cqi]"
            style={{
              color: ctx.primaryColor,
              fontFamily: bodyFont,
              fontWeight: 600,
              fontSize: 'clamp(9px, 1.05cqi, 13px)',
              letterSpacing: '0.18em',
            }}
          >
            Introducing {ctx.brandName}
          </p>
          <h1
            style={{
              color: ctx.textOnLight,
              fontFamily: headFont,
              fontWeight: 800,
              fontSize: 'clamp(32px, 5.4cqi, 72px)',
              lineHeight: 1.02,
              letterSpacing: '-0.02em',
            }}
          >
            Build something
            <br />
            <span style={{ color: ctx.primaryColor }}>worth remembering.</span>
          </h1>
          <p
            className="mt-[1.8cqi] max-w-[80%]"
            style={{
              color: ctx.textOnLight,
              opacity: 0.6,
              fontFamily: bodyFont,
              fontSize: 'clamp(11px, 1.35cqi, 17px)',
              lineHeight: 1.5,
            }}
          >
            A focused, opinionated platform that gives teams the tools they need — and nothing they do not. Ship faster, stay aligned, do better work.
          </p>
          <div className="mt-[2.5cqi] flex items-center gap-[1.2cqi]">
            <div
              style={{
                backgroundColor: ctx.primaryColor,
                color: '#fff',
                padding: '1.1cqi 2cqi',
                borderRadius: '0.6cqi',
                fontFamily: bodyFont,
                fontWeight: 600,
                fontSize: 'clamp(10px, 1.2cqi, 15px)',
                boxShadow: `0 4px 16px -4px ${ctx.primaryColor}55`,
              }}
            >
              Get Started
            </div>
            <div
              style={{
                color: ctx.textOnLight,
                opacity: 0.7,
                fontFamily: bodyFont,
                fontSize: 'clamp(10px, 1.2cqi, 15px)',
                fontWeight: 600,
              }}
            >
              Watch demo →
            </div>
          </div>
        </div>

        {/* Decorative shapes */}
        <div className="relative" style={{ width: '32%', height: '60%' }}>
          <div
            className="absolute rounded-full"
            style={{
              top: '8%',
              right: '20%',
              width: '60%',
              aspectRatio: '1',
              background: `linear-gradient(135deg, ${ctx.primaryColor}, ${ctx.secondaryColor})`,
              boxShadow: `0 16px 60px -12px ${ctx.primaryColor}40`,
            }}
          />
          <div
            className="absolute"
            style={{
              bottom: '4%',
              right: '0%',
              width: '52%',
              height: '38%',
              backgroundColor: ctx.bgDark,
              borderRadius: '1.2cqi',
              transform: 'rotate(-6deg)',
              border: `1px solid ${ctx.accentColor}40`,
            }}
          >
            <div style={{ padding: '1.5cqi' }}>
              <div className="rounded-full" style={{ width: '0.8cqi', height: '0.8cqi', backgroundColor: ctx.accentColor }} />
              <div className="mt-[0.8cqi] h-[0.4cqi] rounded-full bg-white/30" style={{ width: '60%' }} />
              <div className="mt-[0.4cqi] h-[0.4cqi] rounded-full bg-white/15" style={{ width: '40%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <p
        className="absolute bottom-[2.5cqi] left-[5cqi] uppercase"
        style={{
          color: ctx.textOnLight,
          opacity: 0.3,
          fontSize: 'clamp(7px, 0.85cqi, 10px)',
          letterSpacing: '0.2em',
          fontFamily: bodyFont,
        }}
      >
        Brand In Use · Hero Section
      </p>
    </div>
  );
}

// ── 3. Brand Dashboard Slide ──────────────────────────────

export function BrandDashboardSlide({ ctx }: { ctx: BrandUiContext }) {
  const headFont = ctx.headingFont || 'inherit';
  const bodyFont = ctx.bodyFont || 'inherit';

  return (
    <div className={`${slideClass} flex`} style={{ backgroundColor: '#F4F5F7', fontFamily: bodyFont }}>
      {/* Sidebar */}
      <div
        className="flex flex-col shrink-0"
        style={{ width: '18%', backgroundColor: ctx.bgDark, padding: '2.5cqi 1.5cqi' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-[0.8cqi] mb-[3cqi]">
          {ctx.logoUrl ? (
            <img
              src={ctx.logoUrl}
              alt=""
              className="object-contain"
              style={{ height: '1.8cqi', width: 'auto', filter: 'brightness(0) invert(1)' }}
            />
          ) : (
            <div
              className="rounded-md flex items-center justify-center"
              style={{ width: '1.8cqi', height: '1.8cqi', backgroundColor: ctx.primaryColor, color: '#fff', fontWeight: 800, fontSize: 'clamp(8px, 1cqi, 12px)', fontFamily: headFont }}
            >
              {ctx.brandName.charAt(0)}
            </div>
          )}
          <span
            style={{
              color: ctx.textOnDark,
              fontFamily: headFont,
              fontWeight: 700,
              fontSize: 'clamp(9px, 1.1cqi, 13px)',
            }}
          >
            {ctx.brandName}
          </span>
        </div>

        {/* Nav items */}
        <div className="flex flex-col gap-[0.4cqi]">
          {[
            { label: 'Overview', active: true },
            { label: 'Analytics', active: false },
            { label: 'Customers', active: false },
            { label: 'Reports', active: false },
            { label: 'Settings', active: false },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-[0.8cqi]"
              style={{
                padding: '0.9cqi 1cqi',
                borderRadius: '0.5cqi',
                backgroundColor: item.active ? `${ctx.primaryColor}25` : 'transparent',
                fontSize: 'clamp(7px, 0.9cqi, 11px)',
                color: item.active ? ctx.primaryColor : ctx.textOnDark,
                opacity: item.active ? 1 : 0.55,
                fontWeight: item.active ? 600 : 500,
                borderLeft: item.active ? `2px solid ${ctx.primaryColor}` : '2px solid transparent',
              }}
            >
              <div
                className="rounded"
                style={{
                  width: '0.8cqi',
                  height: '0.8cqi',
                  backgroundColor: 'currentColor',
                  opacity: item.active ? 1 : 0.5,
                }}
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto">
          <div
            className="flex items-center gap-[0.8cqi]"
            style={{ padding: '1cqi', borderTop: `1px solid ${ctx.textOnDark}15`, paddingTop: '1.5cqi' }}
          >
            <div
              className="rounded-full"
              style={{ width: '1.6cqi', height: '1.6cqi', backgroundColor: ctx.accentColor }}
            />
            <div>
              <div style={{ color: ctx.textOnDark, fontSize: 'clamp(7px, 0.85cqi, 10px)', fontWeight: 600 }}>
                Team Member
              </div>
              <div style={{ color: ctx.textOnDark, opacity: 0.4, fontSize: 'clamp(6px, 0.75cqi, 9px)' }}>
                Admin
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div
          className="flex items-center justify-between shrink-0"
          style={{ padding: '1.8cqi 2.5cqi', borderBottom: '1px solid rgba(0,0,0,0.07)', backgroundColor: '#fff' }}
        >
          <div>
            <p
              style={{
                color: '#1a1a1a',
                opacity: 0.4,
                fontSize: 'clamp(7px, 0.85cqi, 10px)',
                fontWeight: 500,
              }}
            >
              Dashboard / Overview
            </p>
            <h2
              style={{
                color: '#1a1a1a',
                fontFamily: headFont,
                fontWeight: 700,
                fontSize: 'clamp(13px, 1.7cqi, 22px)',
                marginTop: '0.2cqi',
                letterSpacing: '-0.01em',
              }}
            >
              Welcome back
            </h2>
          </div>
          <div className="flex items-center gap-[1.2cqi]">
            <div
              className="flex items-center gap-[0.8cqi]"
              style={{
                backgroundColor: '#F4F5F7',
                padding: '0.7cqi 1.2cqi',
                borderRadius: '0.5cqi',
                fontSize: 'clamp(7px, 0.85cqi, 10px)',
                color: '#1a1a1a',
                opacity: 0.6,
              }}
            >
              <div className="rounded-full bg-current" style={{ width: '0.7cqi', height: '0.7cqi', opacity: 0.4 }} />
              <span>Search…</span>
            </div>
            <div
              className="rounded-full"
              style={{ width: '2cqi', height: '2cqi', backgroundColor: ctx.primaryColor }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden" style={{ padding: '2cqi 2.5cqi' }}>
          {/* KPI cards */}
          <div className="grid grid-cols-4 gap-[1.2cqi] mb-[2cqi]">
            {[
              { label: 'Revenue', value: '$48.2K', delta: '+12%', color: ctx.primaryColor },
              { label: 'Users', value: '12,840', delta: '+5%', color: ctx.secondaryColor },
              { label: 'Sessions', value: '38.4K', delta: '+18%', color: ctx.accentColor },
              { label: 'Conversion', value: '4.2%', delta: '+0.6%', color: ctx.primaryColor },
            ].map((kpi) => (
              <div
                key={kpi.label}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '0.8cqi',
                  padding: '1.4cqi',
                  border: '1px solid rgba(0,0,0,0.05)',
                }}
              >
                <p
                  className="uppercase"
                  style={{ color: '#1a1a1a', opacity: 0.4, fontSize: 'clamp(6px, 0.75cqi, 9px)', letterSpacing: '0.1em', fontWeight: 600 }}
                >
                  {kpi.label}
                </p>
                <p
                  className="mt-[0.5cqi]"
                  style={{
                    color: '#1a1a1a',
                    fontFamily: headFont,
                    fontSize: 'clamp(13px, 1.7cqi, 22px)',
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {kpi.value}
                </p>
                <p
                  className="mt-[0.3cqi]"
                  style={{ color: kpi.color, fontSize: 'clamp(7px, 0.85cqi, 10px)', fontWeight: 600 }}
                >
                  {kpi.delta} this week
                </p>
              </div>
            ))}
          </div>

          {/* Chart + table row */}
          <div className="grid grid-cols-3 gap-[1.2cqi]" style={{ height: 'calc(100% - 9cqi)' }}>
            {/* Chart card */}
            <div
              className="col-span-2 flex flex-col"
              style={{ backgroundColor: '#fff', borderRadius: '0.8cqi', padding: '1.4cqi', border: '1px solid rgba(0,0,0,0.05)' }}
            >
              <div className="flex items-center justify-between">
                <p
                  style={{
                    color: '#1a1a1a',
                    fontFamily: headFont,
                    fontSize: 'clamp(9px, 1.1cqi, 13px)',
                    fontWeight: 600,
                  }}
                >
                  Performance
                </p>
                <span style={{ color: '#1a1a1a', opacity: 0.4, fontSize: 'clamp(6px, 0.75cqi, 9px)' }}>
                  Last 7 days
                </span>
              </div>
              <div className="flex-1 flex items-end gap-[0.6cqi] mt-[1cqi]">
                {[42, 68, 55, 80, 72, 90, 64].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col gap-[0.2cqi]">
                    <div
                      className="rounded-t-sm"
                      style={{
                        height: `${h}%`,
                        background: `linear-gradient(to top, ${ctx.primaryColor}, ${ctx.secondaryColor})`,
                        opacity: i === 5 ? 1 : 0.7,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-[0.6cqi]">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <span key={i} style={{ color: '#1a1a1a', opacity: 0.4, fontSize: 'clamp(6px, 0.75cqi, 9px)' }}>
                    {d}
                  </span>
                ))}
              </div>
            </div>

            {/* Activity card */}
            <div
              className="flex flex-col"
              style={{ backgroundColor: '#fff', borderRadius: '0.8cqi', padding: '1.4cqi', border: '1px solid rgba(0,0,0,0.05)' }}
            >
              <p
                style={{
                  color: '#1a1a1a',
                  fontFamily: headFont,
                  fontSize: 'clamp(9px, 1.1cqi, 13px)',
                  fontWeight: 600,
                }}
              >
                Recent Activity
              </p>
              <div className="flex-1 flex flex-col justify-around mt-[1cqi]">
                {[
                  { name: 'Acme Co', amount: '+$420', color: ctx.primaryColor },
                  { name: 'Stellar', amount: '+$180', color: ctx.secondaryColor },
                  { name: 'Nimbus', amount: '+$92', color: ctx.accentColor },
                  { name: 'Quill', amount: '+$48', color: ctx.primaryColor },
                ].map((row) => (
                  <div key={row.name} className="flex items-center gap-[0.8cqi]">
                    <div
                      className="rounded-full"
                      style={{ width: '1.4cqi', height: '1.4cqi', backgroundColor: row.color }}
                    />
                    <div className="flex-1 flex justify-between items-center">
                      <span
                        style={{
                          color: '#1a1a1a',
                          fontSize: 'clamp(7px, 0.9cqi, 11px)',
                          fontWeight: 500,
                        }}
                      >
                        {row.name}
                      </span>
                      <span
                        style={{
                          color: '#1a1a1a',
                          opacity: 0.6,
                          fontSize: 'clamp(7px, 0.85cqi, 10px)',
                          fontFamily: headFont,
                          fontWeight: 600,
                        }}
                      >
                        {row.amount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Builder Helpers ───────────────────────────────────────

/** Resolve a context for the Logo Presentation Simple flow */
function ctxFromLogoData(data: LogoPresentationData): BrandUiContext {
  const firstConcept = data.concepts[0];
  return {
    brandName: data.brandName,
    logoUrl: firstConcept?.logoUrl || undefined,
    primaryColor: data.primaryColor,
    secondaryColor: firstConcept?.colorAccent || data.primaryColor,
    accentColor: firstConcept?.colorAccent || data.primaryColor,
    headingFont: '"Plus Jakarta Sans", "Inter", sans-serif',
    bodyFont: '"Inter", sans-serif',
    bgDark: '#0A0A0F',
    textOnDark: '#F5F5F5',
    bgLight: '#FFFFFF',
    textOnLight: '#0A0A0F',
  };
}

/** Resolve a context for the Brand Guide flow using brand + active style */
function ctxFromBrandStyle(brand: Brand, style: PresentationStyle): BrandUiContext {
  return {
    brandName: brand.name,
    logoUrl: brand.logo,
    primaryColor: brand.primaryColor,
    secondaryColor: brand.secondaryColor || brand.primaryColor,
    accentColor: style.bgAccent === 'brand' ? brand.primaryColor : style.bgAccent,
    headingFont: brand.fonts?.primary ? `"${brand.fonts.primary}", sans-serif` : undefined,
    bodyFont: brand.fonts?.secondary ? `"${brand.fonts.secondary}", sans-serif` : brand.fonts?.primary ? `"${brand.fonts.primary}", sans-serif` : undefined,
    bgDark: style.bgDark,
    textOnDark: style.textOnDark,
    bgLight: style.bgLight,
    textOnLight: style.textOnLight,
  };
}

/**
 * Build the 4-slide Brand UI/UX section for the Logo Presentation Simple template.
 * Returns: [divider, design system, hero, dashboard]
 */
export function buildBrandUiSlidesForLogo(data: LogoPresentationData): SlideData[] {
  const ctx = ctxFromLogoData(data);
  return [
    {
      id: 'brand-ui-divider',
      name: 'Brand UI/UX',
      render: (_p: SlideRenderProps) => (
        <BrandUiSectionDivider ctx={ctx} sectionNumber="05" label="Brand UI/UX" />
      ),
    },
    {
      id: 'brand-ui-design-system',
      name: 'Design System',
      render: (_p: SlideRenderProps) => <BrandDesignSystemSlide ctx={ctx} />,
    },
    {
      id: 'brand-ui-hero',
      name: 'Brand Hero',
      render: (_p: SlideRenderProps) => <BrandHeroSlide ctx={ctx} />,
    },
    {
      id: 'brand-ui-dashboard',
      name: 'Brand Dashboard',
      render: (_p: SlideRenderProps) => <BrandDashboardSlide ctx={ctx} />,
    },
  ];
}

/**
 * Build the 4-slide Brand UI/UX section for the Brand Guide template.
 * Uses the active PresentationStyle so the section adopts the right
 * background, fonts, and colors when the user switches styles.
 * Returns: [divider, design system, hero, dashboard]
 */
export function buildBrandUiSlidesForBrandGuide(
  brand: Brand,
  style: PresentationStyle,
  _overrides?: SlideOverridesMap,
): SlideData[] {
  return [
    {
      id: 'brand-ui-divider',
      name: 'Brand UI/UX',
      render: (rp: SlideRenderProps) => (
        <BrandUiSectionDivider ctx={ctxFromBrandStyle(rp.brand, style)} sectionNumber="05" label="Brand UI/UX" />
      ),
    },
    {
      id: 'brand-ui-design-system',
      name: 'Design System',
      render: (rp: SlideRenderProps) => <BrandDesignSystemSlide ctx={ctxFromBrandStyle(rp.brand, style)} />,
    },
    {
      id: 'brand-ui-hero',
      name: 'Brand Hero',
      render: (rp: SlideRenderProps) => <BrandHeroSlide ctx={ctxFromBrandStyle(rp.brand, style)} />,
    },
    {
      id: 'brand-ui-dashboard',
      name: 'Brand Dashboard',
      render: (rp: SlideRenderProps) => <BrandDashboardSlide ctx={ctxFromBrandStyle(rp.brand, style)} />,
    },
  ];
}
