/**
 * OutputRenderer
 * ─────────────────────────────────────────────────────────────────────────
 * Switches over `outputType` and renders the right template, all using the
 * same BrandTokens + AI copy. Every template here makes ZERO design choices
 * outside the token system — that's how brand consistency is enforced.
 */

import type { CSSProperties } from 'react';
import { TemplateFrame, BrandLogoMark } from './TemplateFrame';
import type { BrandTokens } from '../engine/brandTokens';
import type { AiCopyContent } from '../providers/types';
import { getOutputSpec, type OutputTypeId } from '../registry/outputSpecs';

interface OutputRendererProps {
  outputType: OutputTypeId;
  tokens: BrandTokens;
  content: AiCopyContent;
  noScale?: boolean;
}

export function OutputRenderer({ outputType, tokens, content, noScale }: OutputRendererProps) {
  const spec = getOutputSpec(outputType);
  const common = { tokens, content, width: spec.width, height: spec.height, noScale };

  switch (outputType) {
    case 'social_post_square':
    case 'social_post_portrait':
      return <SocialPost {...common} />;
    case 'social_carousel_3':
      return <SocialCarousel {...common} />;
    case 'website_hero':
      return <WebsiteHero {...common} />;
    case 'website_features':
      return <WebsiteFeatures {...common} />;
    case 'guideline_cover':
      return <GuidelineCover {...common} />;
    case 'guideline_color_page':
      return <GuidelineColorPage {...common} />;
    case 'guideline_typography_page':
      return <GuidelineTypographyPage {...common} />;
    case 'mockup_business_card':
      return <BusinessCardMockup {...common} />;
    case 'presentation_slide':
      return <PresentationSlide {...common} />;
    case 'digital_ad':
      return <DigitalAd {...common} />;
    default:
      return null;
  }
}

interface BaseProps {
  tokens: BrandTokens;
  content: AiCopyContent;
  width: number;
  height: number;
  noScale?: boolean;
}

// ─── Social Post ────────────────────────────────────────────────────

function SocialPost({ tokens, content, width, height, noScale }: BaseProps) {
  // Brand-led background — primary color block with a subtle accent shape.
  const bg = tokens.colors.primary;
  const fg = tokens.colors.onPrimary;
  return (
    <TemplateFrame tokens={tokens} width={width} height={height} background={bg} noScale={noScale}>
      <div style={{ width: '100%', height: '100%', position: 'relative', padding: 80, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
        <Decoration tokens={tokens} variant="orbit" bg={bg} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <BrandLogoMark tokens={tokens} background={bg} size={56} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontFamily: tokens.typography.headingFamily,
            fontWeight: 800,
            color: fg,
            fontSize: width * 0.075,
            lineHeight: 1.05,
            letterSpacing: tokens.typography.letterSpacingHeading,
            margin: 0,
            maxWidth: '90%',
          }}>{content.headline ?? tokens.brandName}</h1>
          {content.subheadline && (
            <p style={{
              fontFamily: tokens.typography.bodyFamily,
              color: fg,
              opacity: 0.85,
              fontSize: width * 0.022,
              lineHeight: 1.4,
              marginTop: 24,
              maxWidth: '85%',
            }}>{content.subheadline}</p>
          )}
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {content.cta ? (
            <Pill text={content.cta} bg={tokens.colors.accent} fg={tokens.colors.onAccent} fontFamily={tokens.typography.headingFamily} radius={tokens.ui.radius} />
          ) : <span />}
          {content.hashtags && content.hashtags.length > 0 && (
            <span style={{ color: fg, opacity: 0.6, fontSize: width * 0.018, fontFamily: tokens.typography.bodyFamily }}>
              {content.hashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ')}
            </span>
          )}
        </div>
      </div>
    </TemplateFrame>
  );
}

// ─── Social Carousel ────────────────────────────────────────────────

function SocialCarousel({ tokens, content, width, height, noScale }: BaseProps) {
  const slides = content.slides && content.slides.length > 0
    ? content.slides.slice(0, 3)
    : [
        { headline: content.headline ?? tokens.brandName, body: content.subheadline },
        { headline: 'How it works', body: 'Same brand. Every surface.' },
        { headline: content.cta ?? 'Get started', body: undefined, cta: content.cta },
      ];
  // Three side-by-side panels in one frame so the consistency reads instantly.
  const panelWidth = width / 3;
  const palettes: Array<{ bg: string; fg: string }> = [
    { bg: tokens.colors.primary, fg: tokens.colors.onPrimary },
    { bg: tokens.colors.surface, fg: tokens.colors.foreground },
    { bg: tokens.colors.accent, fg: tokens.colors.onAccent },
  ];
  return (
    <TemplateFrame tokens={tokens} width={width} height={height} background={tokens.colors.surface} noScale={noScale}>
      <div style={{ width: '100%', height: '100%', display: 'flex' }}>
        {slides.map((s, i) => {
          const p = palettes[i] ?? palettes[0];
          return (
            <div key={i} style={{
              width: panelWidth,
              height: '100%',
              background: p.bg,
              padding: 48,
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderRight: i < slides.length - 1 ? `1px solid ${tokens.colors.border}` : 'none',
              position: 'relative',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <BrandLogoMark tokens={tokens} background={p.bg} size={32} />
                <span style={{ color: p.fg, opacity: 0.6, fontFamily: tokens.typography.bodyFamily, fontSize: 18, fontWeight: 600 }}>
                  {i + 1} / {slides.length}
                </span>
              </div>
              <div>
                <h2 style={{
                  fontFamily: tokens.typography.headingFamily,
                  color: p.fg,
                  fontSize: panelWidth * 0.13,
                  lineHeight: 1.05,
                  fontWeight: 800,
                  letterSpacing: tokens.typography.letterSpacingHeading,
                  margin: 0,
                }}>{s.headline}</h2>
                {s.body && (
                  <p style={{
                    fontFamily: tokens.typography.bodyFamily,
                    color: p.fg,
                    opacity: 0.85,
                    fontSize: panelWidth * 0.045,
                    lineHeight: 1.4,
                    marginTop: 20,
                  }}>{s.body}</p>
                )}
              </div>
              <div>
                {s.cta && (
                  <Pill text={s.cta} bg={i === 1 ? tokens.colors.primary : tokens.colors.surface} fg={i === 1 ? tokens.colors.onPrimary : tokens.colors.foreground} fontFamily={tokens.typography.headingFamily} radius={tokens.ui.radius} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </TemplateFrame>
  );
}

// ─── Website Hero ───────────────────────────────────────────────────

function WebsiteHero({ tokens, content, width, height, noScale }: BaseProps) {
  return (
    <TemplateFrame tokens={tokens} width={width} height={height} background={tokens.colors.surface} noScale={noScale}>
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        {/* Top nav */}
        <div style={{ padding: '40px 80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${tokens.colors.border}` }}>
          <BrandLogoMark tokens={tokens} background={tokens.colors.surface} size={36} />
          <div style={{ display: 'flex', gap: 32, color: tokens.colors.foregroundMuted, fontFamily: tokens.typography.bodyFamily, fontSize: 18 }}>
            <span>Product</span><span>Pricing</span><span>Docs</span><span>Company</span>
          </div>
          <Pill text="Sign in" bg={tokens.colors.primary} fg={tokens.colors.onPrimary} fontFamily={tokens.typography.headingFamily} radius={tokens.ui.radius} />
        </div>
        {/* Hero */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 1fr', alignItems: 'center', padding: '60px 80px', gap: 60 }}>
          <div>
            <span style={{ display: 'inline-block', padding: '8px 16px', borderRadius: 999, background: tokens.colors.surfaceMuted, color: tokens.colors.foreground, fontFamily: tokens.typography.bodyFamily, fontSize: 16, fontWeight: 600, marginBottom: 24 }}>
              {tokens.voice.descriptors[0] ?? 'New'} · {tokens.brandName}
            </span>
            <h1 style={{
              fontFamily: tokens.typography.headingFamily,
              fontWeight: 800,
              fontSize: 88,
              lineHeight: 1.02,
              letterSpacing: tokens.typography.letterSpacingHeading,
              color: tokens.colors.foreground,
              margin: 0,
            }}>{content.headline ?? tokens.brandName}</h1>
            <p style={{
              fontFamily: tokens.typography.bodyFamily,
              color: tokens.colors.foregroundMuted,
              fontSize: 22,
              lineHeight: 1.5,
              marginTop: 24,
              maxWidth: 560,
            }}>{content.subheadline ?? `One brand system. Every surface. Designed for ${tokens.voice.audience}.`}</p>
            <div style={{ display: 'flex', gap: 16, marginTop: 36 }}>
              <Pill text={content.cta ?? 'Get started'} bg={tokens.colors.primary} fg={tokens.colors.onPrimary} fontFamily={tokens.typography.headingFamily} radius={tokens.ui.radius} large />
              <Pill text="Learn more" bg={tokens.colors.surface} fg={tokens.colors.foreground} fontFamily={tokens.typography.headingFamily} radius={tokens.ui.radius} large border={tokens.colors.border} />
            </div>
          </div>
          <HeroVisual tokens={tokens} />
        </div>
      </div>
    </TemplateFrame>
  );
}

function HeroVisual({ tokens }: { tokens: BrandTokens }) {
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3' }}>
      <div style={{ position: 'absolute', inset: 0, background: tokens.colors.primary, borderRadius: tokens.ui.radiusLarge }} />
      <div style={{ position: 'absolute', inset: '15% -10% 15% 30%', background: tokens.colors.accent, borderRadius: tokens.ui.radiusLarge, opacity: 0.92 }} />
      <div style={{ position: 'absolute', inset: '50% 30% -10% 50%', background: tokens.colors.secondary, borderRadius: '50%', opacity: 0.85 }} />
    </div>
  );
}

// ─── Website Features ───────────────────────────────────────────────

function WebsiteFeatures({ tokens, content, width, height, noScale }: BaseProps) {
  const features = content.features && content.features.length >= 3
    ? content.features.slice(0, 3)
    : [
        { title: 'Brand-locked', description: 'Every surface renders inside your brand system. No drift across outputs.' },
        { title: 'AI-assisted', description: 'Copy and ideation generated against your tone, audience, and voice.' },
        { title: 'Production-ready', description: 'Export, share, and reuse without leaving the studio.' },
      ];
  return (
    <TemplateFrame tokens={tokens} width={width} height={height} background={tokens.colors.surfaceMuted} noScale={noScale}>
      <div style={{ width: '100%', height: '100%', padding: '80px 100px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <BrandLogoMark tokens={tokens} background={tokens.colors.surfaceMuted} size={32} />
          <span style={{ color: tokens.colors.foregroundMuted, fontFamily: tokens.typography.bodyFamily, fontSize: 16, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Why {tokens.brandName}</span>
        </div>
        <h2 style={{
          fontFamily: tokens.typography.headingFamily,
          fontWeight: 800,
          fontSize: 64,
          letterSpacing: tokens.typography.letterSpacingHeading,
          color: tokens.colors.foreground,
          margin: '40px 0 16px',
          maxWidth: '70%',
        }}>{content.headline ?? `One brand. Every output.`}</h2>
        {content.subheadline && (
          <p style={{
            fontFamily: tokens.typography.bodyFamily,
            fontSize: 22,
            color: tokens.colors.foregroundMuted,
            margin: 0,
            maxWidth: '60%',
          }}>{content.subheadline}</p>
        )}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, marginTop: 60 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: tokens.colors.surface,
              borderRadius: tokens.ui.radiusLarge,
              padding: 36,
              border: `1px solid ${tokens.colors.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}>
              <div style={{ width: 56, height: 56, borderRadius: tokens.ui.radius, background: tokens.colors.primary, color: tokens.colors.onPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: tokens.typography.headingFamily, fontWeight: 800, fontSize: 28 }}>0{i + 1}</div>
              <h3 style={{ fontFamily: tokens.typography.headingFamily, fontWeight: 700, fontSize: 26, margin: 0, color: tokens.colors.foreground }}>{f.title}</h3>
              <p style={{ fontFamily: tokens.typography.bodyFamily, fontSize: 18, lineHeight: 1.5, margin: 0, color: tokens.colors.foregroundMuted }}>{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </TemplateFrame>
  );
}

// ─── Guideline Cover ────────────────────────────────────────────────

function GuidelineCover({ tokens, content, width, height, noScale }: BaseProps) {
  const bg = tokens.colors.foreground;
  const fg = tokens.colors.surface;
  return (
    <TemplateFrame tokens={tokens} width={width} height={height} background={bg} noScale={noScale}>
      <div style={{ width: '100%', height: '100%', padding: 80, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box', position: 'relative' }}>
        <Decoration tokens={tokens} variant="grid" bg={bg} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <BrandLogoMark tokens={tokens} background={bg} size={48} />
          <span style={{ color: fg, opacity: 0.6, fontFamily: tokens.typography.bodyFamily, fontSize: 18, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Brand Guidelines · v1</span>
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontFamily: tokens.typography.headingFamily,
            fontWeight: 800,
            color: fg,
            fontSize: 140,
            lineHeight: 0.95,
            letterSpacing: tokens.typography.letterSpacingHeading,
            margin: 0,
          }}>{content.headline ?? tokens.brandName}</h1>
          <p style={{
            fontFamily: tokens.typography.bodyFamily,
            color: fg,
            opacity: 0.7,
            fontSize: 28,
            lineHeight: 1.4,
            marginTop: 32,
            maxWidth: '70%',
          }}>{content.subheadline ?? `The complete brand system for ${tokens.brandName}.`}</p>
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 12 }}>
          {[tokens.colors.primary, tokens.colors.secondary, tokens.colors.accent].map((c, i) => (
            <div key={i} style={{ width: 80, height: 80, borderRadius: tokens.ui.radius, background: c }} />
          ))}
        </div>
      </div>
    </TemplateFrame>
  );
}

// ─── Guideline Color Page ───────────────────────────────────────────

function GuidelineColorPage({ tokens, width, height, noScale }: BaseProps) {
  const swatches = [
    { name: 'Primary', hex: tokens.colors.primary, on: tokens.colors.onPrimary, role: 'Brand voice. Hero surfaces.' },
    { name: 'Secondary', hex: tokens.colors.secondary, on: tokens.colors.onSecondary, role: 'Supporting surfaces.' },
    { name: 'Accent', hex: tokens.colors.accent, on: tokens.colors.onAccent, role: 'CTAs and emphasis.' },
    { name: 'Surface', hex: tokens.colors.surface, on: tokens.colors.foreground, role: 'Page background.' },
    { name: 'Surface muted', hex: tokens.colors.surfaceMuted, on: tokens.colors.foreground, role: 'Alternating zones.' },
    { name: 'Foreground', hex: tokens.colors.foreground, on: tokens.colors.surface, role: 'Body text.' },
  ];
  return (
    <TemplateFrame tokens={tokens} width={width} height={height} background={tokens.colors.surface} noScale={noScale}>
      <div style={{ padding: 80, height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <span style={{ color: tokens.colors.foregroundMuted, fontFamily: tokens.typography.bodyFamily, fontSize: 16, letterSpacing: '0.2em', textTransform: 'uppercase' }}>02 · Color System</span>
            <h2 style={{ fontFamily: tokens.typography.headingFamily, fontWeight: 800, fontSize: 56, letterSpacing: tokens.typography.letterSpacingHeading, margin: '12px 0 0' }}>The palette</h2>
          </div>
          <BrandLogoMark tokens={tokens} background={tokens.colors.surface} size={32} />
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {swatches.map((s) => (
            <div key={s.name} style={{ borderRadius: tokens.ui.radiusLarge, overflow: 'hidden', border: `1px solid ${tokens.colors.border}`, display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, background: s.hex, padding: 28, display: 'flex', alignItems: 'flex-end' }}>
                <span style={{ fontFamily: tokens.typography.headingFamily, fontWeight: 700, fontSize: 32, color: s.on }}>{s.name}</span>
              </div>
              <div style={{ background: tokens.colors.surface, padding: 24 }}>
                <div style={{ fontFamily: tokens.typography.bodyFamily, color: tokens.colors.foreground, fontSize: 18, fontWeight: 600 }}>{s.hex.toUpperCase()}</div>
                <div style={{ fontFamily: tokens.typography.bodyFamily, color: tokens.colors.foregroundMuted, fontSize: 14, marginTop: 4 }}>{s.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </TemplateFrame>
  );
}

// ─── Guideline Typography Page ──────────────────────────────────────

function GuidelineTypographyPage({ tokens, width, height, noScale }: BaseProps) {
  const samples = [
    { label: 'Display / 96', size: 96, weight: 800, family: tokens.typography.headingFamily, text: tokens.brandName },
    { label: 'H1 / 56', size: 56, weight: 700, family: tokens.typography.headingFamily, text: 'Brand systems that hold their shape.' },
    { label: 'H2 / 40', size: 40, weight: 700, family: tokens.typography.headingFamily, text: 'Designed end-to-end.' },
    { label: 'Body / 20', size: 20, weight: 400, family: tokens.typography.bodyFamily, text: 'Body text uses the secondary family for long-form readability. Line-height holds at 1.5 across surfaces.' },
    { label: 'Caption / 14', size: 14, weight: 500, family: tokens.typography.bodyFamily, text: 'CAPTIONS · METADATA · UTILITY' },
  ];
  return (
    <TemplateFrame tokens={tokens} width={width} height={height} background={tokens.colors.surface} noScale={noScale}>
      <div style={{ padding: 80, height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <span style={{ color: tokens.colors.foregroundMuted, fontFamily: tokens.typography.bodyFamily, fontSize: 16, letterSpacing: '0.2em', textTransform: 'uppercase' }}>03 · Typography</span>
            <h2 style={{ fontFamily: tokens.typography.headingFamily, fontWeight: 800, fontSize: 56, letterSpacing: tokens.typography.letterSpacingHeading, margin: '12px 0 0' }}>The type system</h2>
          </div>
          <BrandLogoMark tokens={tokens} background={tokens.colors.surface} size={32} />
        </div>
        <div style={{ display: 'flex', gap: 24, padding: 20, background: tokens.colors.surfaceMuted, borderRadius: tokens.ui.radius, marginBottom: 32 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: tokens.colors.foregroundMuted, fontSize: 14, fontFamily: tokens.typography.bodyFamily }}>Heading</div>
            <div style={{ color: tokens.colors.foreground, fontSize: 22, fontFamily: tokens.typography.headingFamily, fontWeight: 700, marginTop: 4 }}>{cleanFamily(tokens.typography.headingFamily)}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: tokens.colors.foregroundMuted, fontSize: 14, fontFamily: tokens.typography.bodyFamily }}>Body</div>
            <div style={{ color: tokens.colors.foreground, fontSize: 22, fontFamily: tokens.typography.bodyFamily, fontWeight: 500, marginTop: 4 }}>{cleanFamily(tokens.typography.bodyFamily)}</div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24, justifyContent: 'space-around' }}>
          {samples.map((s) => (
            <div key={s.label} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 24, alignItems: 'baseline' }}>
              <div style={{ color: tokens.colors.foregroundMuted, fontFamily: tokens.typography.bodyFamily, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ fontFamily: s.family, fontSize: s.size, fontWeight: s.weight, lineHeight: 1.1, color: tokens.colors.foreground, letterSpacing: s.size > 30 ? tokens.typography.letterSpacingHeading : 'normal' }}>{s.text}</div>
            </div>
          ))}
        </div>
      </div>
    </TemplateFrame>
  );
}

function cleanFamily(stack: string): string {
  return stack.split(',')[0].replace(/['"]/g, '').trim();
}

// ─── Business Card Mockup ───────────────────────────────────────────

function BusinessCardMockup({ tokens, content, width, height, noScale }: BaseProps) {
  const meta = content.meta ?? { name: 'Sara Chen', role: 'Brand Director', email: `hello@${tokens.slug}.com` };
  const cardW = 440;
  const cardH = 280;
  return (
    <TemplateFrame tokens={tokens} width={width} height={height} background={tokens.colors.surfaceMuted} noScale={noScale}>
      <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 80 }}>
        {/* Front (primary) */}
        <div style={{
          width: cardW, height: cardH,
          background: tokens.colors.primary,
          color: tokens.colors.onPrimary,
          borderRadius: 18,
          padding: 32,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 30px 60px -20px rgba(11, 11, 15, 0.4)',
          transform: 'rotate(-4deg)',
        }}>
          <BrandLogoMark tokens={tokens} background={tokens.colors.primary} size={28} />
          <div>
            <div style={{ fontFamily: tokens.typography.headingFamily, fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>{meta.name}</div>
            <div style={{ fontFamily: tokens.typography.bodyFamily, fontSize: 16, opacity: 0.8, marginTop: 6 }}>{meta.role}</div>
          </div>
        </div>
        {/* Back (light) */}
        <div style={{
          width: cardW, height: cardH,
          background: tokens.colors.surface,
          color: tokens.colors.foreground,
          borderRadius: 18,
          padding: 32,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          border: `1px solid ${tokens.colors.border}`,
          boxShadow: '0 30px 60px -20px rgba(11, 11, 15, 0.18)',
          transform: 'rotate(3deg)',
        }}>
          <div style={{ fontFamily: tokens.typography.headingFamily, fontSize: 22, fontWeight: 800, color: tokens.colors.primary }}>{tokens.brandName}</div>
          <div style={{ fontFamily: tokens.typography.bodyFamily, fontSize: 16, color: tokens.colors.foregroundMuted, lineHeight: 1.6 }}>
            {meta.email && <div>{meta.email}</div>}
            {meta.phone && <div>{meta.phone}</div>}
            <div>{tokens.slug}.com</div>
          </div>
        </div>
      </div>
    </TemplateFrame>
  );
}

// ─── Presentation Slide ─────────────────────────────────────────────

function PresentationSlide({ tokens, content, width, height, noScale }: BaseProps) {
  const bullets = content.bullets ?? ['Brand-locked rendering', 'AI-assisted copy', 'Consistent across surfaces'];
  return (
    <TemplateFrame tokens={tokens} width={width} height={height} background={tokens.colors.surface} noScale={noScale}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%' }}>
        <div style={{ padding: 96, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
          <BrandLogoMark tokens={tokens} background={tokens.colors.surface} size={40} />
          <div>
            <div style={{ fontFamily: tokens.typography.bodyFamily, color: tokens.colors.foregroundMuted, fontSize: 18, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 24 }}>Chapter 01</div>
            <h1 style={{ fontFamily: tokens.typography.headingFamily, fontWeight: 800, fontSize: 96, lineHeight: 1.0, letterSpacing: tokens.typography.letterSpacingHeading, color: tokens.colors.foreground, margin: 0 }}>{content.headline ?? `${tokens.brandName} system`}</h1>
            <p style={{ fontFamily: tokens.typography.bodyFamily, color: tokens.colors.foregroundMuted, fontSize: 24, lineHeight: 1.5, marginTop: 32, maxWidth: 640 }}>{content.body ?? 'A consistent brand operating system for every surface.'}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ height: 4, width: 56, background: i === 1 ? tokens.colors.primary : tokens.colors.border, borderRadius: 2 }} />
            ))}
          </div>
        </div>
        <div style={{ background: tokens.colors.primary, color: tokens.colors.onPrimary, padding: 96, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <Decoration tokens={tokens} variant="orbit" bg={tokens.colors.primary} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontFamily: tokens.typography.bodyFamily, fontSize: 18, opacity: 0.7, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 32 }}>Key points</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
              {bullets.slice(0, 4).map((b, i) => (
                <li key={i} style={{ fontFamily: tokens.typography.headingFamily, fontWeight: 600, fontSize: 36, lineHeight: 1.2, display: 'flex', gap: 24, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 20, opacity: 0.6, fontFamily: tokens.typography.bodyFamily, fontWeight: 700, minWidth: 32 }}>0{i + 1}</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </TemplateFrame>
  );
}

// ─── Digital Ad ─────────────────────────────────────────────────────

function DigitalAd({ tokens, content, width, height, noScale }: BaseProps) {
  return (
    <TemplateFrame tokens={tokens} width={width} height={height} background={tokens.colors.surface} noScale={noScale}>
      <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr auto', padding: 60, boxSizing: 'border-box', gap: 24 }}>
        <BrandLogoMark tokens={tokens} background={tokens.colors.surface} size={42} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1 style={{ fontFamily: tokens.typography.headingFamily, fontWeight: 800, fontSize: 86, lineHeight: 1.0, letterSpacing: tokens.typography.letterSpacingHeading, color: tokens.colors.foreground, margin: 0 }}>{content.headline ?? tokens.brandName}</h1>
          {content.subheadline && (
            <p style={{ fontFamily: tokens.typography.bodyFamily, color: tokens.colors.foregroundMuted, fontSize: 22, marginTop: 20 }}>{content.subheadline}</p>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pill text={content.cta ?? 'Get started'} bg={tokens.colors.primary} fg={tokens.colors.onPrimary} fontFamily={tokens.typography.headingFamily} radius={tokens.ui.radius} large />
          <span style={{ color: tokens.colors.foregroundMuted, fontFamily: tokens.typography.bodyFamily, fontSize: 16 }}>{tokens.slug}.com</span>
        </div>
      </div>
    </TemplateFrame>
  );
}

// ─── Shared bits ────────────────────────────────────────────────────

function Pill({ text, bg, fg, fontFamily, radius, large, border }: { text: string; bg: string; fg: string; fontFamily: string; radius: string; large?: boolean; border?: string }) {
  const style: CSSProperties = {
    background: bg,
    color: fg,
    borderRadius: radius,
    padding: large ? '20px 32px' : '12px 22px',
    fontFamily,
    fontWeight: 700,
    fontSize: large ? 22 : 18,
    border: border ? `1px solid ${border}` : 'none',
    display: 'inline-block',
    whiteSpace: 'nowrap',
  };
  return <span style={style}>{text}</span>;
}

function Decoration({ tokens, variant, bg }: { tokens: BrandTokens; variant: 'orbit' | 'grid'; bg: string }) {
  if (variant === 'orbit') {
    const accent = tokens.colors.accent;
    const hairline = isLight(bg) ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)';
    return (
      <>
        <div style={{ position: 'absolute', top: '-15%', right: '-15%', width: '60%', aspectRatio: '1', borderRadius: '50%', border: `2px solid ${hairline}` }} />
        <div style={{ position: 'absolute', top: '60%', right: '-5%', width: '25%', aspectRatio: '1', borderRadius: '50%', background: accent, opacity: 0.85 }} />
      </>
    );
  }
  // grid
  const lineColor = isLight(bg) ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      backgroundImage: `linear-gradient(${lineColor} 1px, transparent 1px), linear-gradient(90deg, ${lineColor} 1px, transparent 1px)`,
      backgroundSize: '64px 64px',
      pointerEvents: 'none',
    }} />
  );
}

function isLight(hex: string): boolean {
  const h = hex.replace('#', '').slice(0, 6);
  if (h.length !== 6) return true;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return ((0.299 * r + 0.587 * g + 0.114 * b) / 255) > 0.6;
}
