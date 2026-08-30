import type { ReactNode } from 'react';
import { Bind } from '@/features/brandkit/content/Bind';
import { fontStack, surface, type SurfaceTokens } from './brandStyle';
import {
  Ctas,
  Eyebrow,
  accentOn,
  Headline,
  Mark,
  Nav,
  Stats,
  Subhead,
  Url,
  heroContent,
  mutedOn,
  ruleOn,
  type WebHeroProps,
} from './WebWebsiteExtended';
import { typePx } from './typeFloor';

/**
 * Landing Page — twelve conversion layouts over the same `webHero` model.
 *
 * What this family used to be: thirty pages that all carried the SAME
 * hardcoded navigation — Product · Pricing · About · Sign in — under a
 * headline nobody wrote, above "trusted by 1k+ brands.", a shell command
 * that installed a package that does not exist, and an FAQ answering
 * questions nobody asked. Not one word of it was editable.
 *
 * Now: `nav[] · eyebrow · headline · subhead · primaryCta · secondaryCta ·
 * stats[] · url`, every one a field, and `stats` renders nothing at all
 * when the customer has not supplied any — a proof band nobody earned is
 * the exact defect this model exists to remove.
 *
 * The primitives are imported from `WebWebsiteExtended`, deliberately:
 * Website and Landing are ONE content model in two frames, and a nav that
 * behaves differently between them would be two answers to one question.
 * What differs is the frame — a Website is drawn inside a browser window,
 * a Landing Page is the full-bleed page itself, with a sticky bar at the
 * top and its address in the footer.
 */

/** The page itself. No chrome — that is the family's whole difference. */
function Page({
  bg,
  children,
  pad = 0,
}: {
  bg: string;
  children: ReactNode;
  pad?: number;
}) {
  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: bg, padding: pad }}
    >
      {children}
    </div>
  );
}

/**
 * The sticky bar every landing page opens with.
 *
 * Module level, not a closure inside the renderer: a component declared
 * during render is a new type on every render, so React remounts its
 * subtree — which drops the caret out of an inline `<Bind>` on the first
 * keystroke.
 */
function TopBar({
  brand,
  c,
  t,
  brandT,
  cta = true,
}: {
  brand: WebHeroProps['brand'];
  c: ReturnType<typeof heroContent>;
  t: SurfaceTokens;
  brandT: SurfaceTokens;
  cta?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 shrink-0"
      style={{
        backgroundColor: t.bg,
        padding: '7px 12px',
        borderBottom: `1px solid ${ruleOn(t)}`,
      }}
    >
      <Mark brand={brand} ground={t.bg} height={10} />
      <Nav brand={brand} c={c} color={t.text} size={5.5} gap={7} />
      {cta ? (
        <span
          className="inline-flex items-center shrink-0"
          style={{ backgroundColor: brandT.bg, borderRadius: 999, padding: '2px 7px' }}
        >
          <Bind
            path="primaryCta"
            value={c.primaryCta}
            fit="clamp"
            style={{
              color: brandT.text,
              fontFamily: fontStack(brand, 'body'),
              fontSize: typePx(5.5),
              fontWeight: 600,
              lineHeight: 1.2,
            }}
          />
        </span>
      ) : null}
    </div>
  );
}

export function WebLandingPageExtendedRenderer({ brand, templateIndex, content }: WebHeroProps) {
  const c = heroContent(brand, content);
  const page = surface(brand, 'card');
  const subtle = surface(brand, 'subtle');
  const inverted = surface(brand, 'inverted');
  const brandT = surface(brand, 'brand');

  const pageMuted = mutedOn(page);
  const subtleMuted = mutedOn(subtle);
  const invMuted = mutedOn(inverted);
  const brandMuted = mutedOn(brandT);

  const designs: ReactNode[] = [
    // 1 — Centre Hero. The default reading: one message, one action.
    (
      <Page bg={page.bg}>
        <TopBar brand={brand} c={c} t={page} brandT={brandT} cta={false} />
        <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ padding: 12, gap: 5 }}>
          <Eyebrow brand={brand} c={c} color={accentOn(page)} />
          <Headline brand={brand} c={c} color={page.text} size={17} lines={2} align="center" />
          <div style={{ maxWidth: '80%' }}>
            <Subhead brand={brand} c={c} color={pageMuted} lines={2} align="center" />
          </div>
          <div className="pt-1">
            <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} center />
          </div>
          <Stats brand={brand} c={c} color={page.text} mutedColor={pageMuted} size={12} align="center" />
        </div>
        <div
          className="flex items-center justify-center shrink-0"
          style={{ padding: '5px 12px', borderTop: `1px solid ${ruleOn(page)}` }}
        >
          <Url brand={brand} c={c} color={pageMuted} size={5.5} />
        </div>
      </Page>
    ),
    // 2 — Split Hero. Copy left, the brand's own field right.
    (
      <Page bg={page.bg}>
        <TopBar brand={brand} c={c} t={page} brandT={brandT} />
        <div className="flex-1 flex min-h-0">
          <div className="w-[56%] flex flex-col justify-center" style={{ padding: 12, gap: 4 }}>
            <Eyebrow brand={brand} c={c} color={accentOn(page)} />
            <Headline brand={brand} c={c} color={page.text} size={15} lines={4} />
            <Subhead brand={brand} c={c} color={pageMuted} lines={2} />
            <div className="pt-1">
              <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} />
            </div>
          </div>
          {/* The brand's own field. It carries the MARK first and the stats
              second, because the stats are usually absent — a panel that is
              only stats is a large empty rectangle on most brands' page,
              which is the "finished without them" rule broken by the one
              layout that leans on them hardest. */}
          <div
            className="flex-1 flex flex-col justify-between items-start"
            style={{ backgroundColor: brandT.bg, padding: 11 }}
          >
            <Mark brand={brand} ground={brandT.bg} height={20} />
            <Stats brand={brand} c={c} color={brandT.text} mutedColor={brandMuted} size={13} />
            <Url brand={brand} c={c} color={brandT.text} size={5.5} />
          </div>
        </div>
      </Page>
    ),
    // 3 — Proof Band. Built around the numbers — and complete without them.
    (
      <Page bg={subtle.bg}>
        <TopBar brand={brand} c={c} t={subtle} brandT={brandT} />
        <div className="flex-1 flex flex-col justify-center" style={{ padding: 12, gap: 4 }}>
          <Eyebrow brand={brand} c={c} color={accentOn(subtle)} />
          <Headline brand={brand} c={c} color={subtle.text} size={16} lines={2} />
          <Subhead brand={brand} c={c} color={subtleMuted} lines={2} />
          <div className="pt-1">
            <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={subtle.text} />
          </div>
        </div>
        <div
          className="flex items-center justify-between gap-2 shrink-0"
          style={{ backgroundColor: brandT.bg, padding: '8px 12px' }}
        >
          <Stats brand={brand} c={c} color={brandT.text} mutedColor={brandMuted} size={13} />
          <Url brand={brand} c={c} color={brandT.text} size={5.5} />
        </div>
      </Page>
    ),
    // 4 — Big Type. The headline at the size it deserves.
    (
      <Page bg={page.bg}>
        <TopBar brand={brand} c={c} t={page} brandT={brandT} cta={false} />
        <div className="flex-1 flex flex-col justify-center" style={{ padding: 12, gap: 5 }}>
          <Eyebrow brand={brand} c={c} color={accentOn(page)} />
          <Headline brand={brand} c={c} color={page.text} size={22} lines={3} />
        </div>
        <div
          className="flex items-end justify-between gap-3 shrink-0"
          style={{ padding: 12, borderTop: `1px solid ${ruleOn(page)}` }}
        >
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <Subhead brand={brand} c={c} color={pageMuted} lines={2} />
            <Url brand={brand} c={c} color={pageMuted} size={5.5} />
          </div>
          <div className="flex flex-col items-end" style={{ gap: 5 }}>
            <Stats brand={brand} c={c} color={page.text} mutedColor={pageMuted} size={11} />
            <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} />
          </div>
        </div>
      </Page>
    ),
    // 5 — Offset. The hero sits low and left; the brand holds the corner.
    (
      <Page bg={page.bg}>
        <div className="flex-1 relative min-h-0">
          <div
            className="absolute right-0 top-0 flex flex-col justify-between"
            style={{ backgroundColor: brandT.bg, width: '40%', height: '100%', padding: 11 }}
          >
            <Nav brand={brand} c={c} color={brandT.text} vertical gap={4} size={5.5} />
            <Stats brand={brand} c={c} color={brandT.text} mutedColor={brandMuted} size={12} />
          </div>
          <div
            className="absolute left-0 bottom-0 flex flex-col"
            style={{ padding: 12, gap: 4, width: '64%' }}
          >
            <Eyebrow brand={brand} c={c} color={accentOn(page)} />
            <Headline brand={brand} c={c} color={page.text} size={15} lines={3} />
            <Subhead brand={brand} c={c} color={pageMuted} lines={2} />
            <div className="pt-1">
              <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} size={5.5} />
            </div>
          </div>
          <div className="absolute left-0 top-0 flex items-center gap-2" style={{ padding: 11 }}>
            <Mark brand={brand} ground={page.bg} height={10} />
            <Url brand={brand} c={c} color={pageMuted} size={5.5} />
          </div>
        </div>
      </Page>
    ),
    // 6 — Night. The whole page inverted; the button is the only light.
    (
      <Page bg={inverted.bg}>
        <TopBar brand={brand} c={c} t={inverted} brandT={brandT} cta={false} />
        <div className="flex-1 flex flex-col justify-center" style={{ padding: 12, gap: 5 }}>
          <Eyebrow brand={brand} c={c} color={accentOn(inverted)} />
          <Headline brand={brand} c={c} color={inverted.text} size={18} lines={2} />
          <div style={{ maxWidth: '76%' }}>
            <Subhead brand={brand} c={c} color={invMuted} lines={2} />
          </div>
          <div className="pt-1">
            <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={inverted.text} />
          </div>
          <Stats brand={brand} c={c} color={inverted.text} mutedColor={invMuted} size={12} />
          <Url brand={brand} c={c} color={invMuted} size={5.5} />
        </div>
      </Page>
    ),
    // 7 — Sign-up Card. The action gets its own panel, as a form would.
    (
      <Page bg={subtle.bg}>
        <TopBar brand={brand} c={c} t={subtle} brandT={brandT} cta={false} />
        <div className="flex-1 flex gap-3 min-h-0" style={{ padding: 12 }}>
          <div className="flex-1 flex flex-col justify-center min-w-0" style={{ gap: 4 }}>
            <Eyebrow brand={brand} c={c} color={accentOn(subtle)} />
            <Headline brand={brand} c={c} color={subtle.text} size={14} lines={3} />
            <Stats brand={brand} c={c} color={subtle.text} mutedColor={subtleMuted} size={11} />
          </div>
          <div
            className="w-[42%] flex flex-col justify-between"
            style={{ backgroundColor: page.bg, borderRadius: 6, padding: 10, border: `1px solid ${ruleOn(page)}` }}
          >
            <Subhead brand={brand} c={c} color={pageMuted} size={5.5} lines={3} />
            <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} size={5.5} />
          </div>
        </div>
        <div
          className="flex items-center justify-center shrink-0"
          style={{ padding: '5px 12px', borderTop: `1px solid ${ruleOn(subtle)}` }}
        >
          <Url brand={brand} c={c} color={subtleMuted} size={5.5} />
        </div>
      </Page>
    ),
    // 8 — Badge. The eyebrow becomes a pill, the way a launch page does.
    (
      <Page bg={page.bg}>
        <TopBar brand={brand} c={c} t={page} brandT={brandT} />
        <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ padding: 12, gap: 5 }}>
          <span
            className="inline-flex items-center"
            style={{ backgroundColor: subtle.bg, border: `1px solid ${ruleOn(subtle)}`, borderRadius: 999, padding: '2px 8px' }}
          >
            <Eyebrow brand={brand} c={c} color={subtle.text} size={5.5} />
          </span>
          <Headline brand={brand} c={c} color={page.text} size={17} lines={2} align="center" />
          <div style={{ maxWidth: '78%' }}>
            <Subhead brand={brand} c={c} color={pageMuted} lines={2} align="center" />
          </div>
          <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} center />
        </div>
        <div
          className="flex items-center justify-between gap-2 shrink-0"
          style={{ padding: '5px 12px', borderTop: `1px solid ${ruleOn(page)}` }}
        >
          <Url brand={brand} c={c} color={pageMuted} size={5.5} />
          <Stats brand={brand} c={c} color={page.text} mutedColor={pageMuted} size={10} />
        </div>
      </Page>
    ),
    // 9 — Closing Band. Everything drives to a full-width brand footer.
    (
      <Page bg={page.bg}>
        <TopBar brand={brand} c={c} t={page} brandT={brandT} cta={false} />
        <div className="flex-1 flex flex-col justify-center" style={{ padding: 12, gap: 4 }}>
          <Eyebrow brand={brand} c={c} color={accentOn(page)} />
          <Headline brand={brand} c={c} color={page.text} size={15} lines={2} />
          <Subhead brand={brand} c={c} color={pageMuted} lines={3} />
          <Stats brand={brand} c={c} color={page.text} mutedColor={pageMuted} size={11} />
        </div>
        <div
          className="flex items-center justify-between gap-3 shrink-0"
          style={{ backgroundColor: brandT.bg, padding: '10px 12px' }}
        >
          <Url brand={brand} c={c} color={brandT.text} size={6} />
          <Ctas brand={brand} c={c} fill={page.bg} ghost={brandT.text} />
        </div>
      </Page>
    ),
    // 10 — Rail. A colour rail down the left edge, content beside it.
    (
      <Page bg={page.bg}>
        <div className="flex-1 flex min-h-0">
          <div
            className="w-[16%] flex flex-col items-center justify-between"
            style={{ backgroundColor: brandT.bg, padding: '10px 4px' }}
          >
            <Mark brand={brand} ground={brandT.bg} height={10} />
            <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              <Url brand={brand} c={c} color={brandT.text} size={5.5} />
            </div>
          </div>
          <div className="flex-1 flex flex-col min-w-0">
            <div
              className="flex items-center justify-end shrink-0"
              style={{ padding: '7px 12px', borderBottom: `1px solid ${ruleOn(page)}` }}
            >
              <Nav brand={brand} c={c} color={page.text} size={5.5} gap={7} />
            </div>
            <div className="flex-1 flex flex-col justify-center" style={{ padding: 12, gap: 4 }}>
              <Eyebrow brand={brand} c={c} color={accentOn(page)} />
              <Headline brand={brand} c={c} color={page.text} size={15} lines={2} />
              <Subhead brand={brand} c={c} color={pageMuted} lines={2} />
              <div className="flex items-end justify-between gap-2 pt-1">
                <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} size={5.5} />
                <Stats brand={brand} c={c} color={page.text} mutedColor={pageMuted} size={11} />
              </div>
            </div>
          </div>
        </div>
      </Page>
    ),
    // 11 — Ruled. Editorial hairlines instead of boxes.
    (
      <Page bg={page.bg} pad={12}>
        <div
          className="flex items-center justify-between gap-2 pb-2"
          style={{ borderBottom: `1px solid ${ruleOn(page)}` }}
        >
          <Eyebrow brand={brand} c={c} color={accentOn(page)} />
          <Nav brand={brand} c={c} color={pageMuted} size={5} gap={6} />
        </div>
        <div className="flex-1 flex flex-col justify-center" style={{ gap: 5 }}>
          <Headline brand={brand} c={c} color={page.text} size={18} lines={2} />
          <div style={{ height: 1, backgroundColor: ruleOn(page) }} />
          <Subhead brand={brand} c={c} color={pageMuted} lines={2} />
        </div>
        <div
          className="flex items-end justify-between gap-2 pt-2"
          style={{ borderTop: `1px solid ${ruleOn(page)}` }}
        >
          <Ctas brand={brand} c={c} fill={brandT.bg} onFill={brandT.text} ghost={page.text} />
          <div className="flex flex-col items-end gap-1">
            <Stats brand={brand} c={c} color={page.text} mutedColor={pageMuted} size={11} />
            <Url brand={brand} c={c} color={pageMuted} size={5.5} />
          </div>
        </div>
      </Page>
    ),
    // 12 — Poster. The brand's colour edge to edge, the page as a poster.
    (
      <Page bg={brandT.bg}>
        <div
          className="flex items-center justify-between gap-2 shrink-0"
          style={{ padding: '7px 12px' }}
        >
          <Mark brand={brand} ground={brandT.bg} height={10} />
          <Nav brand={brand} c={c} color={brandT.text} size={5.5} gap={7} />
        </div>
        <div className="flex-1 flex flex-col justify-center" style={{ padding: '0 12px', gap: 4 }}>
          <Eyebrow brand={brand} c={c} color={brandMuted} />
          <Headline brand={brand} c={c} color={brandT.text} size={19} lines={2} />
          <div style={{ maxWidth: '80%' }}>
            <Subhead brand={brand} c={c} color={brandMuted} lines={2} />
          </div>
        </div>
        <div
          className="flex items-center justify-between gap-3 shrink-0"
          style={{ padding: 12 }}
        >
          <Ctas brand={brand} c={c} fill={page.bg} ghost={brandT.text} />
          <div className="flex flex-col items-end gap-1">
            <Stats brand={brand} c={c} color={brandT.text} mutedColor={brandMuted} size={11} />
            <Url brand={brand} c={c} color={brandT.text} size={5.5} />
          </div>
        </div>
      </Page>
    ),
  ];

  return <>{designs[templateIndex] ?? designs[0]}</>;
}

/**
 * Twelve kept designs, in `ext-1`…`ext-12`.
 *
 * Thirty entries stay, because a template id is a persistence key:
 * `ext-13`…`ext-30` are hidden by `curation/web.ts`, never renumbered.
 */
const KEPT_NAMES = [
  'Centre Hero',
  'Split Hero',
  'Proof Band',
  'Big Type',
  'Offset',
  'Night',
  'Sign-up Card',
  'Badge',
  'Closing Band',
  'Rail',
  'Ruled',
  'Poster',
] as const;

export const WEB_LANDING_EXTENDED = Array.from({ length: 30 }, (_, i) => ({
  idSuffix: `ext-${i + 1}`,
  name: KEPT_NAMES[i] ?? `Landing ${i + 1}`,
  category: 'Modern',
}));

/**
 * Curation, declared where the designs are. Names and tags live beside
 * the artwork; `curation/web.ts` reads them, and `ext-13`…`ext-30` stay
 * reserved rather than renumbered.
 */
export const LANDING_NAMES: Record<string, string> = Object.fromEntries(
  KEPT_NAMES.map((name, i) => [`landing-ext-${i + 1}`, name]),
);

export const LANDING_TAGS: Record<string, string[]> = {
  'landing-ext-1': ['SaaS', 'Conversion', 'Light'],
  'landing-ext-2': ['SaaS', 'Split', 'Brand colour'],
  'landing-ext-3': ['Startup', 'Conversion', 'Bold'],
  'landing-ext-4': ['Studio', 'Typographic', 'Minimal'],
  'landing-ext-5': ['Agency', 'Asymmetric', 'Modern'],
  'landing-ext-6': ['Tech', 'Dark', 'Bold'],
  'landing-ext-7': ['SaaS', 'Conversion', 'Card'],
  'landing-ext-8': ['Launch', 'Centred', 'Light'],
  'landing-ext-9': ['Startup', 'Conversion', 'Brand colour'],
  'landing-ext-10': ['Product', 'Modern', 'Brand colour'],
  'landing-ext-11': ['Consultancy', 'Editorial', 'Minimal'],
  'landing-ext-12': ['Event', 'Bold', 'Brand colour'],
};

export const LANDING_ARCHIVED_IDS: string[] = Array.from(
  { length: 30 - KEPT_NAMES.length },
  (_, i) => `landing-ext-${KEPT_NAMES.length + i + 1}`,
);
