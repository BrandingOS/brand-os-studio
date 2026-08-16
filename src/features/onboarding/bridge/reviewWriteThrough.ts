/**
 * The review's edits, written to the canonical brand as they happen.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 *
 * `project()` reads the brand INTO the frozen review panel. This is the other
 * half: it reads the panel back OUT. Without it the review was a one-way
 * mirror — the brand's values were shown, and everything the user did to them
 * afterwards lived only in a transient zustand store that `reset()` throws away
 * on Finish. Colours, typefaces, logo placements, links, uploaded files and
 * free-form strategy sections were all in that store. The user finished
 * onboarding, opened their brand, and found a name.
 *
 * ── Why it is one reconciler rather than a write per control ──────────────
 *
 * The panel is FROZEN (see CLAUDE.md). It is 2,400 lines with roughly two dozen
 * places that mutate a colour, a font, a slot or a link, several of them inside
 * components that never receive a brand id. Threading a write through each one
 * means editing every one of them, and means the next control added to the panel
 * is silently not persisted — the exact failure being fixed here.
 *
 * So the trigger is the store itself. Every action still writes to the brand as
 * it happens, because every action changes the store and the store change is
 * what runs this; there is no "collect at the end". What is centralised is the
 * MAPPING, in one file, beside the projection it is the inverse of.
 *
 * ── What decides the authority ────────────────────────────────────────────
 *
 * A value that differs from what the brand holds got there because a person
 * changed it, so it is written as that person and confirmed — an edit in the
 * review IS a decision (FR-025). The single exception is the typeface pairing
 * the panel offers when a brand brought none: the product proposed that, nobody
 * confirmed it, and it is written as the interpreter so it lands at `suggested`
 * and stays a suggestion. It is still WRITTEN — an unconfirmed proposal has to
 * survive the session or the review showed the user something that does not
 * exist.
 */
import { container } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS, type IAssetsService } from '@/core/types/services';
import type { BrandRepository } from '@/domain/brand/repository';
import type { CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import type { CanonicalBrand } from '@/domain/brand';
import type { Brand } from '@/shared/types/brand';
import type { LogoRole } from '@/shared/types/brandAssets';
import type { BusinessInfo } from '@/domain/brand/identity';
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';
import {
  clearPlaceholders,
  placeholderPaths,
  readOnboardingState,
} from '@/shared/onboarding/onboardingState';
import { changeBrandStrategy } from '@/application/brand/changeBrandStrategy';

import { editValues } from '../understanding/acceptance';
import { applyProposals, applyBusinessFacts, sentinelsRetiredBy } from '../understanding/applyProposals';
import { groupFontFamilies } from '../understanding/fonts';
import { logoSystemPatch, roleForSlot, storeMaterial } from '../understanding/material';

const repo = () => container.get<BrandRepository>(SERVICE_KEYS.BRAND_REPOSITORY);
const library = () => container.get<IAssetsService>(SERVICE_KEYS.ASSETS);

/** A colour palette is a decision, not a mood board. Mirrors `MAX_PALETTE`. */
const MAX_PALETTE = 5;

export interface Human {
  kind: 'human';
  userId: string;
}

export interface WriterDeps {
  brandId: string;
  /** The brand as it is RIGHT NOW. Every write here is read-modify-write. */
  brand(): Brand | undefined;
  updateBrand(id: string, patch: Partial<Brand>): Promise<unknown>;
  actor: Human;
  /** Told when one item could not be stored, so the row can say so. */
  onItemError?(itemId: string, reason: string): void;
}

/**
 * What the review currently says the brand is.
 *
 * Derived from the transient store, in the store's own terms. Kept as a plain
 * value so the diffing below is testable without a store, a panel or a brand.
 */
export interface ReviewState {
  items: readonly OnboardingAsset[];
  aboutSections: ReadonlyArray<{ id: string; name: string; content: string }>;
  /** Families the PRODUCT offered rather than the brand chose. */
  suggestedFonts?: readonly string[];
  /**
   * Which swatch the user marked as the brand's primary.
   *
   * The review keeps this beside the list rather than by reordering it, so a
   * reader that goes only by array order sees "Set primary" change nothing.
   */
  primaryColorId?: string | null;
}

/** Names of anything that did not save, for honest reporting. Never thrown. */
export type NotSaved = string[];

const hex = (v: string | undefined) => (v ? v.toUpperCase() : undefined);

/**
 * The palette the review is showing, in Core order.
 *
 * "Core order" means primary first, and the review says which one that is with
 * a separate mark rather than by moving it to the front of the list. Reading
 * the list alone made "Set primary" a button that visibly did something and
 * saved nothing.
 */
export function paletteOf(
  items: readonly OnboardingAsset[],
  primaryColorId?: string | null,
): string[] {
  const swatches = items.filter((a) => a.kind === 'color' && a.value);
  const lead = swatches.findIndex((a) => a.id === primaryColorId);
  const ordered = lead > 0 ? [swatches[lead], ...swatches.filter((_, i) => i !== lead)] : swatches;

  const out: string[] = [];
  for (const a of ordered) {
    const h = hex(a.value)!;
    if (!out.includes(h)) out.push(h);
  }
  return out.slice(0, MAX_PALETTE);
}

/**
 * The palette the brand holds, in the same order, so the two are comparable.
 *
 * A sentinel is excluded. `colors.primary` is NOT NULL in storage, so a brand
 * that has decided nothing still carries a stand-in there — counting it as a
 * held colour makes the first real palette look like no change at all, and the
 * brand keeps the placeholder.
 */
export function paletteOfBrand(c: CanonicalBrand, sentinels: readonly string[] = []): string[] {
  const colors = c.identity?.colors;
  const out = [
    sentinels.includes('colors.primary') ? undefined : hex(colors?.primary?.hex),
    hex(colors?.secondary?.hex),
  ];
  for (const n of colors?.neutrals ?? []) out.push(hex(n?.hex));
  return out.filter((v): v is string => Boolean(v));
}

type LinkKind = NonNullable<BusinessInfo['links']>[number]['kind'];

const LINK_KINDS = new Set<string>([
  'website',
  'linkedin',
  'instagram',
  'x',
  'facebook',
  'youtube',
  'tiktok',
]);

/** Hosts `BusinessInfo.links` names. Anything else is a website or `other`. */
const SOCIAL_HOSTS: Array<[RegExp, LinkKind]> = [
  [/(^|\.)linkedin\.com$/i, 'linkedin'],
  [/(^|\.)instagram\.com$/i, 'instagram'],
  [/(^|\.)(x|twitter)\.com$/i, 'x'],
  [/(^|\.)facebook\.com$/i, 'facebook'],
  [/(^|\.)(youtube\.com|youtu\.be)$/i, 'youtube'],
  [/(^|\.)tiktok\.com$/i, 'tiktok'],
];

/** Platforms with a home in the product but not in `BusinessInfo.links`. */
const OTHER_HOSTS = /(^|\.)(behance\.net|dribbble\.com|github\.com|pinterest\.[a-z.]+|threads\.net)$/i;

/**
 * What kind of link this is.
 *
 * The dropzone's URL pill records no platform at all — it stores the url and
 * the host and nothing else. So a brand's own website arrived carrying no
 * marker saying it was one, and every reader that asked
 * `socialPlatform === 'website'` found nothing: the brand's `publicUrl` was
 * never set and the address the user typed on the second screen never reached
 * Business Info. The url itself is the evidence, so read that.
 */
export function linkKindOf(item: OnboardingAsset): LinkKind {
  const explicit = item.socialPlatform;
  if (explicit && LINK_KINDS.has(explicit)) return explicit as LinkKind;
  if (explicit === 'twitter') return 'x';
  if (explicit) return 'other';

  let host = '';
  try {
    host = new URL(item.sourceUrl ?? '').hostname;
  } catch {
    return 'other';
  }
  const social = SOCIAL_HOSTS.find(([re]) => re.test(host));
  if (social) return social[1];
  if (OTHER_HOSTS.test(host)) return 'other';
  // A host nobody recognises is the brand's own address. That is what the
  // dropzone's own detector concludes too.
  return 'website';
}

/** The brand's own address, when it brought one. */
export function websiteOf(items: readonly OnboardingAsset[]): string | undefined {
  return items.find((a) => a.kind === 'link' && a.sourceUrl && linkKindOf(a) === 'website')
    ?.sourceUrl;
}

/** Links the review is showing, in the shape Business Info stores them. */
export function linksOf(items: readonly OnboardingAsset[]): BusinessInfo['links'] {
  const seen = new Set<string>();
  const out: NonNullable<BusinessInfo['links']> = [];
  for (const a of items) {
    if (a.kind !== 'link' || !a.sourceUrl) continue;
    if (seen.has(a.sourceUrl)) continue;
    seen.add(a.sourceUrl);
    out.push({
      kind: linkKindOf(a),
      url: a.sourceUrl,
      // A Behance profile is still a link the brand has — it keeps its handle
      // as the label rather than being dropped for having no named kind.
      ...(a.handle ? { label: a.handle } : {}),
    });
  }
  return out;
}

/**
 * Everything the Library should be holding.
 *
 * Files, which means: not a colour, not a link, and not a row that stands for
 * something with no bytes behind it. A Google font is a NAME the user picked —
 * there is no file to store and reporting one as unsaved would be inventing a
 * failure out of a row that was never material.
 */
export function materialOf(items: readonly OnboardingAsset[]): OnboardingAsset[] {
  return items.filter(
    (a) => a.kind !== 'color' && a.kind !== 'link' && Boolean(a._file || a.previewUrl),
  );
}

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Builds the writer for one brand.
 *
 * Stateful on purpose: it remembers which material it has already stored and
 * where each logo landed, so reconciling twenty times over a review session
 * re-uploads nothing. The memory is a cache of work done, never of truth — every
 * decision below is made against the brand read fresh.
 */
export function createReviewWriter(deps: WriterDeps) {
  /** onboarding item id → the id the Library gave it. */
  const stored = new Map<string, string>();
  /** Serialises reconciles: two overlapping ones would lose each other's work. */
  let chain: Promise<NotSaved> = Promise.resolve([]);

  async function reconcile(state: ReviewState): Promise<NotSaved> {
    const notSaved: NotSaved = [];
    const canonical = await repo().getById(deps.brandId);
    if (!canonical) return ['your brand'];
    // Stand-ins that exist only to satisfy a NOT NULL column. A brand holding
    // one has decided nothing there, so it must not read as "already has this".
    const sentinels = placeholderPaths(deps.brand());

    // ── Material → Library ────────────────────────────────────────────
    // First, because a logo cannot be placed before the file it points at
    // exists, and because a file the user can see in the review but that never
    // reached the Library is the most quietly wrong outcome available.
    const brand = deps.brand();
    if (brand) {
      for (const item of materialOf(state.items)) {
        if (stored.has(item.id)) continue;
        if (item.uploadStatus === 'uploading') continue;
        const result = await storeMaterial(library(), brand, item, deps.onItemError);
        if (result) stored.set(item.id, result.assetId);
        else notSaved.push(item.name);
      }
    }

    // ── Logos → logoSystem ────────────────────────────────────────────
    const placements: Array<{ role: LogoRole; assetId: string }> = [];
    const usedRoles = new Set<LogoRole>();
    for (const item of state.items) {
      if (item.kind !== 'image' || !item.logoSlot) continue;
      const role = roleForSlot(item.logoSlot);
      // A named variant of the user's own has no canonical role. It stays in
      // the Library as a logo and claims no slot — see `SLOT_TO_ROLE`.
      if (!role || usedRoles.has(role)) continue;
      const assetId = stored.get(item.id);
      if (!assetId) continue;
      usedRoles.add(role);
      const current = readLogoRef(canonical, role);
      if (current === assetId) continue;
      placements.push({ role, assetId });
    }
    if (placements.length && brand) {
      try {
        await deps.updateBrand(deps.brandId, logoSystemPatch(brand, placements));
      } catch {
        notSaved.push('your logo placements');
      }
    }

    // ── Colours + typefaces → Core, as the user ───────────────────────
    const edits: Array<{ path: CoreFieldPath; value: unknown }> = [];

    const palette = paletteOf(state.items, state.primaryColorId);
    if (palette.length && !sameList(palette, paletteOfBrand(canonical, sentinels))) {
      edits.push({ path: 'colors.primary', value: { hex: palette[0] } });
      if (palette[1]) edits.push({ path: 'colors.secondary', value: { hex: palette[1] } });
      if (palette.length > 2) {
        edits.push({ path: 'colors.neutrals', value: palette.slice(2).map((h) => ({ hex: h })) });
      }
    }

    const suggested = new Set(state.suggestedFonts ?? []);
    const families = groupFontFamilies([...state.items]).map((f) => f.family);
    const chosen = families.filter((f) => !suggested.has(f));
    const held = [
      sentinels.includes('typography.primary')
        ? undefined
        : canonical.identity?.typography?.primary?.family,
      canonical.identity?.typography?.secondary?.family,
    ].filter((v): v is string => Boolean(v));

    if (chosen.length && !sameList(chosen.slice(0, 2), held)) {
      edits.push({ path: 'typography.primary', value: { family: chosen[0] } });
      if (chosen[1]) edits.push({ path: 'typography.secondary', value: { family: chosen[1] } });
    }

    if (edits.length) {
      try {
        await editValues(repo(), deps.brandId, edits, { kind: 'human', userId: deps.actor.userId });
      } catch {
        notSaved.push('your colours and typefaces');
      }
    }

    // ── The pairing the product offered → Core, as a SUGGESTION ───────
    // Only when the brand has no typeface of its own. It is written so it
    // survives the session, and written as the interpreter so it opens at
    // `suggested` and never masquerades as the user's decision.
    if (!chosen.length && !held.length && families.length) {
      try {
        await applyProposals(repo(), deps.brandId, [
          {
            corePath: 'typography.primary',
            value: { family: families[0] },
            provenance: 'ai-suggested',
            evidence: 'suggested for your brand',
          },
          ...(families[1]
            ? [
                {
                  corePath: 'typography.secondary' as CoreFieldPath,
                  value: { family: families[1] },
                  provenance: 'ai-suggested' as const,
                  evidence: 'suggested for your brand',
                },
              ]
            : []),
        ]);
      } catch {
        notSaved.push('the suggested typefaces');
      }
    }

    // ── Links → Business Info ─────────────────────────────────────────
    const links = linksOf(state.items) ?? [];
    const heldLinks = canonical.businessInfo?.links ?? [];
    if (links.length && !sameList(links.map((l) => l.url), heldLinks.map((l) => l.url))) {
      const website = links.find((l) => l.kind === 'website')?.url;
      const failures = await applyBusinessFacts(repo(), deps.brandId, {
        links,
        ...(website ? { website } : {}),
      });
      notSaved.push(...failures);
    }

    // ── Free-form strategy sections → strategy.aboutSections ──────────
    const sections = state.aboutSections.map((s) => ({
      id: s.id,
      title: s.name,
      content: s.content,
    }));
    const heldSections = canonical.identity?.strategy?.aboutSections ?? [];
    if (
      sections.length &&
      !sameList(
        sections.map((s) => `${s.title} ${s.content}`),
        heldSections.map((s) => `${s.title} ${s.content}`),
      )
    ) {
      try {
        // No authority: a section the user wrote is their words, and there is
        // nothing to confirm about wording. `aboutSections` is deliberately not
        // a CoreFieldPath for exactly that reason.
        await changeBrandStrategy(repo(), deps.brandId, { aboutSections: sections });
      } catch {
        notSaved.push('your brand strategy sections');
      }
    }

    // ── A real value retires its sentinel, permanently ────────────────
    if (edits.length) {
      const retired = sentinelsRetiredBy({
        applied: edits.map((e) => e.path),
        failed: [],
      });
      const next = clearPlaceholders(readOnboardingState(deps.brand()), retired);
      if (next) {
        try {
          await deps.updateBrand(deps.brandId, { onboarding: next });
        } catch {
          /* losing a placeholder marker costs nothing the user can see */
        }
      }
    }

    return notSaved;
  }

  return {
    /**
     * Writes the review's current state to the brand.
     *
     * Reconciles are queued rather than run concurrently: each one loads,
     * mutates and saves the whole brand, so two in flight would overwrite one
     * another and the earlier edit would simply vanish.
     */
    persist(state: ReviewState): Promise<NotSaved> {
      chain = chain.then(
        () => reconcile(state),
        () => reconcile(state),
      );
      return chain;
    },
    /** Test seam: what the Library holds for a given onboarding item. */
    assetIdFor(itemId: string): string | undefined {
      return stored.get(itemId);
    },
  };
}

export type ReviewWriter = ReturnType<typeof createReviewWriter>;

function readLogoRef(c: CanonicalBrand, role: LogoRole): string | undefined {
  const logos = c.identity?.logos;
  if (!logos) return undefined;
  switch (role) {
    case 'primary':
      return logos.primary?.assetId;
    case 'secondary':
      return logos.secondary?.assetId;
    case 'wordmark':
      return logos.wordmark?.assetId;
    case 'iconmark':
      return logos.iconmark?.assetId;
    case 'mono.black':
      return logos.mono?.black?.assetId;
    case 'mono.white':
      return logos.mono?.white?.assetId;
    case 'horizontal':
      return logos.orientations?.horizontal?.assetId;
    case 'stacked':
      return logos.orientations?.stacked?.assetId;
    default:
      return undefined;
  }
}
