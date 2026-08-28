/**
 * A card's cover: its logo, and the colour that logo sits on.
 *
 * The card decides both for itself by measuring the artwork, and when no
 * pairing reads it takes the one that loses least — which is how a
 * primary-colour mark lands on the primary-colour ground it disappears into.
 * Choosing the logo alone never fixed that: whichever variant was forced, the
 * ground moved to suit it, so the pair the user set was not the pair they got.
 * They are ONE decision, so they are made in one place.
 *
 * It is a popover on the card, not a dialog over the page, and each pick
 * applies at once. Choosing a cover is a small adjustment to the thing you are
 * looking at; taking over the screen and asking for a Save puts two steps and a
 * closed dialog between the choice and its result, which is exactly what you
 * need to see. The popover stays open so the pair can be tuned against the card
 * itself.
 *
 * Nothing in here is a preview. A tile shows the LOGO — on nothing, the way the
 * file itself is drawn — and a swatch shows the COLOUR. The pairing is what the
 * card is for, and the card is right there; drawing it twice, small, inside the
 * control that changes it only invites the reader to compare two answers to the
 * same question. Painting the tiles with the current ground did exactly that,
 * and made the picker look like it had already applied something.
 *
 * Its shape deliberately echoes `AssetSourcePopover`, the canonical "pick an
 * image" surface — same width, same section headers, same grid — because this
 * is the same gesture on the same kind of card.
 */
import { useMemo } from 'react';
import { Check, Palette, Shapes } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { brandCardGrounds, type CardGroundOption } from '@/shared/brand/workspaceCard';
import {
  FACE_PRIORITY,
  knownInkOfRole,
  variantsInPriorityOrder,
} from '@/shared/brand/logoOnBackground';
import { inkReadsOn, solidInk, useLogoInks } from '@/shared/brand/logoInk';
import { logoRoleLabel } from '@/shared/brand/logoRoles';
import type { Brand } from '@/shared/types/brand';

/**
 * The two neutrals a tile may fall back to, and the contrast a mark must clear
 * to count as visible on one. They are plain black and white on purpose: a chip
 * in a colour the brand owns would read as a suggestion about the cover.
 */
const TILE_LIGHT = '#ffffff';
const TILE_DARK = '#141414';
const TILE_FLOOR = 2.2;

/** One half of the cover. The other half is left exactly as it was. */
export interface CoverChange {
  logoRole?: string;
  coverBackground?: string;
}

export function CardCoverPopover({
  brand,
  placement,
  onChange,
  onClose,
}: {
  brand: Brand;
  placement: 'corner' | 'end';
  /** Applied immediately — there is no draft and nothing to confirm. */
  onChange: (change: CoverChange) => void | Promise<void>;
  onClose: () => void;
}) {
  const variants = useMemo(() => variantsInPriorityOrder(brand, FACE_PRIORITY), [brand]);
  const grounds = useMemo(() => brandCardGrounds(brand), [brand]);

  const card = brand.workspaceCard;

  // Measured only so a tile can be SEEN, never to suggest a pairing: artwork
  // drawn for dark grounds gets a dark chip, artwork drawn for light ones a
  // light chip, and anything that reads either way gets no chip at all.
  const urls = useMemo(() => variants.map((v) => v.resolved.url), [variants]);
  const inks = useLogoInks(urls);
  const tileGround = (
    role: Parameters<typeof knownInkOfRole>[0],
    url: string,
  ): string | undefined => {
    const known = knownInkOfRole(role);
    const ink = known ? solidInk(known) : inks[url];
    if (!ink) return undefined;
    const onLight = inkReadsOn(ink, TILE_LIGHT, TILE_FLOOR);
    const onDark = inkReadsOn(ink, TILE_DARK, TILE_FLOOR);
    // A chip appears only when the artwork reads on exactly one of the two —
    // i.e. only when it would otherwise be invisible. A two-tone lockup that
    // half-disappears on either is left alone: it is the logo the picker is
    // showing, and no flat colour makes all of it read.
    if (onLight === onDark) return undefined;
    return onLight ? TILE_LIGHT : TILE_DARK;
  };

  return (
    <Popover
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <PopoverTrigger asChild>
        {/* Opened from the MENU, so the trigger is an anchor with no appearance
            of its own — the popover still needs somewhere on the card to point. */}
        <span
          className={
            placement === 'end' ? 'bcm-cover-anchor bcm-cover-anchor--end' : 'bcm-cover-anchor'
          }
          aria-hidden="true"
        />
      </PopoverTrigger>
      <PopoverContent
        // BESIDE the card, never over it. The anchor sits in the card's own
        // top-right corner, so dropping the panel downwards covers the band
        // the picker exists to change — and every pick applies at once, so
        // what it would hide is the answer. Radix flips it when there is no
        // room on that side.
        side="right"
        align="start"
        sideOffset={8}
        className="w-[320px] p-0 overflow-hidden bg-popover border-border/60"
      >
        <div className="flex items-center gap-2 px-4 py-2.5">
          <Shapes className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">
            Brand Logos ({variants.length})
          </span>
        </div>

        <div className="max-h-[190px] overflow-y-auto px-3 pb-3">
          {variants.length === 0 ? (
            <div className="px-1 py-5 text-center text-xs text-muted-foreground/70">
              No logo in this brand yet
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Brand Logos">
              {variants.map((variant) => {
                const selected = card?.logoRole === variant.role;
                const ground = tileGround(variant.role, variant.resolved.url);
                return (
                  <button
                    key={variant.role}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={logoRoleLabel(variant.role)}
                    title={logoRoleLabel(variant.role)}
                    onClick={() => void onChange({ logoRole: variant.role })}
                    // The ring sits OUTSIDE the tile so it reads on a chip of
                    // any colour, including one the same shade as the ring.
                    className={[
                      'relative aspect-square rounded-md overflow-hidden transition-all',
                      // Charcoal, never the browser's blue — Radix moves focus
                      // into the panel on open, so this ring is the FIRST thing
                      // shown and a blue one would be the loudest thing here.
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-popover focus-visible:ring-foreground',
                      ground ? '' : 'border border-border',
                      selected
                        ? 'ring-2 ring-offset-2 ring-offset-popover ring-foreground'
                        : 'hover:ring-2 hover:ring-offset-2 hover:ring-offset-popover hover:ring-foreground/30',
                    ].join(' ')}
                    style={ground ? { background: ground } : undefined}
                  >
                    <img
                      src={variant.resolved.url}
                      alt=""
                      className="w-full h-full object-contain p-2"
                      loading="lazy"
                    />
                    {selected && <ChosenBadge />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border/60" />

        <div className="flex items-center gap-2 px-4 py-2.5">
          <Palette className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">
            Brand Colors ({grounds.length})
          </span>
        </div>

        <div className="max-h-[190px] overflow-y-auto px-3 pb-3">
          <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Brand Colors">
            {grounds.map((ground) => (
              <GroundSwatch
                key={ground.hex}
                ground={ground}
                selected={card?.coverBackground?.toLowerCase() === ground.hex.toLowerCase()}
                onSelect={() => void onChange({ coverBackground: ground.hex })}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function GroundSwatch({
  ground,
  selected,
  onSelect,
}: {
  ground: CardGroundOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      // The name alone is ambiguous between two neutrals; the value is what
      // tells a screen reader which swatch this is.
      aria-label={`${ground.name} ${ground.hex}`}
      title={`${ground.name} · ${ground.hex}`}
      onClick={onSelect}
      className={[
        'relative aspect-square rounded-md transition-all',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-popover focus-visible:ring-foreground',
        selected
          ? 'ring-2 ring-offset-2 ring-offset-popover ring-foreground'
          : 'ring-1 ring-border hover:ring-2 hover:ring-offset-2 hover:ring-offset-popover hover:ring-foreground/30',
      ].join(' ')}
      style={{ background: ground.hex }}
    >
      {selected && <ChosenBadge />}
    </button>
  );
}

/**
 * The mark that says "this is the one".
 *
 * A ring cannot carry that on its own here: Radix moves focus into the panel
 * when it opens, so the first tile wears a focus ring before anything has been
 * chosen, and two rings that mean different things are one ring too many.
 */
function ChosenBadge() {
  return (
    <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-foreground text-background shadow-sm ring-1 ring-background">
      <Check className="h-2.5 w-2.5" strokeWidth={3} />
    </span>
  );
}
