/**
 * Bento, inside the identity document.
 *
 * ── Why this is a section and not a launcher ─────────────────────────────
 *
 * It was a launcher: a "Bento" link in the nav card that opened the maker.
 * That put a TOOL in the navigation of a DOCUMENT — the nav lists the parts of
 * the identity, and Bento is not a part of an identity. It is one more surface
 * the identity has to survive, which is exactly what the section it now sits
 * in is for. So it moved into `SocialApplications`, beside the posts, the
 * cards and the site mock, and out of the nav entirely. The maker is still at
 * `/b/:slug/bento`, reached from Tools where the other tools are.
 *
 * ── One bento, not two ───────────────────────────────────────────────────
 *
 * What used to stand here was `BentoWall` — a hand-built grid of `--bi-*`
 * tiles that happened to be called a bento. It was a second bento
 * implementation with its own tile vocabulary, its own layout maths and its
 * own idea of what a tile may contain, and it could drift from the real one
 * without anything noticing.
 *
 * This renders the REAL thing:
 *
 *   `TEMPLATES` / `getTemplate`  the layouts the maker offers
 *   `generateTiles`              the maker's own content roll
 *   `BentoCanvas`                the maker's own artboard, `interactive={false}`
 *
 * so a template added to the maker, a tile kind taught a new trick, or a fix
 * to the grid maths shows up here with no second edit. There is no bento data
 * or bento rendering in this feature.
 *
 * ── Two constraints the maker does not have ──────────────────────────────
 *
 * The maker is a canvas an owner is composing on; this is a page an owner
 * SENDS. That difference is the whole of what this file adds:
 *
 *   IT IS DETERMINISTIC. `generateTiles` free-rolls from an unseeded RNG, so
 *   the section would deal a different hand on every render — a document that
 *   changes while you scroll it. The seed is the brand's own id.
 *
 *   IT DOES NOT INVENT. `resolveContent` falls back to sample copy when the
 *   brand has nothing: `stat` is ALWAYS `SAMPLE_STATS` ("12k+ Customers"),
 *   `text` is always `SAMPLE_TEXT`, and `voice-quote` becomes "Design is
 *   intelligence made visible." for a brand with no recorded voice. Filler is
 *   correct in a maker — the owner is about to replace it — and is the one
 *   thing `Applied.tsx` says this page will never do, because nothing tells a
 *   client the brand did not say it. So the kinds are pinned rather than
 *   rolled (`preserveKinds`), the templates are drawn from a set that asks for
 *   none of the inventing kinds, and a brand with no voice has its
 *   `voice-quote` cells stood down to colour. Content itself still comes from
 *   the canonical roll.
 */
import { useMemo } from 'react';
import { getTemplate } from '@/features/bento/templates';
import { generateTiles } from '@/features/bento/shuffle';
import { BentoCanvas } from '@/features/bento/components/BentoCanvas';
import type { BentoDesign, BentoTile, TileKind } from '@/features/bento/types';
import type { IdentityModel } from '../identityModel';
import type { IdentityRegister } from '../identityRegister';
import { AppliedFigure } from './Surfaces';

/**
 * The layouts this section draws from.
 *
 * Landscape only — the section is a wide band on a page, and a 9:16 story
 * template in it is a column of postage stamps. None of them asks for `stat`
 * or `text`, which is the other half of why the list is explicit rather than
 * `TEMPLATES.filter(...)`: a landscape template added to the maker tomorrow
 * with a `stat` cell in it would otherwise start inventing revenue figures on
 * a client's brand guidelines.
 */
const LAYOUTS = ['wide-banner', 'broadcast', 'accent-sidebar', 'trio', 'minimal-3'] as const;

/** Kinds whose content can only come from the brand. See the header. */
const NEVER_INVENTS: ReadonlySet<TileKind> = new Set<TileKind>([
  'logo',
  'color',
  'gradient',
  'pattern',
  'typography',
  'asset-image',
]);

/**
 * A number this brand will always hash to.
 *
 * djb2 over the brand id. The id is stable for the life of the brand, so the
 * wall is the same wall on every visit and in every export — and two brands
 * get two different walls, which is the point of seeding it at all rather than
 * fixing one layout for everybody.
 */
function seedOf(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i += 1) h = ((h << 5) + h + id.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Every line this brand can be quoted saying.
 *
 * `resolveContent`'s `voice-quote` reads the LEGACY `guidelines.voiceAndTone`
 * plus `brand.strategy` / `brand.tone`, and falls back to `SAMPLE_QUOTES` when
 * it finds nothing. The identity model reads the CANONICAL `identity.voice`.
 * Those are different fields, so "the model has voice examples" does not mean
 * "the roll will find them" — a brand whose voice was recorded canonically got
 * "Every detail, on purpose." presented as its own, which a test caught. So
 * the check is on the OUTPUT: a quote this set does not contain was invented,
 * whatever the roll thought it was reading.
 */
function ownWords(model: IdentityModel): Set<string> {
  const brand = model.brand;
  const out = new Set<string>();
  for (const e of model.voice.examples) if (e.text) out.add(e.text);
  const legacy = brand.guidelines?.voiceAndTone;
  if (legacy?.brandVoice) out.add(legacy.brandVoice);
  for (const e of legacy?.examples ?? []) if (e.good) out.add(e.good);
  if (typeof brand.strategy === 'string' && brand.strategy) out.add(brand.strategy);
  if (brand.tone) out.add(`Tone: ${brand.tone}`);
  return out;
}

/**
 * The wall this brand gets — pure, so the rules above can be tested rather
 * than asserted in a comment.
 */
export function buildIdentityBento(model: IdentityModel, register: IdentityRegister): BentoDesign {
  const brand = model.brand;
  const seed = seedOf(brand.id ?? model.name);
  const template = getTemplate(LAYOUTS[seed % LAYOUTS.length]);
  const speaks = ownWords(model);

  /*
   * The kinds, decided here; the content, rolled by the maker.
   *
   * `preserveKinds` reads each cell's kind off this array and re-rolls only
   * what goes inside it, which is the seam that lets the page hold the
   * editorial line without owning a single line of tile logic.
   */
  const pin = (kinds: Map<string, TileKind>) =>
    template.tiles.map((t) => {
      const asked = kinds.get(t.id) ?? t.kind;
      const safe = NEVER_INVENTS.has(asked) || asked === 'voice-quote' ? asked : 'color';
      return { ...t, kind: safe, content: {} } as BentoTile;
    });

  const wanted = new Map<string, TileKind>();
  let tiles = generateTiles({
    brand,
    template,
    preserveKinds: true,
    preserveTiles: pin(wanted),
    seed,
  });

  /*
   * One correction pass, then done.
   *
   * A quote that is not the brand's own stands the cell down to colour and the
   * wall is rolled again — from the same seed, so the tiles that were fine come
   * back identical. The second pass cannot need a third: `color` never invents.
   */
  const invented = tiles.filter((t) => t.kind === 'voice-quote' && !speaks.has(t.content.text ?? ''));
  if (invented.length > 0) {
    for (const t of invented) wanted.set(t.id, 'color');
    tiles = generateTiles({
      brand,
      template,
      preserveKinds: true,
      preserveTiles: pin(wanted),
      seed,
    });
  }

  return {
    id: `identity-${brand.id ?? 'brand'}`,
    templateId: template.id,
    sizeId: 'wide-16x9',
    tiles,
    // The page's own paper, so the wall sits IN the document rather than on a
    // white card dropped into it. Everything inside the tiles is still the
    // brand's, drawn by the maker.
    backgroundColor: register.scale.shades[50].hex,
    gap: 1.2,
    radius: 1.6,
    padding: 1.2,
    cols: template.cols,
    rows: template.rows,
  };
}

export function BentoSurface({
  model,
  register,
}: {
  model: IdentityModel;
  register: IdentityRegister;
}) {
  const design = useMemo(() => buildIdentityBento(model, register), [model, register]);

  return (
    <AppliedFigure label="Bento">
      <div className="bi-bento-host">
        <BentoCanvas
          design={design}
          brand={model.brand}
          selectedTileId={null}
          onSelectTile={noop}
          onImageDropped={noop}
          interactive={false}
        />
      </div>
    </AppliedFigure>
  );
}

/* `BentoCanvas` requires both callbacks; `interactive={false}` never calls
   either. Declared once rather than inline so the memoised canvas is not
   handed two new functions on every render. */
function noop() {}

export default BentoSurface;
