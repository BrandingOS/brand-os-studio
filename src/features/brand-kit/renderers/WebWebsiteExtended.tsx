import type { CSSProperties, ReactNode } from 'react';
import type { Brand } from '@/shared/types/brand';
import type { DeliverableContent, WebHeroContent } from '@/features/brandkit/content/kinds';
import { hydrateContent } from '@/features/brandkit/content/kinds';
import { Bind } from '@/features/brandkit/content/Bind';
import {
  contrastOf,
  fgOn,
  fontStack,
  logoOn,
  surface,
  type SurfaceTokens,
} from './brandStyle';
import { typePx } from './typeFloor';

/**
 * Website — thirty hero layouts over the `webHero` content model.
 *
 * What this family used to be: thirty browser mockups whose address bar
 * always read `brand.com`, whose hero said "make it last." in a serif
 * nobody chose, and which sold three tiers at "$10 · $24 · $48". None of
 * it was reachable by an edit, so the design a customer picked was the
 * one thing they could not change.
 *
 * Now every string on the page is a field:
 *
 *   nav[]         the site's own links, however many there are
 *   eyebrow       the line above the headline
 *   headline      the line that lands
 *   subhead       one more line
 *   primaryCta    the button
 *   secondaryCta  the quieter one beside it
 *   stats[]       EMPTY by default, and rendered only when it is not —
 *                 a hero statistic nobody supplied is a claim nobody made
 *   url           what the address bar says
 *
 * The frame is the family's identity: a Website is drawn inside a browser
 * window (chrome, tab, address bar), and its sibling Landing Page is a
 * full-bleed page with no chrome at all. The two share the primitives
 * below — one vocabulary, two frames — rather than two copies of a nav.
 */

export interface WebHeroProps {
  brand: Brand;
  templateIndex: number;
  /** The kit's content object. Narrowed to `webHero` inside. */
  content?: DeliverableContent;
}

/** The content a web hero paints with — the kind's defaults when none is passed. */
export function heroContent(brand: Brand, content?: DeliverableContent): WebHeroContent {
  if (content && content.kind === 'webHero') return content;
  return hydrateContent('webHero', brand, undefined) as WebHeroContent;
}

/**
 * `textMuted`, but only where it really reads.
 *
 * A muted ink is mixed 35% toward its own ground, which is comfortable on
 * paper and marginal on a saturated brand panel. Asking is cheaper than
 * finding out in the contrast sweep.
 */
export function mutedOn(t: SurfaceTokens): string {
  return contrastOf(t.textMuted, t.bg) >= 4.5 ? t.textMuted : t.text;
}

/** A hairline that is visible on its own ground without becoming ink. */
export function ruleOn(t: SurfaceTokens): string {
  return t.border;
}

/**
 * The surface's accent, but only where it really reads.
 *
 * An eyebrow is the one line a hero paints in the brand's own colour, and
 * it is also the smallest — 5.5 to 6px, uppercase, letterspaced. SKAM's
 * red on white measures 3.76:1, which is a perfectly good accent for a
 * 40px headline and an unreadable one here. Below the floor the eyebrow
 * takes the surface's muted ink instead: the brand keeps the headline, the
 * ground and the button, and gives up the one place its colour cannot be
 * read.
 */
export function accentOn(t: SurfaceTokens): string {
  return contrastOf(t.accent, t.bg) >= 4.5 ? t.accent : mutedOn(t);
}

/* ── Bound fragments ──────────────────────────────────────────────── */

export function Eyebrow({
  brand,
  c,
  color,
  size = 6,
}: {
  brand: Brand;
  c: WebHeroContent;
  color: string;
  size?: number;
}) {
  return (
    <Bind
      path="eyebrow"
      value={c.eyebrow}
      fit="clamp"
      style={{
        color,
        fontFamily: fontStack(brand, 'body'),
        fontSize: typePx(size),
        fontWeight: 600,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        lineHeight: 1.2,
      }}
    />
  );
}

export function Headline({
  brand,
  c,
  color,
  size = 17,
  lines = 3,
  align,
}: {
  brand: Brand;
  c: WebHeroContent;
  color: string;
  size?: number;
  lines?: number;
  align?: CSSProperties['textAlign'];
}) {
  return (
    <Bind
      path="headline"
      value={c.headline}
      fit="wrap"
      style={{
        color,
        fontFamily: fontStack(brand, 'heading'),
        fontSize: typePx(size),
        fontWeight: 700,
        lineHeight: 1.08,
        letterSpacing: '-0.02em',
        textAlign: align,
        display: '-webkit-box',
        WebkitLineClamp: lines,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}
    />
  );
}

export function Subhead({
  brand,
  c,
  color,
  size = 6.5,
  lines = 3,
  align,
}: {
  brand: Brand;
  c: WebHeroContent;
  color: string;
  size?: number;
  lines?: number;
  align?: CSSProperties['textAlign'];
}) {
  return (
    <Bind
      path="subhead"
      value={c.subhead}
      fit="wrap"
      style={{
        color,
        fontFamily: fontStack(brand, 'body'),
        fontSize: typePx(size),
        lineHeight: 1.45,
        textAlign: align,
        display: '-webkit-box',
        WebkitLineClamp: lines,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}
    />
  );
}

/** The site's own links. Whatever the customer listed, in their order. */
export function Nav({
  brand,
  c,
  color,
  size = 5.5,
  gap = 8,
  vertical = false,
}: {
  brand: Brand;
  c: WebHeroContent;
  color: string;
  size?: number;
  gap?: number;
  vertical?: boolean;
}) {
  return (
    <div
      className={vertical ? 'flex flex-col min-w-0' : 'flex items-center min-w-0'}
      style={{ gap }}
    >
      {c.nav.map((label, i) => (
        <Bind
          key={i}
          path={`nav.${i}`}
          value={label}
          fit="clamp"
          style={{
            color,
            fontFamily: fontStack(brand, 'body'),
            fontSize: typePx(size),
            fontWeight: 500,
            lineHeight: 1.2,
          }}
        />
      ))}
    </div>
  );
}

/** The button and the quieter thing beside it. */
export function Ctas({
  brand,
  c,
  fill,
  onFill,
  ghost,
  size = 6,
  center = false,
}: {
  brand: Brand;
  c: WebHeroContent;
  /** Ground of the primary button. */
  fill: string;
  /** Ink on that ground. Defaults to whatever reads. */
  onFill?: string;
  /** Ink of the secondary, on the surrounding surface. */
  ghost: string;
  size?: number;
  center?: boolean;
}) {
  const ink = onFill ?? fgOn(fill);
  return (
    <div className={`flex items-center ${center ? 'justify-center' : ''}`} style={{ gap: 8 }}>
      <span
        className="inline-flex items-center"
        style={{ backgroundColor: fill, borderRadius: 999, padding: '3px 9px' }}
      >
        <Bind
          path="primaryCta"
          value={c.primaryCta}
          fit="clamp"
          style={{
            color: ink,
            fontFamily: fontStack(brand, 'body'),
            fontSize: typePx(size),
            fontWeight: 600,
            lineHeight: 1.2,
          }}
        />
      </span>
      <Bind
        path="secondaryCta"
        value={c.secondaryCta}
        fit="clamp"
        style={{
          color: ghost,
          fontFamily: fontStack(brand, 'body'),
          fontSize: typePx(size),
          fontWeight: 500,
          lineHeight: 1.2,
          textDecoration: 'underline',
          textUnderlineOffset: 2,
        }}
      />
    </div>
  );
}

/**
 * The stats row — and nothing at all when there are none.
 *
 * `stats` is empty in the kind's defaults on purpose, and this is the
 * half of that decision the artwork owns: an untouched hero must not
 * print "1k+ brands" in grey as a hint. Every layout below is composed so
 * that the row's absence leaves a finished page, not a hole.
 */
export function Stats({
  brand,
  c,
  color,
  mutedColor,
  size = 13,
  align = 'left',
}: {
  brand: Brand;
  c: WebHeroContent;
  color: string;
  mutedColor: string;
  size?: number;
  align?: 'left' | 'center';
}) {
  if (c.stats.length === 0) return null;
  return (
    <div className={`flex ${align === 'center' ? 'justify-center' : ''}`} style={{ gap: 14 }}>
      {c.stats.map((stat, i) => (
        <div key={stat.id ?? i} className="flex flex-col min-w-0" style={{ gap: 1 }}>
          <Bind
            path={`stats.${i}.value`}
            value={stat.value}
            fit="clamp"
            style={{
              color,
              fontFamily: fontStack(brand, 'heading'),
              fontSize: typePx(size),
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          />
          <Bind
            path={`stats.${i}.label`}
            value={stat.label}
            fit="clamp"
            style={{
              color: mutedColor,
              fontFamily: fontStack(brand, 'body'),
              fontSize: typePx(5.5),
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              lineHeight: 1.2,
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function Url({
  brand,
  c,
  color,
  size = 6,
}: {
  brand: Brand;
  c: WebHeroContent;
  color: string;
  size?: number;
}) {
  return (
    <Bind
      path="url"
      value={c.url}
      fit="clamp"
      style={{
        color,
        fontFamily: fontStack(brand, 'body'),
        fontSize: typePx(size),
        lineHeight: 1.2,
      }}
    />
  );
}

/** The brand's own mark, where one reads on this ground. */
export function Mark({
  brand,
  ground,
  height = 12,
}: {
  brand: Brand;
  ground: string;
  height?: number;
}) {
  const logo = logoOn(brand, ground);
  if (!logo) {
    return (
      <span
        style={{
          color: fgOn(ground),
          fontFamily: fontStack(brand, 'heading'),
          fontSize: typePx(height * 0.8),
          fontWeight: 800,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        {brand.name}
      </span>
    );
  }
  return <img src={logo.url} alt="" style={{ height, maxWidth: 70, objectFit: 'contain' }} />;
}

/**
 * A browser window — the Website family's frame.
 *
 * Its chrome is drawn from the brand's own neutral surfaces rather than
 * from macOS traffic lights: three off-brand hues in the corner of every
 * tile was the single most-repeated foreign colour in this renderer.
 */
export function BrowserWindow({
  brand,
  c,
  chrome,
  page,
  children,
}: {
  brand: Brand;
  c: WebHeroContent;
  chrome: SurfaceTokens;
  page: SurfaceTokens;
  children: ReactNode;
}) {
  return (
    <div className="w-full h-full" style={{ backgroundColor: chrome.bg, padding: 7 }}>
      <div
        className="w-full h-full flex flex-col overflow-hidden"
        style={{
          backgroundColor: page.bg,
          borderRadius: 5,
          border: `1px solid ${chrome.border}`,
        }}
      >
        <div
          className="flex items-center gap-1.5 px-2 shrink-0"
          style={{ backgroundColor: chrome.bg, height: 14, borderBottom: `1px solid ${chrome.border}` }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="rounded-full"
              style={{ width: 3, height: 3, backgroundColor: mutedOn(chrome) }}
            />
          ))}
          <div
            className="flex-1 min-w-0 flex items-center px-1.5"
            style={{ backgroundColor: page.bg, borderRadius: 999, height: 9 }}
          >
            <Url brand={brand} c={c} color={mutedOn(page)} size={5} />
          </div>
        </div>
        <div className="flex-1 min-h-0 relative overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

/**
 * The same links, worn as outlined pills.
 *
 * A second reading of `nav`, not a second field: the paths are still
 * `nav.0`…`nav.n`, so a link edited in the panel lands here exactly as it
 * lands in the plain row.
 */
export function NavPills({
  brand,
  c,
  color,
  border,
  size = 5.5,
}: {
  brand: Brand;
  c: WebHeroContent;
  color: string;
  border: string;
  size?: number;
}) {
  return (
    <div className="flex flex-wrap items-center" style={{ gap: 4 }}>
      {c.nav.map((label, i) => (
        <span
          key={i}
          className="inline-flex items-center min-w-0"
          style={{ border: `1px solid ${border}`, borderRadius: 999, padding: '1px 6px' }}
        >
          <Bind
            path={`nav.${i}`}
            value={label}
            fit="clamp"
            style={{
              color,
              fontFamily: fontStack(brand, 'body'),
              fontSize: typePx(size),
              fontWeight: 500,
              lineHeight: 1.2,
            }}
          />
        </span>
      ))}
    </div>
  );
}

/* ── The thirty ──────────────────────────────────────────────────── */

export function WebWebsiteExtendedRenderer({ brand, templateIndex, content }: WebHeroProps) {
  const c = heroContent(brand, content);
  const page = surface(brand, 'card');
  const subtle = surface(brand, 'subtle');
  const inverted = surface(brand, 'inverted');
  const brandT = surface(brand, 'brand');

  const pageMuted = mutedOn(page);
  const invMuted = mutedOn(inverted);
  const brandMuted = mutedOn(brandT);

  const designs: ReactNode[] = [
    // 1 — Centre Stage. The whole hero on the brand's own colour.
    (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: brandT.bg, padding: 12 }}>
        <div className="flex items-center justify-between gap-2">
          <Mark brand={brand} ground={brandT.bg} height={10} />
          <Nav brand={brand} c={c} color={brandT.text} />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-1.5">
          <Eyebrow brand={brand} c={c} color={brandMuted} />
          <Headline brand={brand} c={c} color={brandT.text} size={16} lines={2} align="center" />
          <div style={{ maxWidth: '78%' }}>
            <Subhead brand={brand} c={c} color={brandMuted} lines={2} align="center" />
          </div>
          <div className="pt-1">
            <Ctas brand={brand} c={c} fill={page.bg} ghost={brandT.text} center />
          </div>
        </div>
        <Stats brand={brand} c={c} color={brandT.text} mutedColor={brandMuted} align="center" />
      </div>
    ),
    // 2 — Split Field. Copy on paper, the brand on the other half.
    (
      <div className="w-full h-full flex">
        <div
          className="w-[58%] h-full flex flex-col justify-center"
          style={{ backgroundColor: page.bg, padding: 12, gap: 5 }}
        >
          <Eyebrow brand={brand} c={c} color={accentOn(page)} />
          <Headline brand={brand} c={c} color={page.text} size={15} lines={3} />
          <Subhead brand={brand} c={c} color={pageMuted} lines={2} />
          <div className="pt-1">
            <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} />
          </div>
        </div>
        <div
          className="w-[42%] h-full flex flex-col justify-between"
          style={{ backgroundColor: brandT.bg, padding: 12 }}
        >
          <Nav brand={brand} c={c} color={brandT.text} vertical gap={4} />
          <div className="flex flex-col gap-2">
            <Stats brand={brand} c={c} color={brandT.text} mutedColor={brandMuted} size={12} />
            <Mark brand={brand} ground={brandT.bg} height={12} />
          </div>
        </div>
      </div>
    ),
    // 3 — Editorial. A masthead rule, a wide headline, a narrow column.
    (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: page.bg, padding: 12 }}>
        <div
          className="flex items-center justify-between gap-2 pb-2"
          style={{ borderBottom: `1px solid ${ruleOn(page)}` }}
        >
          <Mark brand={brand} ground={page.bg} height={10} />
          <Nav brand={brand} c={c} color={page.text} />
        </div>
        <div className="flex-1 flex gap-3 pt-2 min-h-0">
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div className="flex flex-col gap-1">
              <Eyebrow brand={brand} c={c} color={accentOn(page)} />
              <Headline brand={brand} c={c} color={page.text} size={17} lines={4} />
            </div>
            <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} />
          </div>
          <div
            className="w-[34%] flex flex-col justify-between"
            style={{ borderLeft: `1px solid ${ruleOn(page)}`, paddingLeft: 8 }}
          >
            <Subhead brand={brand} c={c} color={pageMuted} lines={5} />
            <Stats brand={brand} c={c} color={page.text} mutedColor={pageMuted} size={11} />
          </div>
        </div>
      </div>
    ),
    // 4 — Side Rail. Navigation lives down the left, as an app does.
    (
      <div className="w-full h-full flex">
        <div
          className="w-[26%] h-full flex flex-col justify-between"
          style={{ backgroundColor: brandT.bg, padding: 10 }}
        >
          <Mark brand={brand} ground={brandT.bg} height={11} />
          <Nav brand={brand} c={c} color={brandT.text} vertical gap={5} size={6} />
          <Url brand={brand} c={c} color={brandMuted} size={5.5} />
        </div>
        <div
          className="flex-1 h-full flex flex-col justify-center"
          style={{ backgroundColor: page.bg, padding: 12, gap: 5 }}
        >
          <Eyebrow brand={brand} c={c} color={accentOn(page)} />
          <Headline brand={brand} c={c} color={page.text} size={16} lines={3} />
          <Subhead brand={brand} c={c} color={pageMuted} lines={2} />
          <div className="pt-1">
            <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} />
          </div>
          <Stats brand={brand} c={c} color={page.text} mutedColor={pageMuted} size={12} />
        </div>
      </div>
    ),
    // 5 — Night Shift. The same page after dark.
    (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: inverted.bg, padding: 12 }}>
        <div className="flex items-center justify-between gap-2">
          <Mark brand={brand} ground={inverted.bg} height={10} />
          <Nav brand={brand} c={c} color={inverted.text} />
        </div>
        <div className="flex-1 min-h-0 flex flex-col justify-center gap-2">
          <Eyebrow brand={brand} c={c} color={accentOn(inverted)} />
          {/* Two lines, not three: at 18px a third line pushed the two
              buttons 11.5px below the page's own bottom edge, on both seed
              brands. The scale is the design; the third line was not. */}
          <Headline brand={brand} c={c} color={inverted.text} size={18} lines={2} />
          <div style={{ maxWidth: '72%' }}>
            <Subhead brand={brand} c={c} color={invMuted} lines={2} />
          </div>
          <div className="pt-1">
            <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={inverted.text} />
          </div>
        </div>
        <Stats brand={brand} c={c} color={inverted.text} mutedColor={invMuted} size={12} />
      </div>
    ),
    // 6 — Underline. One heavy brand rule under the line that matters.
    (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: page.bg, padding: 12 }}>
        <div className="flex items-center justify-between gap-2">
          <Mark brand={brand} ground={page.bg} height={10} />
          <Nav brand={brand} c={c} color={page.text} />
        </div>
        <div className="flex-1 flex flex-col justify-center gap-2">
          <Eyebrow brand={brand} c={c} color={accentOn(page)} />
          <div className="flex flex-col" style={{ gap: 4 }}>
            <Headline brand={brand} c={c} color={page.text} size={18} lines={2} />
            <div style={{ height: 4, width: 64, backgroundColor: brandT.bg, borderRadius: 2 }} />
          </div>
          <Subhead brand={brand} c={c} color={pageMuted} lines={2} />
        </div>
        <div className="flex items-end justify-between gap-2">
          <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} />
          <Stats brand={brand} c={c} color={page.text} mutedColor={pageMuted} size={11} />
        </div>
      </div>
    ),
    // 7 — Panel Card. The hero floats on the brand's colour.
    (
      <div className="w-full h-full" style={{ backgroundColor: brandT.bg, padding: 10 }}>
        <div className="w-full h-full flex flex-col" style={{ backgroundColor: page.bg, borderRadius: 6, padding: 11 }}>
          <div className="flex items-center justify-between gap-2">
            <Mark brand={brand} ground={page.bg} height={10} />
            <Nav brand={brand} c={c} color={page.text} />
          </div>
          <div className="flex-1 flex flex-col justify-center gap-2">
            <Eyebrow brand={brand} c={c} color={accentOn(page)} />
            <Headline brand={brand} c={c} color={page.text} size={16} lines={2} />
            <Subhead brand={brand} c={c} color={pageMuted} lines={2} />
          </div>
          <div className="flex items-end justify-between gap-2">
            <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} />
            <Stats brand={brand} c={c} color={page.text} mutedColor={pageMuted} size={11} />
          </div>
        </div>
      </div>
    ),
    // 8 — Ledger. Ruled rows: the site as an index of itself.
    (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: subtle.bg, padding: 12 }}>
        <div className="flex items-baseline justify-between gap-2">
          <Eyebrow brand={brand} c={c} color={accentOn(subtle)} />
          <Url brand={brand} c={c} color={mutedOn(subtle)} size={5.5} />
        </div>
        <div className="flex-1 flex gap-3 pt-1.5 min-h-0">
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <Headline brand={brand} c={c} color={subtle.text} size={17} lines={3} />
            <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={subtle.text} />
          </div>
          <div className="w-[36%] flex flex-col">
            {c.nav.map((label, i) => (
              <div
                key={i}
                className="flex items-center py-[2px]"
                style={{ borderTop: `1px solid ${ruleOn(subtle)}` }}
              >
                <Bind
                  path={`nav.${i}`}
                  value={label}
                  fit="clamp"
                  style={{
                    color: subtle.text,
                    fontFamily: fontStack(brand, 'body'),
                    fontSize: typePx(5.5),
                    fontWeight: 500,
                    lineHeight: 1.3,
                  }}
                />
              </div>
            ))}
            <div className="pt-1.5">
              <Subhead brand={brand} c={c} color={mutedOn(subtle)} size={5.5} lines={3} />
            </div>
          </div>
        </div>
        <Stats brand={brand} c={c} color={subtle.text} mutedColor={mutedOn(subtle)} size={11} />
      </div>
    ),
    // 9 — Banner. A brand band across the top, paper underneath.
    (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: page.bg }}>
        <div
          className="flex items-center justify-between gap-2 shrink-0"
          style={{ backgroundColor: brandT.bg, padding: '8px 12px' }}
        >
          <Mark brand={brand} ground={brandT.bg} height={10} />
          <Nav brand={brand} c={c} color={brandT.text} />
        </div>
        <div className="flex-1 flex flex-col justify-center" style={{ padding: 12, gap: 4 }}>
          <Eyebrow brand={brand} c={c} color={accentOn(page)} />
          <Headline brand={brand} c={c} color={page.text} size={16} lines={2} />
          <Subhead brand={brand} c={c} color={pageMuted} lines={2} />
          <div className="pt-1">
            <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} />
          </div>
          <Stats brand={brand} c={c} color={page.text} mutedColor={pageMuted} size={11} />
        </div>
      </div>
    ),
    // 10 — Wide Type. The headline is the layout.
    (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: page.bg, padding: 12 }}>
        <div className="flex items-center justify-between gap-2">
          <Eyebrow brand={brand} c={c} color={accentOn(page)} />
          <Nav brand={brand} c={c} color={pageMuted} size={5} gap={6} />
        </div>
        <div className="flex-1 flex items-center">
          <Headline brand={brand} c={c} color={page.text} size={24} lines={3} />
        </div>
        <div
          className="flex items-end justify-between gap-3 pt-2"
          style={{ borderTop: `1px solid ${ruleOn(page)}` }}
        >
          <div className="flex-1 min-w-0">
            <Subhead brand={brand} c={c} color={pageMuted} size={6} lines={2} />
          </div>
          <div className="flex flex-col items-end" style={{ gap: 5 }}>
            <Stats brand={brand} c={c} color={page.text} mutedColor={pageMuted} size={11} />
            <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} />
          </div>
        </div>
      </div>
    ),
    // 11 — Column Grid. Three columns, one message.
    (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: page.bg, padding: 12 }}>
        <div
          className="flex items-center justify-between gap-2 pb-2"
          style={{ borderBottom: `1px solid ${ruleOn(page)}` }}
        >
          <Mark brand={brand} ground={page.bg} height={10} />
          <Nav brand={brand} c={c} color={page.text} />
        </div>
        <div className="flex-1 grid grid-cols-3 gap-3 pt-2 min-h-0">
          <div className="flex flex-col gap-1 min-w-0">
            <Eyebrow brand={brand} c={c} color={accentOn(page)} size={5.5} />
            <Headline brand={brand} c={c} color={page.text} size={13} lines={4} />
          </div>
          <div className="flex flex-col justify-between min-w-0">
            <Subhead brand={brand} c={c} color={pageMuted} size={6} lines={5} />
            <Stats brand={brand} c={c} color={page.text} mutedColor={pageMuted} size={11} />
          </div>
          <div
            className="flex flex-col justify-end min-w-0"
            style={{ backgroundColor: brandT.bg, borderRadius: 4, padding: 8 }}
          >
            <Ctas brand={brand} c={c} fill={page.bg} ghost={brandT.text} size={5.5} />
          </div>
        </div>
      </div>
    ),
    // 12 — Corner Mark. Four corners, one diagonal read.
    (
      <div className="w-full h-full relative" style={{ backgroundColor: subtle.bg }}>
        <div
          className="absolute right-0 top-0"
          style={{ backgroundColor: brandT.bg, width: '38%', height: '46%', borderBottomLeftRadius: 8 }}
        >
          <div className="w-full h-full flex flex-col justify-between" style={{ padding: 9 }}>
            <Nav brand={brand} c={c} color={brandT.text} vertical gap={3} size={5.5} />
            <Url brand={brand} c={c} color={brandMuted} size={5.5} />
          </div>
        </div>
        <div className="absolute left-0 top-0" style={{ padding: 11 }}>
          <Mark brand={brand} ground={subtle.bg} height={11} />
        </div>
        <div
          className="absolute left-0 bottom-0 flex flex-col"
          style={{ padding: 11, gap: 4, width: '78%' }}
        >
          <Eyebrow brand={brand} c={c} color={accentOn(subtle)} />
          <Headline brand={brand} c={c} color={subtle.text} size={16} lines={2} />
          <Subhead brand={brand} c={c} color={mutedOn(subtle)} lines={2} />
          <div className="flex items-end justify-between gap-2 pt-1">
            <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={subtle.text} />
            <Stats brand={brand} c={c} color={subtle.text} mutedColor={mutedOn(subtle)} size={11} />
          </div>
        </div>
      </div>
    ),
    // 13 — Reverse Split. The dark half carries the navigation.
    (
      <div className="w-full h-full flex">
        <div
          className="w-[42%] h-full flex flex-col justify-between"
          style={{ backgroundColor: inverted.bg, padding: 10 }}
        >
          <Mark brand={brand} ground={inverted.bg} height={11} />
          <Nav brand={brand} c={c} color={inverted.text} vertical gap={4} size={5.5} />
          <Url brand={brand} c={c} color={invMuted} size={5.5} />
        </div>
        <div
          className="flex-1 h-full flex flex-col justify-center min-w-0"
          style={{ backgroundColor: page.bg, padding: 11, gap: 4 }}
        >
          <Eyebrow brand={brand} c={c} color={accentOn(page)} size={5.5} />
          <Headline brand={brand} c={c} color={page.text} size={14} lines={3} />
          <Subhead brand={brand} c={c} color={pageMuted} size={6} lines={2} />
          <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} size={5.5} />
          <Stats brand={brand} c={c} color={page.text} mutedColor={pageMuted} size={10} />
        </div>
      </div>
    ),
    // 14 — Float Card. The hero lifted off the page it sits on.
    (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: subtle.bg, padding: 9, gap: 6 }}>
        <div className="flex items-center justify-between gap-2 shrink-0">
          <Mark brand={brand} ground={subtle.bg} height={10} />
          <Nav brand={brand} c={c} color={subtle.text} size={5.5} gap={7} />
        </div>
        <div
          className="flex-1 min-h-0 flex flex-col items-center justify-center text-center"
          style={{
            backgroundColor: page.bg,
            borderRadius: 6,
            border: `1px solid ${ruleOn(page)}`,
            padding: 9,
            gap: 3,
          }}
        >
          <Eyebrow brand={brand} c={c} color={accentOn(page)} size={5.5} />
          <div className="w-full">
            <Headline brand={brand} c={c} color={page.text} size={12} lines={3} align="center" />
          </div>
          <div style={{ maxWidth: '86%' }}>
            <Subhead brand={brand} c={c} color={pageMuted} size={5.5} lines={2} align="center" />
          </div>
          <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} size={5.5} center />
          <Stats brand={brand} c={c} color={page.text} mutedColor={pageMuted} size={10} align="center" />
        </div>
      </div>
    ),
    // 15 — Marquee. The eyebrow runs the width of the brand's own strip.
    (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: page.bg }}>
        <div
          className="flex items-center gap-3 shrink-0"
          style={{ backgroundColor: brandT.bg, padding: '5px 11px' }}
        >
          <Mark brand={brand} ground={brandT.bg} height={9} />
          <div className="flex-1 min-w-0">
            <Eyebrow brand={brand} c={c} color={brandT.text} size={5.5} />
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center min-h-0" style={{ padding: '0 11px', gap: 4 }}>
          <Headline brand={brand} c={c} color={page.text} size={16} lines={2} />
          <div style={{ maxWidth: '82%' }}>
            <Subhead brand={brand} c={c} color={pageMuted} lines={2} />
          </div>
        </div>
        <div
          className="flex items-end justify-between gap-2 shrink-0"
          style={{ padding: 11, borderTop: `1px solid ${ruleOn(page)}` }}
        >
          <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} size={5.5} />
          <div className="flex flex-col items-end" style={{ gap: 4 }}>
            <Stats brand={brand} c={c} color={page.text} mutedColor={pageMuted} size={10} />
            <Nav brand={brand} c={c} color={pageMuted} size={5} gap={6} />
          </div>
        </div>
      </div>
    ),
    // 16 — Deep Field. Dark, and centred on one line.
    (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: inverted.bg, padding: 11 }}>
        <div className="flex items-center justify-between gap-2 shrink-0">
          <Mark brand={brand} ground={inverted.bg} height={10} />
          <Nav brand={brand} c={c} color={inverted.text} size={5.5} gap={7} />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center min-h-0" style={{ gap: 3 }}>
          <Eyebrow brand={brand} c={c} color={accentOn(inverted)} size={5.5} />
          <div className="w-full">
            <Headline brand={brand} c={c} color={inverted.text} size={13} lines={3} align="center" />
          </div>
          <div style={{ maxWidth: '80%' }}>
            <Subhead brand={brand} c={c} color={invMuted} size={6} lines={2} align="center" />
          </div>
          <Ctas brand={brand} c={c} fill={page.bg} ghost={inverted.text} size={5.5} center />
        </div>
        <div className="flex items-center justify-between gap-2 shrink-0">
          <Url brand={brand} c={c} color={invMuted} size={5.5} />
          <Stats brand={brand} c={c} color={inverted.text} mutedColor={invMuted} size={10} />
        </div>
      </div>
    ),
    // 17 — Right Rail. The rail changes sides, and changes tone with it.
    (
      <div className="w-full h-full flex">
        <div
          className="flex-1 h-full flex flex-col justify-center min-w-0"
          style={{ backgroundColor: page.bg, padding: 11, gap: 4 }}
        >
          <Eyebrow brand={brand} c={c} color={accentOn(page)} size={5.5} />
          <Headline brand={brand} c={c} color={page.text} size={14} lines={3} />
          <Subhead brand={brand} c={c} color={pageMuted} size={6} lines={2} />
          <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} size={5.5} />
        </div>
        <div
          className="w-[26%] h-full flex flex-col justify-between"
          style={{ backgroundColor: subtle.bg, padding: 9, borderLeft: `1px solid ${ruleOn(subtle)}` }}
        >
          <Mark brand={brand} ground={subtle.bg} height={10} />
          <Nav brand={brand} c={c} color={subtle.text} vertical gap={4} size={5.5} />
          <Stats brand={brand} c={c} color={subtle.text} mutedColor={mutedOn(subtle)} size={10} />
        </div>
      </div>
    ),
    // 18 — Foot Band. Everything leans on the colour at the bottom.
    (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: page.bg }}>
        <div className="flex items-center justify-between gap-2 shrink-0" style={{ padding: '9px 11px 0' }}>
          <Mark brand={brand} ground={page.bg} height={10} />
          <Nav brand={brand} c={c} color={page.text} size={5.5} gap={7} />
        </div>
        <div className="flex-1 flex flex-col justify-center min-h-0" style={{ padding: '0 11px', gap: 4 }}>
          <Eyebrow brand={brand} c={c} color={accentOn(page)} />
          <Headline brand={brand} c={c} color={page.text} size={16} lines={2} />
          <Subhead brand={brand} c={c} color={pageMuted} lines={2} />
        </div>
        <div
          className="flex items-center justify-between gap-3 shrink-0"
          style={{ backgroundColor: brandT.bg, padding: '9px 11px' }}
        >
          <Ctas brand={brand} c={c} fill={page.bg} ghost={brandT.text} size={5.5} />
          <div className="flex flex-col items-end" style={{ gap: 3 }}>
            <Stats brand={brand} c={c} color={brandT.text} mutedColor={brandMuted} size={10} />
            <Url brand={brand} c={c} color={brandT.text} size={5.5} />
          </div>
        </div>
      </div>
    ),
    // 19 — Pill Row. The site's links, worn as pills under the promise.
    (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: page.bg, padding: 11, gap: 5 }}>
        <div className="flex items-center justify-between gap-2 shrink-0">
          <Mark brand={brand} ground={page.bg} height={10} />
          <Eyebrow brand={brand} c={c} color={accentOn(page)} size={5.5} />
        </div>
        <div className="flex-1 flex flex-col justify-center min-h-0" style={{ gap: 4 }}>
          <Headline brand={brand} c={c} color={page.text} size={15} lines={2} />
          <Subhead brand={brand} c={c} color={pageMuted} size={6} lines={2} />
          <NavPills brand={brand} c={c} color={page.text} border={ruleOn(page)} />
        </div>
        <div className="flex items-end justify-between gap-2 shrink-0">
          <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} size={5.5} />
          <Stats brand={brand} c={c} color={page.text} mutedColor={pageMuted} size={10} />
        </div>
      </div>
    ),
    // 20 — Framed Lede. The opening paragraph, boxed like a standfirst.
    (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: subtle.bg, padding: 11, gap: 5 }}>
        <div
          className="flex items-center justify-between gap-2 pb-1.5 shrink-0"
          style={{ borderBottom: `1px solid ${ruleOn(subtle)}` }}
        >
          <Mark brand={brand} ground={subtle.bg} height={10} />
          <Nav brand={brand} c={c} color={subtle.text} size={5.5} gap={7} />
        </div>
        <div
          className="flex-1 min-h-0 flex flex-col justify-center"
          style={{ border: `1px solid ${ruleOn(subtle)}`, padding: 7, gap: 3 }}
        >
          <Eyebrow brand={brand} c={c} color={accentOn(subtle)} size={5.5} />
          <Headline brand={brand} c={c} color={subtle.text} size={13} lines={2} />
          <Subhead brand={brand} c={c} color={mutedOn(subtle)} size={5.5} lines={2} />
        </div>
        <div className="flex items-end justify-between gap-2 shrink-0">
          <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={subtle.text} size={5.5} />
          <Stats brand={brand} c={c} color={subtle.text} mutedColor={mutedOn(subtle)} size={10} />
        </div>
      </div>
    ),
    // 21 — Stack Bands. Colour, paper, tint: the page in three strata.
    (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: page.bg }}>
        <div
          className="flex items-center justify-between gap-2 shrink-0"
          style={{ backgroundColor: brandT.bg, padding: '7px 11px' }}
        >
          <Mark brand={brand} ground={brandT.bg} height={10} />
          <Nav brand={brand} c={c} color={brandT.text} size={5.5} gap={7} />
        </div>
        <div className="flex-1 flex flex-col justify-center min-h-0" style={{ padding: '0 11px', gap: 3 }}>
          <Eyebrow brand={brand} c={c} color={accentOn(page)} size={5.5} />
          <Headline brand={brand} c={c} color={page.text} size={15} lines={2} />
          <Subhead brand={brand} c={c} color={pageMuted} size={6} lines={2} />
        </div>
        <div
          className="flex items-center justify-between gap-3 shrink-0"
          style={{ backgroundColor: subtle.bg, padding: '8px 11px', borderTop: `1px solid ${ruleOn(subtle)}` }}
        >
          <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={subtle.text} size={5.5} />
          <Stats brand={brand} c={c} color={subtle.text} mutedColor={mutedOn(subtle)} size={10} />
        </div>
      </div>
    ),
    // 22 — Left Rule. One colour stripe holds the whole page upright.
    (
      <div className="w-full h-full flex" style={{ backgroundColor: page.bg }}>
        <div className="shrink-0" style={{ width: 7, backgroundColor: brandT.bg }} />
        <div className="flex-1 min-w-0 flex flex-col" style={{ padding: 11 }}>
          <div className="flex items-center justify-between gap-2 shrink-0">
            <Mark brand={brand} ground={page.bg} height={10} />
            <Nav brand={brand} c={c} color={page.text} size={5.5} gap={7} />
          </div>
          <div className="flex-1 flex flex-col justify-center min-h-0" style={{ gap: 4 }}>
            <Eyebrow brand={brand} c={c} color={accentOn(page)} />
            <Headline brand={brand} c={c} color={page.text} size={16} lines={2} />
            <Subhead brand={brand} c={c} color={pageMuted} lines={2} />
          </div>
          <div className="flex items-end justify-between gap-2 shrink-0">
            <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} size={5.5} />
            <Stats brand={brand} c={c} color={page.text} mutedColor={pageMuted} size={10} />
          </div>
        </div>
      </div>
    ),
    // 23 — Quiet Top. Almost no chrome, so the headline is the site.
    (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: page.bg, padding: 11 }}>
        <div className="flex items-center justify-between gap-2 shrink-0">
          <Url brand={brand} c={c} color={pageMuted} size={5} />
          <Nav brand={brand} c={c} color={pageMuted} size={5} gap={6} />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center min-h-0" style={{ gap: 3 }}>
          <Eyebrow brand={brand} c={c} color={accentOn(page)} size={5.5} />
          <div className="w-full">
            <Headline brand={brand} c={c} color={page.text} size={15} lines={3} align="center" />
          </div>
          <div style={{ maxWidth: '74%' }}>
            <Subhead brand={brand} c={c} color={pageMuted} size={5.5} lines={2} align="center" />
          </div>
          <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} size={5.5} center />
        </div>
        <div className="flex items-end justify-between gap-2 shrink-0">
          <Mark brand={brand} ground={page.bg} height={10} />
          <Stats brand={brand} c={c} color={page.text} mutedColor={pageMuted} size={10} />
        </div>
      </div>
    ),
    // 24 — Colour Column. The brand's field carries the headline itself.
    (
      <div className="w-full h-full flex">
        <div
          className="flex-1 h-full flex flex-col justify-between min-w-0"
          style={{ backgroundColor: page.bg, padding: 11 }}
        >
          <Mark brand={brand} ground={page.bg} height={10} />
          <div className="flex flex-col" style={{ gap: 3 }}>
            <Eyebrow brand={brand} c={c} color={accentOn(page)} size={5.5} />
            <Subhead brand={brand} c={c} color={pageMuted} size={6} lines={3} />
          </div>
          <div className="flex items-end justify-between gap-2">
            <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} size={5.5} />
            <Stats brand={brand} c={c} color={page.text} mutedColor={pageMuted} size={10} />
          </div>
        </div>
        <div
          className="w-[46%] h-full flex flex-col justify-between"
          style={{ backgroundColor: brandT.bg, padding: 11 }}
        >
          <Nav brand={brand} c={c} color={brandT.text} vertical gap={3} size={5.5} />
          <Headline brand={brand} c={c} color={brandT.text} size={13} lines={3} />
        </div>
      </div>
    ),
    // 25 — Cell Grid. Four cells, each holding one part of the pitch.
    (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: subtle.bg, padding: 8, gap: 6 }}>
        <div className="flex items-center justify-between gap-2 shrink-0" style={{ padding: '0 2px' }}>
          <Mark brand={brand} ground={subtle.bg} height={10} />
          <Nav brand={brand} c={c} color={subtle.text} size={5.5} gap={6} />
        </div>
        <div className="flex-1 min-h-0 flex" style={{ gap: 6 }}>
          <div
            className="flex-1 min-w-0 flex flex-col justify-between"
            style={{ backgroundColor: page.bg, borderRadius: 4, padding: 8 }}
          >
            <Eyebrow brand={brand} c={c} color={accentOn(page)} size={5.5} />
            <Headline brand={brand} c={c} color={page.text} size={13} lines={3} />
          </div>
          <div className="w-[42%] flex flex-col" style={{ gap: 6 }}>
            <div
              className="flex-1 min-h-0 flex flex-col justify-center"
              style={{ backgroundColor: page.bg, borderRadius: 4, padding: 8, gap: 3 }}
            >
              <Subhead brand={brand} c={c} color={pageMuted} size={5.5} lines={3} />
              <Stats brand={brand} c={c} color={page.text} mutedColor={pageMuted} size={10} />
            </div>
            <div
              className="flex items-center shrink-0"
              style={{ backgroundColor: brandT.bg, borderRadius: 4, padding: 8 }}
            >
              <Ctas brand={brand} c={c} fill={page.bg} ghost={brandT.text} size={5.5} />
            </div>
          </div>
        </div>
      </div>
    ),
    // 26 — Inset Frame. A rule drawn round the page, as a poster is.
    (
      <div className="w-full h-full" style={{ backgroundColor: page.bg, padding: 8 }}>
        <div
          className="w-full h-full flex flex-col"
          style={{ border: `1px solid ${brandT.bg}`, padding: 9 }}
        >
          <div className="flex items-center justify-between gap-2 shrink-0">
            <Mark brand={brand} ground={page.bg} height={9} />
            <Nav brand={brand} c={c} color={page.text} size={5} gap={6} />
          </div>
          <div className="flex-1 flex flex-col justify-center min-h-0" style={{ gap: 3 }}>
            <Eyebrow brand={brand} c={c} color={accentOn(page)} size={5.5} />
            <Headline brand={brand} c={c} color={page.text} size={15} lines={2} />
            <Subhead brand={brand} c={c} color={pageMuted} size={5.5} lines={2} />
          </div>
          <div className="flex items-end justify-between gap-2 shrink-0">
            <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} size={5.5} />
            <Stats brand={brand} c={c} color={page.text} mutedColor={pageMuted} size={10} />
          </div>
        </div>
      </div>
    ),
    // 27 — Base Nav. The links sit at the foot, under a hairline.
    (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: page.bg, padding: 11 }}>
        <div className="flex items-start justify-between gap-2 shrink-0">
          <Mark brand={brand} ground={page.bg} height={11} />
          <Stats brand={brand} c={c} color={page.text} mutedColor={pageMuted} size={10} />
        </div>
        <div className="flex-1 flex flex-col justify-center min-h-0" style={{ gap: 3, maxWidth: '86%' }}>
          <Eyebrow brand={brand} c={c} color={accentOn(page)} size={5.5} />
          <Headline brand={brand} c={c} color={page.text} size={15} lines={2} />
          <Subhead brand={brand} c={c} color={pageMuted} size={6} lines={2} />
          <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} size={5.5} />
        </div>
        <div
          className="flex items-center justify-between gap-2 pt-1.5 shrink-0"
          style={{ borderTop: `1px solid ${ruleOn(page)}` }}
        >
          <Nav brand={brand} c={c} color={pageMuted} size={5.5} gap={7} />
          <Url brand={brand} c={c} color={pageMuted} size={5.5} />
        </div>
      </div>
    ),
    // 28 — Tint Wash. A tinted ground, and the eyebrow wears the colour.
    (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: subtle.bg, padding: 11, gap: 4 }}>
        <div className="flex items-center justify-between gap-2 shrink-0">
          <Mark brand={brand} ground={subtle.bg} height={10} />
          <Nav brand={brand} c={c} color={subtle.text} size={5.5} gap={7} />
        </div>
        <div className="flex-1 flex flex-col justify-center min-h-0" style={{ gap: 4 }}>
          <span
            className="inline-flex items-center self-start"
            style={{ backgroundColor: brandT.bg, borderRadius: 3, padding: '2px 6px' }}
          >
            <Eyebrow brand={brand} c={c} color={brandT.text} size={5.5} />
          </span>
          <Headline brand={brand} c={c} color={subtle.text} size={14} lines={2} />
          <div style={{ height: 1, backgroundColor: ruleOn(subtle) }} />
          <Subhead brand={brand} c={c} color={mutedOn(subtle)} size={6} lines={2} />
        </div>
        <div className="flex items-end justify-between gap-2 shrink-0">
          <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={subtle.text} size={5.5} />
          <Stats brand={brand} c={c} color={subtle.text} mutedColor={mutedOn(subtle)} size={10} />
        </div>
      </div>
    ),
    // 29 — Half Page. Colour above the fold, paper below it.
    (
      <div className="w-full h-full flex flex-col">
        <div
          className="flex-1 min-h-0 flex flex-col justify-center"
          style={{ backgroundColor: brandT.bg, padding: 9, gap: 3 }}
        >
          <div className="flex items-center justify-between gap-2">
            <Mark brand={brand} ground={brandT.bg} height={10} />
            <Eyebrow brand={brand} c={c} color={brandMuted} size={5.5} />
          </div>
          <Headline brand={brand} c={c} color={brandT.text} size={13} lines={2} />
        </div>
        <div
          className="flex-1 min-h-0 flex flex-col justify-center"
          style={{ backgroundColor: page.bg, padding: 9, gap: 3 }}
        >
          <Nav brand={brand} c={c} color={page.text} size={5.5} gap={7} />
          <Subhead brand={brand} c={c} color={pageMuted} size={5.5} lines={2} />
          <div className="flex items-end justify-between gap-2">
            <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} size={5.5} />
            <Stats brand={brand} c={c} color={page.text} mutedColor={pageMuted} size={10} />
          </div>
        </div>
      </div>
    ),
    // 30 — Corner Card. The action sits in a card cut into the colour.
    (
      <div className="w-full h-full" style={{ backgroundColor: brandT.bg, padding: 10 }}>
        <div className="w-full h-full flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <Mark brand={brand} ground={brandT.bg} height={11} />
            <Nav brand={brand} c={c} color={brandT.text} size={5} gap={5} />
          </div>
          <div className="flex flex-col" style={{ gap: 3, width: '64%' }}>
            <Eyebrow brand={brand} c={c} color={brandMuted} size={5.5} />
            <Headline brand={brand} c={c} color={brandT.text} size={14} lines={2} />
          </div>
          <div className="flex items-end justify-between gap-2">
            <Stats brand={brand} c={c} color={brandT.text} mutedColor={brandMuted} size={10} />
            <div
              className="flex flex-col"
              style={{ backgroundColor: page.bg, borderRadius: 5, padding: 8, gap: 3, width: '56%' }}
            >
              <Subhead brand={brand} c={c} color={pageMuted} size={5.5} lines={2} />
              <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} size={5.5} />
            </div>
          </div>
        </div>
      </div>
    ),
  ];

  return (
    <BrowserWindow brand={brand} c={c} chrome={subtle} page={page}>
      <div className="absolute inset-0">{designs[templateIndex] ?? designs[0]}</div>
    </BrowserWindow>
  );
}

/**
 * Thirty designs, in `ext-1`…`ext-30`.
 *
 * A template id is a persistence key, so `ext-13`…`ext-30` were held
 * empty rather than renumbered while they were archived — and the
 * eighteen restored on 2026-09-09 went back into those exact slots, so a
 * customization saved under `website-ext-21` before the cull still opens
 * the design at index 21. The archived list below DERIVES from this
 * array's length, which is now zero entries long: nothing in this family
 * is hidden any more.
 */
const KEPT_NAMES = [
  'Centre Stage',
  'Split Field',
  'Editorial',
  'Side Rail',
  'Night Shift',
  'Underline',
  'Panel Card',
  'Ledger',
  'Banner',
  'Wide Type',
  'Column Grid',
  'Corner Mark',
  'Reverse Split',
  'Float Card',
  'Marquee',
  'Deep Field',
  'Right Rail',
  'Foot Band',
  'Pill Row',
  'Framed Lede',
  'Stack Bands',
  'Left Rule',
  'Quiet Top',
  'Colour Column',
  'Cell Grid',
  'Inset Frame',
  'Base Nav',
  'Tint Wash',
  'Half Page',
  'Corner Card',
] as const;

export const WEB_WEBSITE_EXTENDED = Array.from({ length: 30 }, (_, i) => ({
  idSuffix: `ext-${i + 1}`,
  name: KEPT_NAMES[i] ?? `Website ${i + 1}`,
  category: 'Modern',
}));

/**
 * Curation, declared where the designs are. See the Favicon renderer’s
 * note: names and tags live beside the artwork and `curation/web.ts`
 * reads them, so restoring a design is one edit in this file — the name
 * map, the tag map and the archived list all follow `KEPT_NAMES`.
 */
export const WEBSITE_NAMES: Record<string, string> = Object.fromEntries(
  KEPT_NAMES.map((name, i) => [`website-ext-${i + 1}`, name]),
);

export const WEBSITE_TAGS: Record<string, string[]> = {
  'website-ext-1': ['SaaS', 'Bold', 'Brand colour'],
  'website-ext-2': ['Agency', 'Split', 'Modern'],
  'website-ext-3': ['Publishing', 'Editorial', 'Light'],
  'website-ext-4': ['Product', 'App-like', 'Modern'],
  'website-ext-5': ['Tech', 'Dark', 'Modern'],
  'website-ext-6': ['Studio', 'Minimal', 'Light'],
  'website-ext-7': ['SaaS', 'Card', 'Brand colour'],
  'website-ext-8': ['Consultancy', 'Editorial', 'Minimal'],
  'website-ext-9': ['Retail', 'Bold', 'Light'],
  'website-ext-10': ['Studio', 'Typographic', 'Minimal'],
  'website-ext-11': ['Publishing', 'Grid', 'Light'],
  'website-ext-12': ['Agency', 'Asymmetric', 'Modern'],
  'website-ext-13': ['Agency', 'Split', 'Dark'],
  'website-ext-14': ['SaaS', 'Card', 'Light'],
  'website-ext-15': ['Retail', 'Bold', 'Brand colour'],
  'website-ext-16': ['Tech', 'Dark', 'Centred'],
  'website-ext-17': ['Product', 'App-like', 'Minimal'],
  'website-ext-18': ['Studio', 'Bold', 'Brand colour'],
  'website-ext-19': ['SaaS', 'Modern', 'Light'],
  'website-ext-20': ['Publishing', 'Editorial', 'Minimal'],
  'website-ext-21': ['Agency', 'Grid', 'Brand colour'],
  'website-ext-22': ['Consultancy', 'Minimal', 'Light'],
  'website-ext-23': ['Studio', 'Typographic', 'Centred'],
  'website-ext-24': ['Retail', 'Split', 'Brand colour'],
  'website-ext-25': ['Product', 'Grid', 'Modern'],
  'website-ext-26': ['Publishing', 'Editorial', 'Light'],
  'website-ext-27': ['Studio', 'Asymmetric', 'Minimal'],
  'website-ext-28': ['Consultancy', 'Light', 'Modern'],
  'website-ext-29': ['Startup', 'Bold', 'Brand colour'],
  'website-ext-30': ['Agency', 'Asymmetric', 'Card'],
};

export const WEBSITE_ARCHIVED_IDS: string[] = Array.from(
  { length: 30 - KEPT_NAMES.length },
  (_, i) => `website-ext-${KEPT_NAMES.length + i + 1}`,
);
