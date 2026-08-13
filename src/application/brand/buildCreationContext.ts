/**
 * Assembles what an AI generation is allowed to see about a brand.
 *
 * One place decides this, on purpose. If each creation surface built its own
 * context, they would drift, and "AI creation must use the brand" would quietly
 * become "AI creation uses whatever that screen happened to pass".
 *
 * Two behaviors matter more than the shape:
 *
 *  1. **Provisional values are INCLUDED by default.** A brand that has skipped
 *     every decision must still be able to create. Filtering to confirmed-only
 *     would turn an incomplete Core into a block, which is exactly what the
 *     product promises never to do. Callers that genuinely need settled values
 *     only (a published brand guideline, say) opt in via `minAuthority`.
 *
 *  2. **Every value carries its authority and provenance.** The model is told
 *     what is assumed versus settled, and `provisionalPaths` gives the caller
 *     the list it can surface as "assumed" — without the UI having to re-derive
 *     it.
 *
 * Pure: no network, no writes, no service lookups. Input in, data out.
 */
import {
  CORE_FIELD_PATHS,
  readCoreValue,
  type CoreFieldPath,
} from '@/domain/brand/coreFieldPaths';
import {
  coreValueMeta,
  isAtLeast,
  type Authority,
  type Provenance,
} from '@/domain/brand/coreMeta';
import type { CanonicalBrand, BusinessInfo } from '@/domain/brand/identity';
import type { ContextSummary } from '@/core/services/IBrandContextService';

export interface CreationContextReference {
  assetId: string;
  url: string;
  kind: string;
}

export interface CreationCoreEntry {
  path: CoreFieldPath;
  value: unknown;
  authority: Authority;
  provenance: Provenance;
}

export interface CreationContext {
  brandId: string;
  brandName: string;
  core: CreationCoreEntry[];
  businessInfo?: BusinessInfo;
  references: CreationContextReference[];
  preferences: Record<string, unknown>;
  /** Core paths in play that no human has confirmed — surface as "assumed". */
  provisionalPaths: CoreFieldPath[];
}

export interface BuildCreationContextInput {
  brand: CanonicalBrand;
  context?: ContextSummary;
  /** Library items flagged "use as reference". */
  references?: CreationContextReference[];
  /** Defaults to `suggested` — i.e. include everything the brand has. */
  minAuthority?: Authority;
}

export function buildCreationContext(input: BuildCreationContextInput): CreationContext {
  const { brand, context, references = [], minAuthority = 'suggested' } = input;

  const core: CreationCoreEntry[] = [];
  const provisionalPaths: CoreFieldPath[] = [];

  for (const path of CORE_FIELD_PATHS) {
    const value = readCoreValue(brand.identity, path);
    const present = Array.isArray(value)
      ? value.length > 0
      : value !== undefined && value !== null;
    if (!present) continue;

    const meta = coreValueMeta(brand.identityMeta, path);
    if (!isAtLeast(meta.authority, minAuthority)) continue;

    core.push({
      path,
      value,
      authority: meta.authority,
      provenance: meta.provenance,
    });
    if (!isAtLeast(meta.authority, 'confirmed')) provisionalPaths.push(path);
  }

  return {
    brandId: brand.id,
    brandName: brand.name,
    core,
    ...(brand.businessInfo ? { businessInfo: brand.businessInfo } : {}),
    references,
    preferences: context?.preferences ?? {},
    provisionalPaths,
  };
}
