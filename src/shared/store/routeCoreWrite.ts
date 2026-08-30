/**
 * Routes Brand Core fields out of the generic store update and into the one
 * canonical write path.
 *
 * `brandStore.update(id, patch)` accepts any `Partial<Brand>`, which is how the
 * codebase ended up with several ways to change the same colour. The fix is not
 * to delete the method — dozens of call sites legitimately patch non-Core
 * fields like `name` — but to SPLIT the patch: Core subsystems go through the
 * application-layer ops that own them, everything else keeps its existing path.
 *
 * Only subsystems that HAVE a canonical op are routed. Logos deliberately are
 * not: there is no `changeBrandLogos` yet, and intercepting logo writes with
 * nowhere to send them would break asset upload for no gain. They are reported
 * as unroutable so the dev warning stays honest about what is still open.
 */
import type { BrandRepository } from '@/domain/brand/repository';
import type { CanonicalBrand } from '@/domain/brand';
import type { Brand } from '@/shared/types/brand';
import type { ColorToken, TypographySystem } from '@/shared/types/brandAssets';
import { changeBrandColors, type BrandColorChanges } from '@/application/brand/changeBrandColor';
import { changeBrandTypography } from '@/application/brand/changeBrandTypography';
import { changeBrandVoiceTone } from '@/application/brand/changeBrandVoice';
import { changeBrandStrategy } from '@/application/brand/changeBrandStrategy';
import { changeBrandVisualStyle } from '@/application/brand/changeBrandVisualStyle';
import type { StyleDescriptor } from '@/domain/brand/identity';
import type { CoreWriteOptions } from '@/application/brand/coreWrite';

/** Core fields with a canonical op — these are rerouted. */
export const ROUTED_CORE_KEYS = [
  'primaryColor',
  'secondaryColor',
  'accentColor',
  'neutrals',
  'colorSystem',
  'fonts',
  'typography',
  'tone',
  'strategy',
  'visualStyle',
] as const satisfies readonly (keyof Brand)[];

/** Core fields with NO canonical op yet — reported, not rerouted. */
export const UNROUTED_CORE_KEYS = ['logoSystem', 'logoAssets', 'logo'] as const satisfies readonly (keyof Brand)[];

export type RoutedCoreKey = (typeof ROUTED_CORE_KEYS)[number];

export interface SplitPatch {
  /** Core fields that will go through the canonical ops. */
  core: Partial<Brand>;
  /** Everything else — keeps the existing service path. */
  rest: Partial<Brand>;
  routedKeys: RoutedCoreKey[];
  unroutedCoreKeys: string[];
}

export function splitCorePatch(patch: Partial<Brand>): SplitPatch {
  const core: Partial<Brand> = {};
  const rest: Partial<Brand> = {};
  const routedKeys: RoutedCoreKey[] = [];
  const unroutedCoreKeys: string[] = [];

  for (const key of Object.keys(patch) as (keyof Brand)[]) {
    if (patch[key] === undefined) continue;
    if ((ROUTED_CORE_KEYS as readonly string[]).includes(key)) {
      (core as Record<string, unknown>)[key] = patch[key];
      routedKeys.push(key as RoutedCoreKey);
      continue;
    }
    if ((UNROUTED_CORE_KEYS as readonly string[]).includes(key)) {
      unroutedCoreKeys.push(key);
    }
    (rest as Record<string, unknown>)[key] = patch[key];
  }

  // `guidelines` is a mixed bag — strategy and About sections are Core, while
  // colorPalette / iconography / socialMedia / applications are not. Split it
  // in half rather than routing or ignoring the whole key, which is what lets
  // Setup (whose patches carry strategy under guidelines) hand its entire patch
  // to one call.
  const guidelines = rest.guidelines as Record<string, unknown> | undefined;
  if (guidelines && (guidelines.strategy || guidelines.aboutSections)) {
    const { strategy, aboutSections, ...otherGuidelines } = guidelines;
    core.guidelines = {
      ...(strategy ? { strategy } : {}),
      ...(aboutSections ? { aboutSections } : {}),
    } as Brand['guidelines'];
    routedKeys.push('guidelines' as RoutedCoreKey);

    if (Object.keys(otherGuidelines).length) {
      rest.guidelines = otherGuidelines as Brand['guidelines'];
    } else {
      delete rest.guidelines;
    }
  }

  return { core, rest, routedKeys, unroutedCoreKeys };
}

function colorChangesFrom(patch: Partial<Brand>): BrandColorChanges | null {
  const changes: BrandColorChanges = {};
  const cs = patch.colorSystem;

  // An EMPTY string is a value the user typed, not an absent field. Treating
  // `''` as absent made a cleared colour silently disappear: splitCorePatch
  // still routed the key (it is not `undefined`), colorChangesFrom returned
  // null, applyCorePatch wrote nothing, and the store re-read the unchanged
  // brand — so the edit vanished with no error. `hex: ''` reaches
  // changeBrandColors, which validates it at the boundary and rejects it
  // loudly instead.
  const token = (v: string | undefined) => (v === undefined ? undefined : { hex: v });

  // The full v3 token wins over the scalar: it carries name/rgb/cmyk/pantone
  // that a bare hex would drop.
  const primary = cs?.primary ?? token(patch.primaryColor);
  const secondary = cs?.secondary ?? token(patch.secondaryColor);
  const accent = cs?.accent ?? token(patch.accentColor);
  const neutrals: ColorToken[] | undefined =
    cs?.neutrals ?? patch.neutrals?.map((hex) => ({ hex }));

  if (primary) changes.primary = primary;
  if (secondary) changes.secondary = secondary;
  if (accent) changes.accent = accent;
  if (neutrals) changes.neutrals = neutrals;

  return Object.keys(changes).length ? changes : null;
}

function typographyChangesFrom(patch: Partial<Brand>) {
  const typo = patch.typography as TypographySystem | undefined;
  const primaryFamily = typo?.primary?.family ?? patch.fonts?.primary;
  const secondaryFamily = typo?.secondary?.family ?? patch.fonts?.secondary;

  const changes: Parameters<typeof changeBrandTypography>[2] = {};
  if (primaryFamily) {
    changes.primary = {
      family: primaryFamily,
      ...(typo?.primary?.weights ? { weights: typo.primary.weights } : {}),
      ...(typo?.primary?.files ? { files: typo.primary.files } : {}),
    };
  }
  if (secondaryFamily) {
    changes.secondary = {
      family: secondaryFamily,
      ...(typo?.secondary?.weights ? { weights: typo.secondary.weights } : {}),
      ...(typo?.secondary?.files ? { files: typo.secondary.files } : {}),
    };
  }
  // The SCALE travels too. `typography.scale` is a declared Core field and
  // `TypographySystem` carries it, but this reader only ever unpacked the two
  // families — so a saved base size reached the router and was filtered out of
  // its own patch. The confirmation still appeared and the value was gone on
  // the next read (QA Q5).
  if (typo?.scale) changes.scale = typo.scale;
  return Object.keys(changes).length ? changes : null;
}

/**
 * Applies the Core half of a patch through the canonical ops, in a fixed order
 * so a multi-subsystem save is deterministic. Returns the final canonical brand,
 * or null when there was nothing Core to write.
 */
export async function applyCorePatch(
  repo: BrandRepository,
  brandId: string,
  core: Partial<Brand>,
  opts?: CoreWriteOptions,
): Promise<CanonicalBrand | null> {
  let latest: CanonicalBrand | null = null;

  const colors = colorChangesFrom(core);
  if (colors) latest = await changeBrandColors(repo, brandId, colors, opts);

  const typography = typographyChangesFrom(core);
  if (typography) latest = await changeBrandTypography(repo, brandId, typography, opts);

  if (typeof core.tone === 'string') {
    latest = await changeBrandVoiceTone(repo, brandId, core.tone, opts);
  }

  // Strategy arrives two ways: the legacy `strategy` scalar IS the mission
  // string (see toLegacyBrandPatch), while Setup sends the richer object under
  // `guidelines.strategy`. Merge both into one op so a save that carries both
  // does not write twice.
  const gStrategy = core.guidelines?.strategy;
  const about = core.guidelines?.aboutSections;
  const strategyChange: Parameters<typeof changeBrandStrategy>[2] = {};

  if (typeof core.strategy === 'string') strategyChange.mission = core.strategy;
  if (gStrategy?.summary !== undefined) strategyChange.summary = gStrategy.summary;
  if (gStrategy?.mission !== undefined) strategyChange.mission = gStrategy.mission;
  if (gStrategy?.vision !== undefined) strategyChange.vision = gStrategy.vision;
  if (gStrategy?.positioning !== undefined) strategyChange.positioning = gStrategy.positioning;
  if (gStrategy?.values !== undefined) strategyChange.values = gStrategy.values;
  if (gStrategy?.personality !== undefined) strategyChange.personality = gStrategy.personality;
  if (gStrategy?.targetAudience !== undefined) {
    strategyChange.targetAudience = gStrategy.targetAudience;
  }
  if (about) strategyChange.aboutSections = about;

  if (Object.keys(strategyChange).length) {
    latest = await changeBrandStrategy(repo, brandId, strategyChange, opts);
  }

  // Style words. A CLOSED union in the schema, so anything the caller could not
  // resolve to a member must already have been dropped — writing a free word
  // here fails validation and costs the whole save.
  const descriptors = core.visualStyle?.descriptors;
  if (descriptors) {
    latest = await changeBrandVisualStyle(
      repo,
      brandId,
      { descriptors: descriptors as StyleDescriptor[] },
      opts,
    );
  }

  return latest;
}
