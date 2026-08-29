import type { CSSProperties, ReactNode } from 'react';
import type { Brand } from '@/shared/types/brand';
import type { DeliverableContent, ProfileContent } from '@/features/brandkit/content/kinds';
import { hydrateContent } from '@/features/brandkit/content/kinds';
import { Bind } from '@/features/brandkit/content/Bind';
import { logoUrl } from '@/shared/brand/logoUrl';
import {
  contrastOf,
  fgOn,
  fontStack,
  logoOn,
  surface,
  type SurfaceTokens,
} from './brandStyle';

/**
 * Favicon — twelve designs, one content model.
 *
 * What this family used to be: thirty browser-tab stills, every one of
 * them showing `https://brand.com` in the address bar and thirteen of
 * them titled "Brand". The mark inside the tab was a hardcoded glyph —
 * a star, a diamond, a pie chart — chosen by template index and owned by
 * nobody, so a customer looking at their favicon saw somebody else's.
 *
 * What it is now: the `profile` content kind, painted twelve ways.
 *
 *   glyph     which mark sits in the frame — the brand's logo, its icon
 *             mark, or the letters below
 *   text      the letters, when the mark is a monogram (or when the
 *             brand has no logo file to place)
 *   tabTitle  what a browser tab says
 *   url       what the address bar says
 *
 * A favicon is not one picture, it is one mark at several sizes on
 * several grounds, so the designs are DELIVERY CONTEXTS rather than
 * decorations: the tab, a dark tab, a search result, an app icon, a home
 * screen, the 16/32/180 ladder, the corner-radius study, the four
 * grounds, and four single-mark treatments. Every one of them is the
 * customer's own mark, and every string on them is a field.
 *
 * Sizes are absolute because the whole kit is drawn at 260px and scaled
 * (`ScalingStage`); 16 and 32 here really are 16 and 32 in a browser.
 */

interface Props {
  brand: Brand;
  templateIndex: number;
  /** The kit's content object. Narrowed to `profile` inside. */
  content?: DeliverableContent;
}

/** Shape vocabulary for the mark's container. */
type MarkShape = 'square' | 'rounded' | 'squircle' | 'circle';

const RADIUS: Record<MarkShape, (px: number) => string> = {
  square: () => '0',
  rounded: (px) => `${Math.max(2, Math.round(px * 0.18))}px`,
  squircle: (px) => `${Math.max(3, Math.round(px * 0.28))}px`,
  circle: () => '50%',
};

/** The three sizes a favicon is actually delivered at. */
const DELIVERY_SIZES = [16, 32, 180] as const;

/**
 * `textMuted`, but only where it really reads.
 *
 * `pickSurfaceTokens` mixes a muted ink 35% toward its own ground, which
 * is comfortably readable on a paper surface and marginal on a saturated
 * brand one. Asking the question is cheaper than discovering the answer
 * in the contrast sweep.
 */
function mutedOn(t: SurfaceTokens): string {
  return contrastOf(t.textMuted, t.bg) >= 4.5 ? t.textMuted : t.text;
}

/**
 * The mark itself — the one place `glyph` is interpreted.
 *
 * The fallback order is deliberate and it is a fallback, not a
 * preference: a logo the brand owns is placed when it READS on this
 * ground (`logoOn` measures; it never picks by tone), and the letters are
 * what a brand with no usable artwork gets rather than an empty tile.
 * That is also why `text` stays bound on every design — a favicon whose
 * monogram is not editable is the placeholder problem again, one glyph
 * further down.
 */
function Mark({
  brand,
  content,
  ground,
  size,
  shape = 'rounded',
  ring,
}: {
  brand: Brand;
  content: ProfileContent;
  ground: string;
  size: number;
  shape?: MarkShape;
  ring?: string;
}) {
  const ink = fgOn(ground);
  const placed =
    content.glyph === 'logo'
      ? logoOn(brand, ground)?.url
      : content.glyph === 'custom'
        ? logoUrl(brand, 'iconmark')
        : undefined;

  const style: CSSProperties = {
    width: size,
    height: size,
    backgroundColor: ground,
    borderRadius: RADIUS[shape](size),
    ...(ring ? { boxShadow: `0 0 0 ${Math.max(1, Math.round(size * 0.04))}px ${ring}` } : {}),
  };

  return (
    <div
      data-bind="glyph"
      className="flex items-center justify-center overflow-hidden shrink-0"
      style={style}
    >
      {placed ? (
        <img
          src={placed}
          alt=""
          style={{ width: '68%', height: '68%', objectFit: 'contain' }}
        />
      ) : (
        <Bind
          path="text"
          value={content.text}
          fit="shrink"
          placeholder="•"
          style={{
            color: ink,
            fontFamily: fontStack(brand, 'heading'),
            fontWeight: 800,
            fontSize: Math.max(6, Math.round(size * 0.46)),
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        />
      )}
    </div>
  );
}

/** The tab title, as a browser draws it. */
function TabTitle({
  content,
  color,
  brand,
  size = 7,
  weight = 500,
}: {
  content: ProfileContent;
  color: string;
  brand: Brand;
  size?: number;
  weight?: number;
}) {
  return (
    <Bind
      path="tabTitle"
      value={content.tabTitle}
      fit="clamp"
      style={{
        color,
        fontFamily: fontStack(brand, 'body'),
        fontSize: size,
        fontWeight: weight,
        lineHeight: 1.2,
      }}
    />
  );
}

function Url({
  content,
  color,
  brand,
  size = 6.5,
  uppercase = false,
}: {
  content: ProfileContent;
  color: string;
  brand: Brand;
  size?: number;
  uppercase?: boolean;
}) {
  return (
    <Bind
      path="url"
      value={content.url}
      fit="clamp"
      style={{
        color,
        fontFamily: fontStack(brand, 'body'),
        fontSize: size,
        lineHeight: 1.2,
        ...(uppercase ? { textTransform: 'uppercase', letterSpacing: '0.18em' } : {}),
      }}
    />
  );
}

/** A browser window: tab strip, address bar, and whatever page you pass. */
function Window({
  brand,
  content,
  chrome,
  page,
  children,
}: {
  brand: Brand;
  content: ProfileContent;
  chrome: SurfaceTokens;
  page: SurfaceTokens;
  children?: ReactNode;
}) {
  const chromeMuted = mutedOn(chrome);
  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: page.bg, borderRadius: 6, border: `1px solid ${chrome.border}` }}
    >
      {/* tab strip */}
      <div
        className="flex items-end gap-1 px-1.5 pt-1.5"
        style={{ backgroundColor: chrome.bg, height: 24 }}
      >
        <div
          className="flex items-center gap-1 px-1.5 py-1 min-w-0"
          style={{ backgroundColor: page.bg, borderRadius: '4px 4px 0 0', maxWidth: '62%' }}
        >
          <Mark brand={brand} content={content} ground={page.accent} size={10} shape="rounded" />
          <TabTitle content={content} color={page.text} brand={brand} size={6.5} />
        </div>
        <div
          className="px-1.5 py-1"
          style={{ backgroundColor: chrome.border, borderRadius: '4px 4px 0 0', width: 26, height: 12 }}
        />
      </div>
      {/* address bar */}
      <div
        className="flex items-center gap-1 px-1.5 py-1"
        style={{ backgroundColor: chrome.bg, borderTop: `1px solid ${chrome.border}` }}
      >
        <span
          className="rounded-full shrink-0"
          style={{ width: 4, height: 4, backgroundColor: chromeMuted }}
        />
        <div
          className="flex-1 min-w-0 px-1.5 py-0.5 flex items-center"
          style={{ backgroundColor: page.bg, borderRadius: 999, height: 12 }}
        >
          <Url content={content} color={mutedOn(page)} brand={brand} size={6} />
        </div>
      </div>
      <div className="flex-1 min-h-0 relative">{children}</div>
    </div>
  );
}

/**
 * Every design sits on one ground, full bleed.
 *
 * Module level, not a closure inside the renderer: a component defined
 * during render is a NEW type on every render, so React unmounts and
 * remounts its subtree — which would drop the caret out of an inline
 * `<Bind>` on the first keystroke.
 */
function Sheet({ t, children, pad = 14 }: { t: SurfaceTokens; children: ReactNode; pad?: number }) {
  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: t.bg, padding: pad }}
    >
      {children}
    </div>
  );
}

export function WebFaviconExtendedRenderer({ brand, templateIndex, content }: Props) {
  // The drilldown grid and every offscreen export render with no content
  // object at all; the kind's own defaults are what they should show, and
  // they come from the brand rather than from this file.
  const c = (
    content && content.kind === 'profile'
      ? content
      : hydrateContent('profile', brand, undefined)
  ) as ProfileContent;

  const page = surface(brand, 'card');
  const subtle = surface(brand, 'subtle');
  const inverted = surface(brand, 'inverted');
  const brandT = surface(brand, 'brand');
  const heading = fontStack(brand, 'heading');
  const body = fontStack(brand, 'body');

  const designs: ReactNode[] = [
    // 1 — Browser Tab. The favicon where it is first seen.
    (
      <div className="w-full h-full" style={{ backgroundColor: subtle.bg, padding: 12 }}>
        <Window brand={brand} content={c} chrome={subtle} page={page}>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Mark brand={brand} content={c} ground={brandT.bg} size={56} shape="squircle" />
            <TabTitle content={c} color={page.text} brand={brand} size={9} weight={600} />
          </div>
        </Window>
      </div>
    ),
    // 2 — Dark Tab. The same mark where half the world browses.
    (
      <div className="w-full h-full" style={{ backgroundColor: inverted.bg, padding: 12 }}>
        <Window brand={brand} content={c} chrome={inverted} page={inverted}>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Mark brand={brand} content={c} ground={inverted.bg} size={56} shape="squircle" ring={inverted.border} />
            <TabTitle content={c} color={inverted.text} brand={brand} size={9} weight={600} />
          </div>
        </Window>
      </div>
    ),
    // 3 — Search Result. Where a favicon does the most work.
    (
      <Sheet t={page} pad={16}>
        <div className="flex-1 flex flex-col justify-center gap-3">
          <div className="flex items-center gap-2">
            <Mark brand={brand} content={c} ground={brandT.bg} size={18} shape="circle" />
            <div className="min-w-0 flex flex-col">
              <TabTitle content={c} color={page.text} brand={brand} size={8} weight={600} />
              <Url content={c} color={mutedOn(page)} brand={brand} size={7} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div style={{ height: 5, width: '86%', backgroundColor: page.border, borderRadius: 3 }} />
            <div style={{ height: 5, width: '72%', backgroundColor: page.border, borderRadius: 3 }} />
            <div style={{ height: 5, width: '55%', backgroundColor: page.border, borderRadius: 3 }} />
          </div>
        </div>
      </Sheet>
    ),
    // 4 — App Icon. The 180px delivery, at 180px.
    (
      <Sheet t={brandT} pad={16}>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Mark brand={brand} content={c} ground={page.bg} size={132} shape="squircle" />
          <div className="flex flex-col items-center gap-0.5">
            <TabTitle content={c} color={brandT.text} brand={brand} size={11} weight={700} />
            <Url content={c} color={brandT.text} brand={brand} size={7} uppercase />
          </div>
        </div>
      </Sheet>
    ),
    // 5 — Home Screen. The mark beside strangers, which is the test.
    (
      <Sheet t={subtle} pad={16}>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="grid grid-cols-3 gap-3 items-start">
            <div className="flex flex-col items-center gap-1">
              <Mark brand={brand} content={c} ground={brandT.bg} size={52} shape="squircle" />
              <TabTitle content={c} color={subtle.text} brand={brand} size={7} weight={600} />
            </div>
            <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: subtle.border }} />
            <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: subtle.border }} />
          </div>
          <Url content={c} color={mutedOn(subtle)} brand={brand} size={7} uppercase />
        </div>
      </Sheet>
    ),
    // 6 — Size Ladder. 180, 32 and 16 — the three files a site ships.
    (
      <Sheet t={page} pad={14}>
        <TabTitle content={c} color={page.text} brand={brand} size={8} weight={600} />
        <div className="flex-1 flex items-center justify-center gap-4">
          <div className="flex flex-col items-center gap-1.5">
            <Mark brand={brand} content={c} ground={brandT.bg} size={DELIVERY_SIZES[2]} shape="squircle" />
            <span style={{ color: mutedOn(page), fontFamily: body, fontSize: 6 }}>
              {DELIVERY_SIZES[2]}
            </span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-col items-center gap-1.5">
              <Mark brand={brand} content={c} ground={brandT.bg} size={DELIVERY_SIZES[1]} shape="rounded" />
              <span style={{ color: mutedOn(page), fontFamily: body, fontSize: 6 }}>
                {DELIVERY_SIZES[1]}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Mark brand={brand} content={c} ground={brandT.bg} size={DELIVERY_SIZES[0]} shape="rounded" />
              <span style={{ color: mutedOn(page), fontFamily: body, fontSize: 6 }}>
                {DELIVERY_SIZES[0]}
              </span>
            </div>
          </div>
        </div>
        <Url content={c} color={mutedOn(page)} brand={brand} size={7} />
      </Sheet>
    ),
    // 7 — Radius Study. One mark, four containers.
    (
      <Sheet t={page} pad={16}>
        <TabTitle content={c} color={page.text} brand={brand} size={9} weight={600} />
        <div className="flex-1 flex items-center justify-between">
          {(['square', 'rounded', 'squircle', 'circle'] as MarkShape[]).map((shape) => (
            <Mark key={shape} brand={brand} content={c} ground={brandT.bg} size={44} shape={shape} />
          ))}
        </div>
        <Url content={c} color={mutedOn(page)} brand={brand} size={7} uppercase />
      </Sheet>
    ),
    // 8 — Four Grounds. Where it has to survive.
    (
      <Sheet t={page} pad={14}>
        <div className="flex-1 grid grid-cols-2 gap-2">
          {[brandT, inverted, subtle, page].map((t, i) => (
            <div
              key={i}
              className="flex items-center justify-center"
              style={{ backgroundColor: t.bg, border: `1px solid ${page.border}`, borderRadius: 4 }}
            >
              <Mark brand={brand} content={c} ground={t.bg} size={38} shape="rounded" />
            </div>
          ))}
        </div>
        <div className="flex items-baseline justify-between gap-2 pt-2">
          <TabTitle content={c} color={page.text} brand={brand} size={7.5} weight={600} />
          <Url content={c} color={mutedOn(page)} brand={brand} size={6.5} />
        </div>
      </Sheet>
    ),
    // 9 — Circle Mark. The avatar cut, ringed in the brand's own colour.
    (
      <Sheet t={page} pad={16}>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <TabTitle content={c} color={mutedOn(page)} brand={brand} size={7} weight={600} />
          <Mark brand={brand} content={c} ground={brandT.bg} size={120} shape="circle" ring={page.border} />
          <Url content={c} color={page.text} brand={brand} size={8} uppercase />
        </div>
      </Sheet>
    ),
    // 10 — Badge. A mark that has to read at a glance on a dark rail.
    (
      <Sheet t={inverted} pad={16}>
        <div className="flex-1 flex items-center gap-4">
          <Mark brand={brand} content={c} ground={brandT.bg} size={96} shape="squircle" ring={inverted.border} />
          <div className="flex flex-col gap-1 min-w-0">
            <TabTitle content={c} color={inverted.text} brand={brand} size={11} weight={700} />
            <Url content={c} color={mutedOn(inverted)} brand={brand} size={7} uppercase />
          </div>
        </div>
      </Sheet>
    ),
    // 11 — Split Chrome. Light and dark, side by side, same mark.
    (
      <div className="w-full h-full flex overflow-hidden">
        <div
          className="w-1/2 h-full flex flex-col items-center justify-center gap-2"
          style={{ backgroundColor: page.bg }}
        >
          <Mark brand={brand} content={c} ground={page.bg} size={72} shape="circle" ring={page.border} />
          <TabTitle content={c} color={page.text} brand={brand} size={7.5} weight={600} />
        </div>
        <div
          className="w-1/2 h-full flex flex-col items-center justify-center gap-2"
          style={{ backgroundColor: inverted.bg }}
        >
          <Mark brand={brand} content={c} ground={inverted.bg} size={72} shape="circle" ring={inverted.border} />
          <Url content={c} color={inverted.text} brand={brand} size={7} />
        </div>
      </div>
    ),
    // 12 — Pinned Tabs. Sixteen pixels, three grounds, no title to hide behind.
    (
      <Sheet t={subtle} pad={16}>
        <div className="flex-1 flex flex-col justify-center gap-3">
          <div className="flex items-end gap-1.5">
            {[brandT, inverted, page].map((t, i) => (
              <div
                key={i}
                className="flex items-center justify-center"
                style={{
                  backgroundColor: page.bg,
                  border: `1px solid ${subtle.border}`,
                  borderRadius: '5px 5px 0 0',
                  width: 34,
                  height: 26,
                }}
              >
                <Mark brand={brand} content={c} ground={t.bg} size={16} shape="rounded" />
              </div>
            ))}
            <div className="flex-1 min-w-0 pb-1 pl-1">
              <TabTitle content={c} color={subtle.text} brand={brand} size={7.5} weight={600} />
            </div>
          </div>
          <div
            className="flex items-center px-2"
            style={{ backgroundColor: page.bg, borderRadius: 999, height: 16, border: `1px solid ${subtle.border}` }}
          >
            <Url content={c} color={mutedOn(page)} brand={brand} size={7} />
          </div>
        </div>
        <div style={{ height: 3, width: 46, backgroundColor: brandT.bg, borderRadius: 2 }} />
      </Sheet>
    ),
  ];

  return <>{designs[templateIndex] ?? designs[0]}</>;
}

/**
 * Twelve kept designs, in `ext-1`…`ext-12`.
 *
 * The array stays thirty entries long: a template id is a persistence
 * key, so `ext-13`…`ext-30` keep their slots and are hidden by
 * `curation/web.ts` rather than deleted. Renumbering would silently
 * repoint every saved customization at a different design.
 */
const KEPT_NAMES = [
  'Browser Tab',
  'Dark Tab',
  'Search Result',
  'App Icon',
  'Home Screen',
  'Size Ladder',
  'Radius Study',
  'Four Grounds',
  'Circle Mark',
  'Badge',
  'Split Chrome',
  'Pinned Tabs',
] as const;

export const WEB_FAVICON_EXTENDED = Array.from({ length: 30 }, (_, i) => ({
  idSuffix: `ext-${i + 1}`,
  name: KEPT_NAMES[i] ?? `Favicon ${i + 1}`,
  category: 'Modern',
}));
