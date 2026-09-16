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
import { typePx } from './typeFloor';

/**
 * Favicon — thirty designs, one content model.
 *
 * What this family used to be: thirty browser-tab stills, every one of
 * them showing `https://brand.com` in the address bar and thirteen of
 * them titled "Brand". The mark inside the tab was a hardcoded glyph —
 * a star, a diamond, a pie chart — chosen by template index and owned by
 * nobody, so a customer looking at their favicon saw somebody else's.
 *
 * What it is now: the `profile` content kind, painted thirty ways.
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
 * decorations — every place the mark is really seen, plus the spec
 * sheets a developer is handed. The browser (tab, dark tab, address bar,
 * bookmark bar, new tab, search result, link unfurl, pinned tabs, sign
 * in), the device (app icon, home screen, dock, widget, splash, install
 * card, app switcher, notification), the places it stands in for a
 * PERSON (search result, inbox row, facepile, profile card), and the
 * sheets (the 16/32/180 ladder, corner radius, four grounds, keyline
 * grid, clear space, pixel grid, type lockup). Every one of them is the
 * customer's own mark, and every string on them is a field.
 *
 * Half of these measure the mark against its NEIGHBOURS — a dock, a
 * shortcut grid, a facepile, a bookmark strip — because a favicon is
 * never seen alone, and "does it read" is a different question from
 * "does it read beside three strangers at the same size".
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
            fontSize: typePx(Math.max(6, Math.round(size * 0.46))),
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
        fontSize: typePx(size),
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
        fontSize: typePx(size),
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

/**
 * A neutral bar. Never a word — it is the page a favicon sits on, drawn
 * at the scale a favicon is seen at, and a preview that wrote text there
 * would be inventing the customer's content again.
 */
function Slab({
  color,
  width,
  height = 5,
  style,
}: {
  color: string;
  width: number | string;
  height?: number;
  style?: CSSProperties;
}) {
  return (
    <div style={{ width, height, backgroundColor: color, borderRadius: 3, ...style }} />
  );
}

/**
 * A stranger's icon.
 *
 * Half of these designs measure the mark against the company it actually
 * keeps — a dock, a shortcut grid, a facepile — and the neighbours have to
 * be present, blank and the same size for that to mean anything.
 */
function Blank({
  color,
  size,
  radius = 6,
  ring,
}: {
  color: string;
  size: number;
  radius?: number | string;
  ring?: string;
}) {
  return (
    <div
      className="shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: radius,
        ...(ring ? { boxShadow: `0 0 0 2px ${ring}` } : {}),
      }}
    />
  );
}

/** The clear space the spec sheet publishes, in canvas px. */
const CLEAR_SPACE = 16;

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
  // Four GROUNDS means four different grounds: `subtle` and `card` are a
  // shade apart on most brands, so the grid used to show the same near-white
  // twice and claim it had proved something.
  const secondaryT = surface(brand, 'brand-secondary');
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
            <span style={{ color: mutedOn(page), fontFamily: body, fontSize: typePx(6) }}>
              {DELIVERY_SIZES[2]}
            </span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-col items-center gap-1.5">
              <Mark brand={brand} content={c} ground={brandT.bg} size={DELIVERY_SIZES[1]} shape="rounded" />
              <span style={{ color: mutedOn(page), fontFamily: body, fontSize: typePx(6) }}>
                {DELIVERY_SIZES[1]}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Mark brand={brand} content={c} ground={brandT.bg} size={DELIVERY_SIZES[0]} shape="rounded" />
              <span style={{ color: mutedOn(page), fontFamily: body, fontSize: typePx(6) }}>
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
          {[brandT, secondaryT, inverted, page].map((t, i) => (
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
    // 13 — Bookmark Bar. Saved, and now competing with everything else saved.
    (
      <Sheet t={subtle} pad={12}>
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{ backgroundColor: page.bg, border: `1px solid ${subtle.border}`, borderRadius: 6 }}
        >
          <div
            className="flex items-center px-2 py-1.5"
            style={{ borderBottom: `1px solid ${subtle.border}` }}
          >
            <div
              className="flex-1 min-w-0 flex items-center px-1.5"
              style={{ backgroundColor: subtle.bg, borderRadius: 999, height: 12 }}
            >
              <Url content={c} color={mutedOn(subtle)} brand={brand} size={6} />
            </div>
          </div>
          <div
            className="flex items-center gap-2 px-2 py-1.5"
            style={{ borderBottom: `1px solid ${subtle.border}` }}
          >
            <div className="flex items-center gap-1 min-w-0" style={{ maxWidth: '46%' }}>
              <Mark brand={brand} content={c} ground={brandT.bg} size={12} shape="rounded" />
              <TabTitle content={c} color={page.text} brand={brand} size={6.5} weight={600} />
            </div>
            <Blank color={subtle.border} size={12} radius={3} />
            <Slab color={subtle.border} width={24} height={5} />
            <Blank color={subtle.border} size={12} radius={3} />
            <Slab color={subtle.border} width={18} height={5} />
          </div>
          <div className="flex-1 flex flex-col justify-center gap-2 px-3">
            <Slab color={page.border} width="70%" />
            <Slab color={page.border} width="52%" />
          </div>
        </div>
      </Sheet>
    ),
    // 14 — Address Bar. The mark inside the omnibox, and again in the row below it.
    (
      <Sheet t={subtle} pad={14}>
        <div className="flex-1 flex flex-col justify-center gap-2">
          <div
            className="flex items-center gap-2 px-2"
            style={{
              backgroundColor: page.bg,
              border: `1px solid ${subtle.border}`,
              borderRadius: 999,
              height: 26,
            }}
          >
            <Mark brand={brand} content={c} ground={brandT.bg} size={16} shape="circle" />
            <div className="flex-1 min-w-0">
              <Url content={c} color={page.text} brand={brand} size={8} />
            </div>
          </div>
          <div
            className="flex flex-col gap-1.5 px-2 py-2"
            style={{
              backgroundColor: page.bg,
              border: `1px solid ${subtle.border}`,
              borderRadius: 8,
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Mark brand={brand} content={c} ground={brandT.bg} size={12} shape="rounded" />
              <TabTitle content={c} color={page.text} brand={brand} size={7.5} weight={600} />
            </div>
            <Slab color={page.border} width="64%" />
            <Slab color={page.border} width="46%" />
          </div>
        </div>
      </Sheet>
    ),
    // 15 — New Tab. A shortcut grid, where the mark is the only way in.
    (
      <Sheet t={page} pad={14}>
        <div className="flex justify-center">
          <div
            className="flex items-center px-2"
            style={{ backgroundColor: subtle.bg, borderRadius: 999, height: 16, width: '76%' }}
          >
            <Url content={c} color={mutedOn(subtle)} brand={brand} size={6.5} />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-1 min-w-0">
              <Mark brand={brand} content={c} ground={brandT.bg} size={40} shape="circle" />
              <TabTitle content={c} color={page.text} brand={brand} size={6.5} weight={600} />
            </div>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <Blank color={page.border} size={40} radius="50%" />
                <Slab color={page.border} width={22} height={4} />
              </div>
            ))}
          </div>
        </div>
      </Sheet>
    ),
    // 16 — Link Preview. The unfurl, where the mark carries the whole card.
    (
      <Sheet t={subtle} pad={16}>
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{ backgroundColor: page.bg, border: `1px solid ${subtle.border}`, borderRadius: 8 }}
        >
          <div
            className="flex-1 flex items-center justify-center"
            style={{ backgroundColor: brandT.bg, minHeight: 0 }}
          >
            <Mark brand={brand} content={c} ground={page.bg} size={56} shape="squircle" />
          </div>
          <div
            className="flex flex-col gap-0.5 px-2.5 py-2"
            style={{ borderTop: `1px solid ${subtle.border}` }}
          >
            <Url content={c} color={mutedOn(page)} brand={brand} size={6.5} uppercase />
            <TabTitle content={c} color={page.text} brand={brand} size={9} weight={700} />
            <Slab color={page.border} width="72%" height={4} style={{ marginTop: 2 }} />
          </div>
        </div>
      </Sheet>
    ),
    // 17 — Notification. Twenty-four pixels, arriving unannounced.
    (
      <Sheet t={inverted} pad={16}>
        <div className="flex-1 flex flex-col justify-center gap-2">
          <div className="flex justify-center">
            <div
              style={{ width: '84%', height: 10, backgroundColor: inverted.border, borderRadius: 8 }}
            />
          </div>
          <div
            className="flex items-start gap-2 px-2.5 py-2"
            style={{ backgroundColor: page.bg, borderRadius: 10 }}
          >
            <Mark brand={brand} content={c} ground={brandT.bg} size={24} shape="squircle" />
            <div className="flex-1 min-w-0 flex flex-col">
              <TabTitle content={c} color={page.text} brand={brand} size={8} weight={700} />
              <Url content={c} color={mutedOn(page)} brand={brand} size={6.5} />
              <Slab color={page.border} width="80%" height={4} style={{ marginTop: 3 }} />
            </div>
          </div>
        </div>
      </Sheet>
    ),
    // 18 — Dock. Pinned, and judged against three neighbours.
    (
      <Sheet t={inverted} pad={14}>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <TabTitle content={c} color={inverted.text} brand={brand} size={9} weight={600} />
          <div
            className="flex items-end gap-2 px-2.5 py-2"
            style={{ backgroundColor: page.bg, borderRadius: 14 }}
          >
            <Blank color={page.border} size={30} radius={8} />
            <div className="flex flex-col items-center gap-1">
              <Mark brand={brand} content={c} ground={brandT.bg} size={38} shape="squircle" />
              <span
                style={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: page.text }}
              />
            </div>
            <Blank color={page.border} size={30} radius={8} />
            <Blank color={page.border} size={30} radius={8} />
          </div>
          <Url content={c} color={mutedOn(inverted)} brand={brand} size={7} uppercase />
        </div>
      </Sheet>
    ),
    // 19 — Widget. The mark as a heading, on a tile that has to say something.
    (
      <Sheet t={subtle} pad={16}>
        <div className="flex-1 flex flex-col justify-center gap-3">
          <div
            className="flex flex-col gap-2 px-3 py-3"
            style={{
              backgroundColor: page.bg,
              border: `1px solid ${subtle.border}`,
              borderRadius: 14,
            }}
          >
            <div className="flex items-center gap-2">
              <Mark brand={brand} content={c} ground={brandT.bg} size={22} shape="squircle" />
              <div className="flex-1 min-w-0 flex flex-col">
                <TabTitle content={c} color={page.text} brand={brand} size={8} weight={700} />
                <Url content={c} color={mutedOn(page)} brand={brand} size={6.5} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Slab color={page.border} width="86%" />
              <Slab color={page.border} width="62%" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Blank color={subtle.border} size={26} radius={8} />
            <Blank color={subtle.border} size={26} radius={8} />
            <Blank color={subtle.border} size={26} radius={8} />
          </div>
        </div>
      </Sheet>
    ),
    // 20 — Splash. The mark alone on the brand's own colour, no tile to hide in.
    (
      <Sheet t={brandT} pad={18}>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Mark brand={brand} content={c} ground={brandT.bg} size={96} shape="square" />
          <TabTitle content={c} color={brandT.text} brand={brand} size={11} weight={700} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div style={{ width: 54, height: 2, backgroundColor: brandT.text, borderRadius: 2 }} />
          <Url content={c} color={brandT.text} brand={brand} size={7} uppercase />
        </div>
      </Sheet>
    ),
    // 21 — Install Card. The listing row, where the icon is the decision.
    (
      <Sheet t={page} pad={16}>
        <div className="flex-1 flex flex-col justify-center gap-3">
          <div className="flex items-center gap-3">
            <Mark brand={brand} content={c} ground={brandT.bg} size={56} shape="squircle" />
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <TabTitle content={c} color={page.text} brand={brand} size={10} weight={700} />
              <Url content={c} color={mutedOn(page)} brand={brand} size={7} />
              <div
                style={{
                  marginTop: 3,
                  width: 46,
                  height: 12,
                  borderRadius: 999,
                  backgroundColor: brandT.bg,
                }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 34,
                  backgroundColor: subtle.bg,
                  border: `1px solid ${page.border}`,
                  borderRadius: 5,
                }}
              />
            ))}
          </div>
        </div>
      </Sheet>
    ),
    // 22 — Keyline Grid. Where the mark sits inside the frame, measured.
    (
      <Sheet t={page} pad={14}>
        <TabTitle content={c} color={page.text} brand={brand} size={8} weight={600} />
        <div className="flex-1 flex items-center justify-center">
          <div
            className="relative flex items-center justify-center"
            style={{ width: 118, height: 118, border: `1px solid ${page.border}` }}
          >
            <div
              className="absolute"
              style={{ left: 0, right: 0, top: '50%', height: 1, backgroundColor: page.border }}
            />
            <div
              className="absolute"
              style={{ top: 0, bottom: 0, left: '50%', width: 1, backgroundColor: page.border }}
            />
            <div
              className="absolute"
              style={{ inset: 10, border: `1px solid ${page.border}`, borderRadius: '50%' }}
            />
            <div className="relative">
              <Mark brand={brand} content={c} ground={brandT.bg} size={62} shape="squircle" />
            </div>
          </div>
        </div>
        <Url content={c} color={mutedOn(page)} brand={brand} size={7} uppercase />
      </Sheet>
    ),
    // 23 — Clear Space. The room around it, published as a number.
    (
      <Sheet t={page} pad={14}>
        <TabTitle content={c} color={page.text} brand={brand} size={8} weight={600} />
        <div className="flex-1 flex items-center justify-center">
          <div
            className="flex items-center justify-center"
            style={{ padding: CLEAR_SPACE, border: `1px dashed ${page.border}` }}
          >
            <Mark brand={brand} content={c} ground={brandT.bg} size={72} shape="squircle" />
          </div>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span style={{ color: mutedOn(page), fontFamily: body, fontSize: typePx(6) }}>
            {CLEAR_SPACE}
          </span>
          <Url content={c} color={mutedOn(page)} brand={brand} size={7} />
        </div>
      </Sheet>
    ),
    // 24 — Pixel Grid. Thirty-two squares wide, and nothing to round off with.
    (
      <Sheet t={page} pad={14}>
        <div className="flex items-baseline justify-between gap-2">
          <TabTitle content={c} color={page.text} brand={brand} size={7.5} weight={600} />
          <span style={{ color: mutedOn(page), fontFamily: body, fontSize: typePx(6) }}>
            {DELIVERY_SIZES[1]}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="relative" style={{ width: 124, height: 124 }}>
            <div className="absolute inset-0 grid grid-cols-4 grid-rows-4">
              {Array.from({ length: 16 }, (_, i) => (
                <div key={i} style={{ border: `1px solid ${page.border}` }} />
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Mark brand={brand} content={c} ground={brandT.bg} size={92} shape="square" />
            </div>
          </div>
        </div>
        <Url content={c} color={mutedOn(page)} brand={brand} size={7} />
      </Sheet>
    ),
    // 25 — Type Lockup. The mark beside the name, on the same two rules.
    (
      <Sheet t={page} pad={16}>
        <div className="flex-1 flex flex-col justify-center gap-2.5">
          <div className="relative flex items-center gap-2.5">
            <div
              className="absolute"
              style={{ left: 0, right: 0, top: 0, height: 1, backgroundColor: page.border }}
            />
            <div
              className="absolute"
              style={{ left: 0, right: 0, bottom: 0, height: 1, backgroundColor: page.border }}
            />
            <div className="relative">
              <Mark brand={brand} content={c} ground={brandT.bg} size={36} shape="squircle" />
            </div>
            <div className="relative min-w-0 flex-1">
              <TabTitle content={c} color={page.text} brand={brand} size={13} weight={700} />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div style={{ width: 36, height: 3, backgroundColor: brandT.bg, borderRadius: 2 }} />
            <div className="min-w-0 flex-1">
              <Url content={c} color={mutedOn(page)} brand={brand} size={7} uppercase />
            </div>
          </div>
        </div>
      </Sheet>
    ),
    // 26 — Inbox Row. The sender's face, at the size a sender gets.
    (
      <Sheet t={page} pad={14}>
        <div className="flex-1 flex flex-col justify-center gap-2.5">
          <div className="flex items-center gap-2">
            <Mark brand={brand} content={c} ground={brandT.bg} size={26} shape="circle" />
            <div className="flex-1 min-w-0 flex flex-col">
              <TabTitle content={c} color={page.text} brand={brand} size={8} weight={700} />
              <Url content={c} color={mutedOn(page)} brand={brand} size={6.5} />
            </div>
          </div>
          <div style={{ height: 1, backgroundColor: page.border }} />
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Blank color={page.border} size={26} radius="50%" />
              <div className="flex-1 flex flex-col gap-1">
                <Slab color={page.border} width="58%" />
                <Slab color={page.border} width="40%" height={4} />
              </div>
            </div>
          ))}
        </div>
      </Sheet>
    ),
    // 27 — Facepile. Overlapped, cropped and small — the hardest avatar there is.
    (
      <Sheet t={subtle} pad={16}>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="flex items-center">
            <Mark
              brand={brand}
              content={c}
              ground={brandT.bg}
              size={44}
              shape="circle"
              ring={subtle.bg}
            />
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ marginLeft: -12 }}>
                <Blank color={subtle.border} size={44} radius="50%" ring={subtle.bg} />
              </div>
            ))}
          </div>
          <TabTitle content={c} color={subtle.text} brand={brand} size={9} weight={600} />
          <Url content={c} color={mutedOn(subtle)} brand={brand} size={7} />
        </div>
      </Sheet>
    ),
    // 28 — Profile Card. Cut out of the brand's own band.
    (
      <div
        className="w-full h-full flex flex-col overflow-hidden"
        style={{ backgroundColor: page.bg }}
      >
        <div style={{ backgroundColor: brandT.bg, height: 92 }} />
        <div className="flex-1 flex flex-col px-4" style={{ marginTop: -30 }}>
          <Mark
            brand={brand}
            content={c}
            ground={page.bg}
            size={58}
            shape="circle"
            ring={page.bg}
          />
          <div className="flex flex-col gap-0.5" style={{ paddingTop: 6 }}>
            <TabTitle content={c} color={page.text} brand={brand} size={11} weight={700} />
            <Url content={c} color={mutedOn(page)} brand={brand} size={7} />
          </div>
          <div className="flex flex-col gap-1.5" style={{ paddingTop: 8 }}>
            <Slab color={page.border} width="72%" />
            <Slab color={page.border} width="54%" />
          </div>
        </div>
      </div>
    ),
    // 29 — Sign In. The one screen where the mark is the whole brand.
    (
      <Sheet t={subtle} pad={16}>
        <div className="flex-1 flex flex-col justify-center">
          <div
            className="flex flex-col items-center gap-2 px-4 py-4"
            style={{
              backgroundColor: page.bg,
              border: `1px solid ${subtle.border}`,
              borderRadius: 10,
            }}
          >
            <Mark brand={brand} content={c} ground={brandT.bg} size={40} shape="squircle" />
            <TabTitle content={c} color={page.text} brand={brand} size={9} weight={700} />
            <div className="w-full flex flex-col gap-1.5" style={{ paddingTop: 2 }}>
              <div style={{ height: 14, borderRadius: 4, border: `1px solid ${page.border}` }} />
              <div style={{ height: 14, borderRadius: 4, border: `1px solid ${page.border}` }} />
              <div style={{ height: 14, borderRadius: 4, backgroundColor: brandT.bg }} />
            </div>
            <Url content={c} color={mutedOn(page)} brand={brand} size={6.5} />
          </div>
        </div>
      </Sheet>
    ),
    // 30 — App Switcher. One window among many, named only by its mark.
    (
      <Sheet t={inverted} pad={14}>
        <div className="flex-1 flex items-center justify-center gap-2">
          <div
            style={{ width: 24, height: 118, backgroundColor: inverted.border, borderRadius: 6 }}
          />
          <div
            className="flex flex-col overflow-hidden"
            style={{
              width: 138,
              height: 148,
              backgroundColor: page.bg,
              border: `1px solid ${inverted.border}`,
              borderRadius: 8,
            }}
          >
            <div
              className="flex items-center gap-1.5 px-2 py-1.5 min-w-0"
              style={{ borderBottom: `1px solid ${page.border}` }}
            >
              <Mark brand={brand} content={c} ground={brandT.bg} size={12} shape="rounded" />
              <TabTitle content={c} color={page.text} brand={brand} size={6.5} weight={600} />
            </div>
            <div className="flex-1 flex flex-col justify-center gap-1.5 px-2">
              <Slab color={page.border} width="80%" />
              <Slab color={page.border} width="58%" />
            </div>
            <div className="px-2 py-1.5 min-w-0" style={{ borderTop: `1px solid ${page.border}` }}>
              <Url content={c} color={mutedOn(page)} brand={brand} size={6} />
            </div>
          </div>
          <div
            style={{ width: 24, height: 118, backgroundColor: inverted.border, borderRadius: 6 }}
          />
        </div>
      </Sheet>
    ),
  ];

  return <>{designs[templateIndex] ?? designs[0]}</>;
}

/**
 * Thirty designs, in `ext-1`…`ext-30`, and the list is the whole story.
 *
 * A template id is a persistence key, so the order never moves: `ext-13`
 * still means what it meant when it was archived, and a saved
 * customization filed under it resolves to the same slot. Twelve of these
 * shipped in the first pass and eighteen were culled — but archiving them
 * also deleted their artwork, so each of the eighteen rendered `ext-1`
 * under its own number. They are re-authored here rather than restored:
 * there was nothing left to restore.
 *
 * `FAVICON_NAMES`, `WEB_FAVICON_EXTENDED` and `FAVICON_ARCHIVED_IDS` all
 * derive from this array, so adding a design is one entry here and one
 * `designs` member — and the archived list falls to empty on its own.
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
  'Bookmark Bar',
  'Address Bar',
  'New Tab',
  'Link Preview',
  'Notification',
  'Dock',
  'Widget',
  'Splash',
  'Install Card',
  'Keyline Grid',
  'Clear Space',
  'Pixel Grid',
  'Type Lockup',
  'Inbox Row',
  'Facepile',
  'Profile Card',
  'Sign In',
  'App Switcher',
] as const;

export const WEB_FAVICON_EXTENDED = Array.from({ length: 30 }, (_, i) => ({
  idSuffix: `ext-${i + 1}`,
  name: KEPT_NAMES[i] ?? `Favicon ${i + 1}`,
  category: 'Modern',
}));

/**
 * Curation, declared where the designs are.
 *
 * A design’s name and its intent belong beside the artwork that draws
 * it; `curation/web.ts` reads these rather than keeping a second copy
 * that drifts the first time one is renamed. Nothing in this family is
 * archived any more — `FAVICON_ARCHIVED_IDS` derives from the same list
 * the designs do, so it is empty by construction rather than by hand.
 */
export const FAVICON_NAMES: Record<string, string> = Object.fromEntries(
  KEPT_NAMES.map((name, i) => [`favicon-ext-${i + 1}`, name]),
);

export const FAVICON_TAGS: Record<string, string[]> = {
  'favicon-ext-1': ['Preview', 'Light', 'Minimal'],
  'favicon-ext-2': ['Preview', 'Dark', 'Minimal'],
  'favicon-ext-3': ['Preview', 'Editorial', 'Light'],
  'favicon-ext-4': ['App icon', 'Bold', 'Brand colour'],
  'favicon-ext-5': ['App icon', 'In context', 'Light'],
  'favicon-ext-6': ['Spec', 'Technical', 'Light'],
  'favicon-ext-7': ['Spec', 'Technical', 'Minimal'],
  'favicon-ext-8': ['Spec', 'Contrast', 'Grid'],
  'favicon-ext-9': ['Avatar', 'Minimal', 'Light'],
  'favicon-ext-10': ['App icon', 'Dark', 'Bold'],
  'favicon-ext-11': ['Spec', 'Contrast', 'Split'],
  'favicon-ext-12': ['Preview', 'Technical', 'Minimal'],
  'favicon-ext-13': ['Preview', 'In context', 'Light'],
  'favicon-ext-14': ['Preview', 'Minimal', 'Light'],
  'favicon-ext-15': ['Preview', 'Grid', 'Light'],
  'favicon-ext-16': ['Preview', 'Editorial', 'Brand colour'],
  'favicon-ext-17': ['Preview', 'Minimal', 'Dark'],
  'favicon-ext-18': ['App icon', 'In context', 'Dark'],
  'favicon-ext-19': ['App icon', 'Minimal', 'Light'],
  'favicon-ext-20': ['App icon', 'Bold', 'Brand colour'],
  'favicon-ext-21': ['App icon', 'Editorial', 'Light'],
  'favicon-ext-22': ['Spec', 'Technical', 'Grid'],
  'favicon-ext-23': ['Spec', 'Technical', 'Minimal'],
  'favicon-ext-24': ['Spec', 'Grid', 'Light'],
  'favicon-ext-25': ['Spec', 'Minimal', 'Light'],
  'favicon-ext-26': ['Avatar', 'In context', 'Light'],
  'favicon-ext-27': ['Avatar', 'Minimal', 'Light'],
  'favicon-ext-28': ['Avatar', 'Bold', 'Brand colour'],
  'favicon-ext-29': ['Preview', 'Minimal', 'Light'],
  'favicon-ext-30': ['App icon', 'In context', 'Dark'],
};

export const FAVICON_ARCHIVED_IDS: string[] = Array.from(
  { length: 30 - KEPT_NAMES.length },
  (_, i) => `favicon-ext-${KEPT_NAMES.length + i + 1}`,
);
