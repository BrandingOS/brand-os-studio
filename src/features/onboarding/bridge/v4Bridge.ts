/**
 * The seam between the restored interface and the V3 pipeline.
 *
 * The interface is frozen: `onboarding-v4` renders from its own transient store
 * and knows nothing about Brand Core, authority or the Library. Rather than
 * rewrite those screens, this module swaps what is UNDERNEATH them —
 *
 *   create   the brand exists from the moment the setup panel is left, so
 *            every later edit is an ordinary write against a real brand id
 *   material goes to the Library, never inline on the brand record
 *   read     the review's store is a PROJECTION of the canonical brand
 *   write    an edit in the review is a human write, which confirms that value
 *
 * The projection is one-way on load and write-through on change. That is what
 * lets a 2,179-line panel keep working untouched while the values it shows come
 * from, and go to, the Foundation.
 *
 * Nothing here decides anything about the brand — interpretation, source
 * priority and acceptance all live in `understanding/`. This module only moves
 * data across the seam.
 */
import { container } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS, type IAssetsService } from '@/core/types/services';
import type { BrandRepository } from '@/domain/brand/repository';
import type { CanonicalBrand } from '@/domain/brand';
import { coreValueMeta } from '@/domain/brand/coreMeta';
import type { CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import type { Brand } from '@/shared/types/brand';
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';
import { clearPlaceholders, readOnboardingState, withBrief } from '@/shared/onboarding/onboardingState';

import { buildCreateInput, normalizeUrl } from '../understanding/createBrand';
import { interpret, type Understanding } from '../understanding/interpret';
import { applyBusinessFacts, applyProposals, sentinelsRetiredBy } from '../understanding/applyProposals';
import { acceptAll, acceptProposal, editValue } from '../understanding/acceptance';
import { classifyLogos, type Artworks } from '../understanding/logoClassify';
import { groupFontFamilies } from '../understanding/fonts';
import { VOCABULARIES, type VocabularyName } from '../vocabulary/vocabularies';

const repo = () => container.get<BrandRepository>(SERVICE_KEYS.BRAND_REPOSITORY);

export interface CreateInput {
  name: string;
  description: string;
  /** The URL typed into the dropzone's pill. Optional, always. */
  website?: string;
}

export interface UnderstandResult {
  understanding: Understanding;
  /** Named writes that did not land, for honest reporting. Never thrown. */
  notSaved: string[];
}

/**
 * Creates the brand and records the brief.
 *
 * Brand-first: from here on there is a real brand id, so nothing needs a
 * staging store and resume works across sessions for free.
 */
export async function createBrand(
  create: (input: unknown) => Promise<Brand>,
  update: (id: string, patch: unknown) => Promise<unknown>,
  input: CreateInput,
): Promise<Brand> {
  const website = input.website?.trim() ? normalizeUrl(input.website) : '';
  const brand = await create(
    buildCreateInput({ name: input.name.trim(), ...(website ? { website } : {}) }),
  );
  // The brief rides on the onboarding marker, not on `businessInfo.description`
  // — that field belongs to products and services, and two writers on it would
  // put the whole brief on screen as the product list.
  if (input.description.trim()) {
    await update(brand.id, { onboarding: withBrief(readOnboardingState(brand), input.description) });
  }
  return brand;
}

/** Puts one supplied item in the Library. Never throws; marks the item instead. */
export async function toLibrary(
  brandId: string,
  item: OnboardingAsset,
  onError?: (id: string, reason: string) => void,
): Promise<void> {
  try {
    const assets = container.get<IAssetsService>(SERVICE_KEYS.ASSETS);
    await assets.create({
      brandId,
      name: item.name,
      type: item.kind === 'image' ? 'image' : 'document',
      category: item.isLogo || item.logoSlot ? 'logo' : 'photo',
      source: 'upload',
      url: item.previewUrl ?? '',
      size: item._file?.size ?? 0,
      tags: [],
      metadata: { originalName: item.name, contentHash: item.contentHash },
      origin: 'uploaded',
    } as never);
  } catch {
    onError?.(item.id, "Couldn't store this one. Everything else is fine.");
  }
}

/**
 * The understanding pass, written through to the brand.
 *
 * Proposals land at `suggested` because `applyProposals` writes as the
 * interpreter; nothing here can reach `confirmed`.
 */
export async function understand(
  brand: Brand,
  items: OnboardingAsset[],
  update: (id: string, patch: unknown) => Promise<unknown>,
  /**
   * The text the user actually typed.
   *
   * Passed in rather than re-read off the marker: `brand` here is the record as
   * CREATED, and the brief was written a moment later — reading it back off
   * that snapshot found nothing, so understanding ran on an empty description
   * and the review came up bare. The marker copy is for resume; the live pass
   * already has the text in hand.
   */
  description?: string,
): Promise<UnderstandResult> {
  const text = description?.trim() || readOnboardingState(brand)?.brief;
  const understanding = await interpret(
    { description: text, items, website: brand.publicUrl },
    { groupFonts: groupFontFamilies },
  );

  const report = await applyProposals(repo(), brand.id, understanding.proposals);
  const notSaved = await applyBusinessFacts(repo(), brand.id, understanding.business);

  // A real value retires its sentinel, permanently. Read live — the writes
  // above went through the repository, so a render-time copy is behind.
  const retired = sentinelsRetiredBy(report);
  if (retired.length) {
    const next = clearPlaceholders(readOnboardingState(brand), retired);
    if (next) await update(brand.id, { onboarding: next });
  }

  if (report.failed.length) {
    notSaved.push(`${report.failed.length} thing${report.failed.length === 1 ? '' : 's'} we found`);
  }
  return { understanding, notSaved };
}

/** Resolves a stored vocabulary id back to its label. Falls back to the value. */
export function labelOf(vocab: VocabularyName, id?: string): string | undefined {
  if (!id) return undefined;
  return VOCABULARIES[vocab].find((m) => m.id === id)?.label ?? id;
}

// ── The projection ────────────────────────────────────────────────────────

/** How many swatches a palette holds. A palette is a decision, not a mood board. */
export const MAX_PALETTE = 5;

/**
 * Where a value came from, in the user's language.
 *
 * The most important thing about a typeface on this screen is whose choice it
 * was: a font the user uploaded and a font we proposed look identical in a list
 * and must never be mistaken for each other. Uploaded evidence outranks the
 * brief, which outranks anything we suggested — and the label says so.
 */
export type ValueOrigin = 'uploaded' | 'brief' | 'suggested' | 'chosen';

export const ORIGIN_LABEL: Record<ValueOrigin, string> = {
  uploaded: 'From your upload',
  brief: 'From your brand profile',
  suggested: 'Suggested — not confirmed',
  chosen: 'Chosen by you',
};

/** Reads the origin off a Core value's recorded provenance and authority. */
export function originOf(canonical: CanonicalBrand, path: CoreFieldPath): ValueOrigin {
  const meta = coreValueMeta(canonical.identityMeta, path);
  if (meta.provenance === 'user-entered') return 'chosen';
  if (meta.provenance === 'inferred') return 'uploaded';
  return 'brief';
}

export interface Projection {
  /** Colour swatches, in Core order: primary, secondary, then neutrals. */
  colors: Array<{ hex: string; primary: boolean }>;
  /** Typeface families, primary first, each with where it came from. */
  fonts: Array<{ family: string; origin: ValueOrigin }>;
  /** Where the palette came from. */
  colorOrigin?: ValueOrigin;
  /** Logo placements the classifier could evidence. */
  logoSlots: Array<{ assetId: string; slot: string }>;
  /** Exact duplicates dropped before the board saw them. */
  duplicateIds: string[];
  slogan: string;
  industryLabel?: string;
  styleLabels: string[];
  /** The structured profile, for Brand Strategy's selections and text. */
  profile: Array<{ path: CoreFieldPath; vocab?: VocabularyName; value: unknown }>;
  /**
   * The business facts, as STORED rather than as labelled.
   *
   * The label is for reading; the picker needs the id it selected, and the
   * prose fields need their text back to edit it.
   */
  business: { industry?: string; tagline?: string; description?: string };
}

const PROFILE_PATHS: Array<{ path: CoreFieldPath; vocab?: VocabularyName }> = [
  { path: 'strategy.summary' },
  { path: 'visualStyle.descriptors', vocab: 'style' },
  { path: 'strategy.personality', vocab: 'personality' },
  { path: 'voice.tone', vocab: 'tone' },
  { path: 'strategy.values', vocab: 'values' },
  { path: 'strategy.mission' },
  { path: 'strategy.targetAudience' },
  { path: 'strategy.positioning' },
];

function read(identity: unknown, path: string): unknown {
  let cursor: unknown = identity;
  for (const seg of path.split('.')) {
    if (cursor === null || typeof cursor !== 'object') return undefined;
    cursor = (cursor as Record<string, unknown>)[seg];
  }
  return cursor;
}

/**
 * Reads the brand into the shape the restored review renders.
 *
 * `sentinelPaths` are excluded outright: a stand-in that exists only to satisfy
 * a NOT NULL column must never appear as a colour the user chose.
 */
export function project(
  canonical: CanonicalBrand,
  items: OnboardingAsset[],
  sentinelPaths: readonly string[] = [],
  /** What each picture turned out to be, so identical artwork folds into one. */
  art?: Artworks,
): Projection {
  const identity = canonical.identity;
  const business = canonical.businessInfo ?? {};

  const colors: Projection['colors'] = [];
  if (!sentinelPaths.includes('colors.primary') && identity?.colors?.primary?.hex) {
    colors.push({ hex: identity.colors.primary.hex.toUpperCase(), primary: true });
  }
  if (identity?.colors?.secondary?.hex) {
    colors.push({ hex: identity.colors.secondary.hex.toUpperCase(), primary: false });
  }
  for (const n of identity?.colors?.neutrals ?? []) {
    if (n?.hex) colors.push({ hex: n.hex.toUpperCase(), primary: false });
  }

  const fonts: Projection['fonts'] = [];
  if (!sentinelPaths.includes('typography.primary') && identity?.typography?.primary?.family) {
    fonts.push({
      family: identity.typography.primary.family,
      origin: originOf(canonical, 'typography.primary'),
    });
  }
  if (identity?.typography?.secondary?.family) {
    fonts.push({
      family: identity.typography.secondary.family,
      origin: originOf(canonical, 'typography.secondary'),
    });
  }

  const classified = classifyLogos(items, art);

  /**
   * The redundant copies — every image folded UNDER a lead as the same artwork.
   *
   * These are removed from the store rather than merely hidden, because the
   * board has its own router that places any logo it finds. Leaving them in
   * meant the projection folded six uploads into three and the router promptly
   * put the other three back, which is why the same picture appeared six times.
   *
   * This is deliberately NOT "every image that is not a lead": that set also
   * contains photographs, which belong in Brand Assets and must never be
   * deleted for failing to be a logo.
   */
  const duplicateIds = classified.groups.flatMap((g) => g.variants.map((v) => v.id));

  return {
    // Capped here as well as at every entry point: the projection is what the
    // review renders, so it is the last place a ninth swatch could slip in.
    colors: colors.slice(0, MAX_PALETTE),
    colorOrigin: colors.length ? originOf(canonical, 'colors.primary') : undefined,
    fonts,
    logoSlots: classified.groups
      .filter((g) => g.slot !== null)
      .map((g) => ({ assetId: g.lead.id, slot: g.slot as string })),
    duplicateIds,
    slogan: business.tagline ?? '',
    industryLabel: labelOf('industry', business.industry),
    business: {
      ...(business.industry ? { industry: business.industry } : {}),
      ...(business.tagline ? { tagline: business.tagline } : {}),
      ...(business.description ? { description: business.description } : {}),
    },
    styleLabels: ((identity?.visualStyle?.descriptors ?? []) as string[]).map(
      (d) => labelOf('style', d) ?? d,
    ),
    profile: PROFILE_PATHS.map(({ path, vocab }) => ({
      path,
      vocab,
      value: read(identity, path),
    })).filter((r) => {
      const v = r.value;
      if (v === undefined || v === null) return false;
      if (typeof v === 'string') return v.trim().length > 0;
      if (Array.isArray(v)) return v.length > 0;
      return true;
    }),
  };
}

// ── Write-through ─────────────────────────────────────────────────────────

export interface Human {
  kind: 'human';
  userId: string;
}

/**
 * A user edit: writes the value as the user AND confirms it.
 *
 * Both halves matter. A human write alone lands at `provisional` — deciding
 * something is what raises it, and the user deciding it is exactly what an edit
 * in the review IS.
 */
export async function editAsUser(
  brandId: string,
  path: CoreFieldPath,
  value: unknown,
  actor: Human,
): Promise<void> {
  await editValue(repo(), brandId, path, value as never, actor);
}

/** An explicit accept, per value. */
export async function accept(brandId: string, path: CoreFieldPath, actor: Human): Promise<void> {
  await acceptProposal(repo(), brandId, path, actor);
}

/** "Looks right" — a LOOP over the per-value act, never a section authority. */
export async function acceptSection(
  brandId: string,
  paths: CoreFieldPath[],
  actor: Human,
): Promise<void> {
  await acceptAll(repo(), brandId, paths, actor);
}

/**
 * Renames the brand.
 *
 * The name is the brand's own identity rather than a Core value, so it carries
 * no authority and there is nothing to confirm — it simply saves. The slug is
 * deliberately left alone: it is already in the URL the user is standing on.
 */
export async function renameBrand(brandId: string, name: string): Promise<void> {
  const brand = await repo().getById(brandId);
  if (!brand) return;
  await repo().save({ ...brand, name });
}

/** Business facts save on edit and carry nothing to confirm. */
export async function saveBusinessFact(
  brandId: string,
  fact: Record<string, unknown>,
): Promise<string[]> {
  return applyBusinessFacts(repo(), brandId, fact as never);
}

export { repo as brandRepository };
