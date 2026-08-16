/**
 * The brand's face, wherever the product shows one.
 *
 * Every surface that needed a small square for a brand — the Studio switcher,
 * the Classic rail, the brand chooser, the editor's picker, the dashboard —
 * drew the first letter of its name on a coloured tile. Every one of them, for
 * every brand, including brands whose entire logo system had been uploaded,
 * classified and confirmed. The artwork was on the record and the chrome showed
 * an initial.
 *
 * The order is the one a designer would give:
 *
 *   1. the Brand Icon, because a small square is exactly what an iconmark is for
 *   2. the Primary logo, when there is no icon — better a shrunk lockup than no
 *      logo at all
 *   3. the letter, only when the brand genuinely has neither
 *
 * The artwork is CONTAINED, never cropped and never stretched: a wide primary
 * lockup in a 28px square has to keep its proportions or it stops being the
 * logo. It sits on a neutral tile rather than the brand's own primary colour,
 * for the reason `logoOnBackground` exists — a yellow logo on a yellow tile is
 * an empty tile. The letter fallback keeps the brand colour, because a letter
 * has no colour of its own to lose.
 */
import { useMemo } from 'react';
import type { Brand } from '@/shared/types/brand';
import { resolveBrandLogo } from '@/shared/hooks/useBrandLogo';
import { bgTone } from '@/shared/brand/logoOnBackground';

/** The neutral grounds a contained logo is previewed on. */
const LIGHT_TILE = '#F5F4EF';
const DARK_TILE = '#111113';

export interface BrandFace {
  kind: 'logo' | 'letter';
  /** Present for `logo`. */
  url?: string;
  /** Present for `letter`. */
  letter?: string;
  /** The tile behind it. */
  background: string;
  /** Readable ink for the letter. */
  color: string;
}

/**
 * What to draw for this brand. Pure, so callers that are not React (exports,
 * canvases, tests) can ask the same question and get the same answer.
 */
export function resolveBrandFace(brand: Brand | null | undefined): BrandFace {
  const letter = (brand?.name ?? 'B').trim().slice(0, 1).toUpperCase() || 'B';
  const brandColor = brand?.primaryColor || '#111113';

  // The icon first: a mark drawn to work small IS the answer to "show this
  // brand in a small square".
  const found =
    (brand ? resolveBrandLogo(brand, 'iconmark') : undefined) ??
    (brand ? resolveBrandLogo(brand, 'primary') : undefined) ??
    // Last resort before the letter: the white version is still the brand's
    // logo, and a brand that has only that should show it rather than an
    // initial. It needs the dark tile to be visible at all.
    (brand ? resolveBrandLogo(brand, 'mono.white') : undefined);

  if (found?.url) {
    // Only the white-ink variant needs a dark ground. Everything else sits on
    // the neutral light tile, which cannot collide with a brand colour the way
    // the brand's own primary can.
    const onlyWhiteInk =
      Boolean(brand) &&
      !resolveBrandLogo(brand!, 'iconmark') &&
      !resolveBrandLogo(brand!, 'primary');
    return {
      kind: 'logo',
      url: found.url,
      background: onlyWhiteInk ? DARK_TILE : LIGHT_TILE,
      color: onlyWhiteInk ? '#F4F1EC' : '#141414',
    };
  }

  return {
    kind: 'letter',
    letter,
    background: brandColor,
    color: bgTone(brandColor) === 'dark' ? '#F4F1EC' : '#141414',
  };
}

export interface BrandAvatarProps {
  brand: Brand | null | undefined;
  /** Edge length in px. The tile is square. */
  size?: number;
  /** Corner radius in px. Defaults to a squircle-ish 30% of the size. */
  radius?: number;
  className?: string;
  /** Extra styles merged last — callers own their own layout. */
  style?: React.CSSProperties;
}

export function BrandAvatar({ brand, size = 28, radius, className, style }: BrandAvatarProps) {
  const face = useMemo(() => resolveBrandFace(brand), [brand]);
  const r = radius ?? Math.round(size * 0.3);

  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 auto',
        width: size,
        height: size,
        borderRadius: r,
        overflow: 'hidden',
        background: face.background,
        color: face.color,
        fontSize: Math.max(10, Math.round(size * 0.45)),
        fontWeight: 600,
        lineHeight: 1,
        ...style,
      }}
    >
      {face.kind === 'logo' ? (
        <img
          src={face.url}
          alt=""
          style={{
            // CONTAIN, never cover: a wide lockup keeps its proportions or it
            // stops being the logo. The inset keeps it off the tile's edges.
            width: '84%',
            height: '84%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      ) : (
        face.letter
      )}
    </span>
  );
}

export default BrandAvatar;
