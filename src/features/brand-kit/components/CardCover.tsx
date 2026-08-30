/**
 * A Brand Kit card's cover — the customer's OWN artwork, never stock.
 *
 * Before this module the overview painted 46 licensed photographs from
 * `/public/brand-kit/covers/*`, assigned by a seeded shuffle. Every brand
 * got the same wall of dark mockups carrying the *brandingOS* logo, three
 * cards shared one image, and a fintech identity sat beside a photograph of
 * sunglasses (`.audit/OURS.md` D43/D44). The page read as the vendor's
 * portfolio rather than the customer's kit.
 *
 * What a cover is now:
 *
 *   • A deliverable card shows its FIRST FEATURED VARIANT, rendered by the
 *     real renderer through `renderCosmosTemplate` — so the cover is the
 *     thing you get when you open it, including your own Quick Edits.
 *   • A brand-asset card shows a COMPOSED cover of that asset: the logo on a
 *     ground it reads on, the palette as a strip, "Aa" in the real typeface,
 *     six icons, the first photograph, the brand's one-line summary.
 *   • Anything with no artwork of its own (a composed system view, a brand
 *     with no canonical record) falls back to the brand's identity mark on
 *     the brand's own colour — still the customer's, still distinct.
 *
 * Two rules the implementation exists to keep:
 *
 *   1. **A renderer is authored for a 260px-wide card and starves when laid
 *      out wider** (CLAUDE.md, `ScalingStage`). So a template cover is laid
 *      out at 260 and TRANSFORMED to fit — never re-laid-out at the card's
 *      width. The scale contains rather than crops, because a letterhead is
 *      portrait inside a 1.6:1 card and cropping it would hide the header
 *      that makes it recognisable.
 *   2. **37 cards must not render 37 templates at once.** Every cover waits
 *      for an IntersectionObserver before it mounts anything. Where there is
 *      no observer (jsdom) it mounts immediately, so tests see real covers.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Brand } from '@/shared/types/brand';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import type { KitSectionKey } from './BrandKitSidebar';
import { renderCosmosTemplate } from '../renderers';
import { brandColors, fgOn, fontStack, logoOn, surface } from '../renderers/brandStyle';
import { aspectForLabel, featuredTemplates } from '../data/cardPresentation';
import { contentForTemplate } from '../data/savedContent';
import type { SavedCardCustomization } from '../data/cardCustomizations';
import { FLATICON_RR_NAMES } from '../data/flaticonNames';
import { markPhotoSourceBroken, realPhotos } from '../data/photoExport';

/** The width every kit renderer is authored against. */
const CANONICAL_WIDTH = 260;

/* ── Lazy mount ───────────────────────────────────────────────────── */

/**
 * True once the element has been near the viewport.
 *
 * One-way: a cover that has been seen stays mounted, because unmounting it
 * on scroll-out would re-run the renderer every time the user scrolled back
 * — the opposite of the saving this exists for. `rootMargin` gives a screen
 * of lead time so a cover is painted before it is looked at.
 *
 * The page scrolls the WINDOW (the drilldown header is `position: sticky`
 * against it), so the default root is the right root here.
 */
function useNearViewport<T extends HTMLElement>(): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);

  return [ref, near];
}

/* ── The scaled stage ─────────────────────────────────────────────── */

/**
 * Lay a renderer out at 260px and scale it to fit the cover box.
 *
 * `contain`, not `cover`: the card is 1.6:1 and a letterhead is portrait, so
 * scaling to fill would crop away the header — which is the one part of a
 * letterhead a person recognises at thumbnail size.
 */
function ScaledArtwork({
  children,
  aspect,
}: {
  children: React.ReactNode;
  aspect: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const height = Math.round(CANONICAL_WIDTH / aspect);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      setScale(Math.min(w / CANONICAL_WIDTH, h / height));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return; // jsdom
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [height]);

  return (
    <div ref={hostRef} className="bk-cover-stage" aria-hidden>
      {/*
        Centred by TRANSLATION, never by layout alignment. The stage is an
        `overflow: hidden` box and the artwork is routinely bigger than it
        (a 9:16 story is 260×462 inside a 333×207 card), and CSS treats
        alignment that overflows a scroll container as "safe" — it silently
        falls back to `start` rather than let content escape the scroll
        origin (CLAUDE.md, "Centering overflow content"). A `place-items:
        center` stage therefore laid the story out at the TOP and then
        scaled about its own middle, dropping the artwork 129px down its
        own card and clipping the bottom off every square cover.
      */}
      <div
        className="bk-cover-stage-inner"
        style={{
          width: CANONICAL_WIDTH,
          height,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Composed brand-asset covers ──────────────────────────────────── */

/** The brand's mark, or its initial, on a ground it reads on. */
function IdentityCover({
  brand,
  sourceBrand,
}: {
  brand: MockBrand;
  sourceBrand?: Brand;
}) {
  const colors = brandColors(sourceBrand ?? brand);
  const ground = colors.primary;
  const resolved = logoOn(sourceBrand, ground);
  const fg = fgOn(ground);
  return (
    <div className="bk-cover-art bk-cover-art--identity" style={{ background: ground }}>
      {resolved ? (
        <img className="bk-cover-logo" src={resolved.url} alt="" />
      ) : (
        <span className="bk-cover-initial" style={{ color: fg, fontFamily: fontStack(brand, 'heading') }}>
          {brand.name.trim().charAt(0).toUpperCase() || '·'}
        </span>
      )}
    </div>
  );
}

/**
 * Logos — the primary logo on a ground it reads on.
 *
 * A MockBrand carries inline SVG strings rather than asset records, so
 * `logoOn` cannot answer for it (see `brandStyle`). It is drawn as-is on the
 * neutral surface instead: the artwork already carries its own ground in
 * every seeded brand, and inventing a coloured one behind it is exactly the
 * invisible-logo bug the picker exists to prevent.
 */
function LogosCover({ brand, sourceBrand }: { brand: MockBrand; sourceBrand?: Brand }) {
  const colors = brandColors(sourceBrand ?? brand);
  const grounds = [colors.primary, surface(sourceBrand ?? brand, 'inverted').bg, '#ffffff'];
  const found = sourceBrand
    ? grounds
        .map((bg) => ({ bg, logo: logoOn(sourceBrand, bg) }))
        .find((c) => Boolean(c.logo))
    : undefined;
  if (found?.logo) {
    return (
      <div className="bk-cover-art bk-cover-art--logo" style={{ background: found.bg }}>
        <img className="bk-cover-logo" src={found.logo.url} alt="" />
      </div>
    );
  }
  const svg = brand.logos[0]?.svg;
  if (!svg) return <IdentityCover brand={brand} sourceBrand={sourceBrand} />;
  return (
    <div
      className="bk-cover-art bk-cover-art--logo"
      style={{ background: surface(sourceBrand ?? brand, 'subtle').bg }}
    >
      <span className="bk-cover-logo-svg" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}

/** Colours — the palette itself, in proportion, core first. */
function ColorsCover({ brand }: { brand: MockBrand }) {
  const swatches = [...brand.colors.core, ...brand.colors.accent].slice(0, 6);
  if (swatches.length === 0) return <EmptyCover brand={brand} note="No colours yet" />;
  return (
    <div className="bk-cover-art bk-cover-art--palette">
      {swatches.map((c, i) => (
        <span
          key={`${c.hex}-${i}`}
          className="bk-cover-swatch"
          style={{ background: c.hex, flexGrow: i === 0 ? 2 : 1 }}
        />
      ))}
    </div>
  );
}

/** Typography — "Aa" set in the brand's own heading face, over the pairing. */
function TypeCover({ brand, sourceBrand }: { brand: MockBrand; sourceBrand?: Brand }) {
  const source = sourceBrand ?? brand;
  const tokens = surface(source, 'card');
  const heading = brand.fonts[0]?.family;
  const body = brand.fonts[1]?.family ?? heading;
  if (!heading) return <EmptyCover brand={brand} note="No typefaces yet" />;
  return (
    <div
      className="bk-cover-art bk-cover-art--type"
      style={{ background: tokens.bg, color: tokens.text }}
    >
      <span className="bk-cover-aa" style={{ fontFamily: fontStack(source, 'heading') }}>
        Aa
      </span>
      <span className="bk-cover-type-names" style={{ fontFamily: fontStack(source, 'body') }}>
        <span className="bk-cover-type-name">{heading}</span>
        {body && body !== heading && <span className="bk-cover-type-name">{body}</span>}
      </span>
    </div>
  );
}

/**
 * `brand.icons` holds TWO shapes and always has: the picker writes full
 * UICONS class names (`fi-rr-camera`), and Setup's own seed keeps bare
 * names (`camera`). Painting the bare shape as `class="fi camera"` names
 * no glyph at all, so the cover drew six empty boxes — the icon font WAS
 * loaded, it just had nothing to draw. Returns `null` for a name that is
 * in neither shape, so a cover shows the icons it really has.
 */
const FLATICON_RR_LOOKUP = new Set(FLATICON_RR_NAMES);
function iconClassFor(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^fi-(rr|br|sr|rs|bs|ss|tr|ts|brands)-[a-z0-9-]+$/i.test(trimmed)) return trimmed;
  const candidate = `fi-rr-${trimmed.toLowerCase()}`;
  return FLATICON_RR_LOOKUP.has(candidate) ? candidate : null;
}

/** Icons — six of them, in the brand's colour, at a size you can read. */
function IconsCover({ brand, sourceBrand }: { brand: MockBrand; sourceBrand?: Brand }) {
  const source = sourceBrand ?? brand;
  const tokens = surface(source, 'card');
  const tint = brandColors(source).primary;
  const icons = brand.icons
    .map((name) => ({ name, cls: iconClassFor(name) }))
    .filter((i): i is { name: string; cls: string } => Boolean(i.cls))
    .slice(0, 6);
  if (icons.length === 0) return <EmptyCover brand={brand} note="No icons yet" />;
  return (
    <div
      className="bk-cover-art bk-cover-art--icons"
      style={{ background: tokens.bg, color: tint }}
    >
      {icons.map((icon, i) => (
        <i key={`${icon.cls}-${i}`} className={`fi ${icon.cls} bk-cover-icon`} aria-hidden />
      ))}
    </div>
  );
}

/**
 * Photos — the brand's first REAL photograph, filling the card.
 *
 * Two rules, and the second one is why this is an `<img>` rather than a
 * `background-image`:
 *
 *   1. **`realPhotos` is the one answer to "does this brand have
 *      photography?"** — the same predicate the drilldown, the sidebar and
 *      the export read (`photoExport`, D46). Reading `brand.photos` directly
 *      counted an empty slot and a hidden picture as photography.
 *   2. **A source is only known broken once something has TRIED it.** The
 *      cache is optimistic by construction, so the first paint of a 404
 *      would be a blank white card — which is exactly what SKAM's
 *      `/images/grain.png` produced. A CSS background cannot report its own
 *      failure; an `<img>` can, so the cover measures the source, tells the
 *      shared cache, and falls back to the honest empty.
 */
function PhotosCover({ brand }: { brand: MockBrand }) {
  const photo = realPhotos(brand)[0];
  const src = photo?.src;
  const [broken, setBroken] = useState(false);
  // A different picture is a different measurement.
  useEffect(() => setBroken(false), [src]);
  if (!src || broken) return <EmptyCover brand={brand} note="No photography yet" />;
  return (
    <div className="bk-cover-art bk-cover-art--photo">
      <img
        className="bk-cover-photo"
        src={src}
        alt=""
        onError={() => {
          markPhotoSourceBroken(src);
          setBroken(true);
        }}
      />
    </div>
  );
}

/** Strategy — what the brand says it is, in one line, in its own type. */
function StrategyCover({ brand, sourceBrand }: { brand: MockBrand; sourceBrand?: Brand }) {
  const source = sourceBrand ?? brand;
  const line =
    brand.strategy.summary?.trim() ||
    brand.strategy.mission?.trim() ||
    brand.strategy.slogan?.trim() ||
    brand.about[0]?.content?.trim() ||
    '';
  if (!line) return <EmptyCover brand={brand} note="No strategy yet" />;
  const ground = brandColors(source).primary;
  return (
    <div
      className="bk-cover-art bk-cover-art--strategy"
      style={{ background: ground, color: fgOn(ground) }}
    >
      <span className="bk-cover-quote" style={{ fontFamily: fontStack(source, 'heading') }}>
        {line}
      </span>
    </div>
  );
}

/** An honest empty — the brand's own surface, and what is missing. */
function EmptyCover({ brand, note }: { brand: MockBrand; note: string }) {
  const tokens = surface(brand, 'subtle');
  return (
    <div
      className="bk-cover-art bk-cover-art--empty"
      style={{ background: tokens.bg, color: tokens.textMuted, borderColor: tokens.border }}
    >
      <span className="bk-cover-empty-note">{note}</span>
    </div>
  );
}

/* ── The cover ────────────────────────────────────────────────────── */

export type CardCoverProps = {
  sectionKey: KitSectionKey;
  /** The label the DATA is filed under — never the renamed display one. */
  storageLabel: string;
  brand: MockBrand;
  sourceBrand?: Brand;
  /** The card's whole variant library, for picking the featured one. */
  templates?: ReadonlyArray<BrandKitTemplate>;
  /** The user's own featured picks, so the cover is what they chose. */
  featuredIdsByLabel?: Record<string, string[]>;
  /** The user's saved Quick Edits, so the cover says what they wrote. */
  saved?: Record<string, SavedCardCustomization>;
};

/**
 * `null` when this card has no brand-asset composition of its own — the
 * caller then falls through to the template cover.
 */
function assetCover(props: CardCoverProps): React.ReactNode | null {
  const { sectionKey, storageLabel, brand, sourceBrand } = props;
  if (sectionKey !== 'brand-assets') return null;
  switch (storageLabel) {
    case 'Logos':
      return <LogosCover brand={brand} sourceBrand={sourceBrand} />;
    case 'Colors':
      return <ColorsCover brand={brand} />;
    case 'Fonts':
      return <TypeCover brand={brand} sourceBrand={sourceBrand} />;
    case 'Icons':
      return <IconsCover brand={brand} sourceBrand={sourceBrand} />;
    case 'Photos':
      return <PhotosCover brand={brand} />;
    case 'About':
      return <StrategyCover brand={brand} sourceBrand={sourceBrand} />;
    default:
      return null;
  }
}

export function CardCover(props: CardCoverProps) {
  const { storageLabel, brand, sourceBrand, templates, featuredIdsByLabel, saved } = props;
  const [ref, near] = useNearViewport<HTMLDivElement>();

  const featured = useMemo(() => {
    if (!templates || templates.length === 0) return undefined;
    return featuredTemplates(storageLabel, templates, featuredIdsByLabel)[0];
  }, [templates, storageLabel, featuredIdsByLabel]);

  const body = (() => {
    if (!near) return null;
    const asset = assetCover(props);
    if (asset) return asset;
    if (featured && sourceBrand) {
      return (
        <ScaledArtwork aspect={aspectForLabel(storageLabel)}>
          {renderCosmosTemplate(
            featured,
            sourceBrand,
            brand,
            saved ? contentForTemplate(saved, featured, brand) : undefined,
          )}
        </ScaledArtwork>
      );
    }
    return <IdentityCover brand={brand} sourceBrand={sourceBrand} />;
  })();

  return (
    <div ref={ref} className="bk-card-cover-art" data-ready={near ? 'true' : 'false'}>
      {body}
    </div>
  );
}

export default CardCover;
