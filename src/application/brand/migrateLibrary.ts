/**
 * Legacy asset ingest — the three stores become one Brand Library.
 *
 * Brand material lives in three places today: `brand.assets[]` (the original
 * inline array, written by useUpload), `brand.brandAssets[]` (the v3 inline
 * array, written by assetOperations and REFERENCED BY `logoSystem`), and
 * `public.assets` / localStorage (the DAM). This moves the first two into the
 * third.
 *
 * The rules that make it safe to run more than once, and safe to run at all:
 *
 *  1. **Idempotent.** Every ingested item records `legacyRefId`. A re-run finds
 *     the existing item by that key and skips it. Running twice produces the
 *     same Library as running once.
 *
 *  2. **Dry-run first.** `dryRun: true` performs ZERO writes and reports what
 *     WOULD be created. It cannot predict logo rewrites or unresolved slots —
 *     those depend on the ids the store actually mints — so it flags them as
 *     unpredicted (`logoFindingsPredicted: false`) instead of reporting empty.
 *
 *  3. **Original ids preserved where the store allows it.** A rewrite of a
 *     `logoSystem` ref is the one step in this whole phase that can strand a
 *     logo, so the ingest avoids needing one: it asks for the legacy id, and
 *     when the store can honour it (localStorage; a legacy id that is already
 *     a uuid) the existing refs keep resolving untouched. Only when the id
 *     cannot be preserved is a rewrite planned.
 *
 *  4. **Nothing legacy is deleted.** The ingest only READS the arrays. They
 *     stay exactly as they were, so a rollback is "stop using the Library",
 *     not a restore. Retiring them is a separate, later, gated step.
 *
 *  5. **Rewrites are verified.** After a real run, every `logoSystem` slot is
 *     re-resolved against the Library; any slot that would not resolve is
 *     reported as `unresolvedLogoSlots` rather than left to be discovered by a
 *     user seeing a missing logo.
 */
import type { Asset, Brand } from '@/shared/types/brand';
import type { AssetFormat, BrandAsset, LogoRef, LogoSystemRefs } from '@/shared/types/brandAssets';
import type { IAssetsService, CreateAssetInput } from '@/core/types/services';

export interface LibraryIngestPlanItem {
  legacyId: string;
  name: string;
  source: 'assets[]' | 'brandAssets[]';
  /** False when an item with this legacyRefId is already in the Library. */
  willCreate: boolean;
  /** The id the Library item ended up with (or would). */
  resolvedId?: string;
  idPreserved?: boolean;
  skippedReason?: 'already-ingested' | 'no-url';
}

export interface LogoRewritePlanItem {
  /** Dotted slot path, e.g. `primary`, `mono.black`. */
  slot: string;
  fromAssetId: string;
  toAssetId: string;
}

export interface LibraryIngestReport {
  brandId: string;
  dryRun: boolean;
  items: LibraryIngestPlanItem[];
  created: number;
  skipped: number;
  logoRewrites: LogoRewritePlanItem[];
  /** Patch to persist so `logoSystem` points at Library ids. Empty when no rewrite was needed. */
  brandPatch: Partial<Brand>;
  /** Slots that do NOT resolve after ingest — investigate before retiring legacy data. */
  unresolvedLogoSlots: string[];
  /**
   * FALSE in a dry run: `logoRewrites` and `unresolvedLogoSlots` cannot be
   * predicted without asking the store for real ids, so they are reported as
   * unknown rather than as empty. An operator reading "no logo rewrites
   * needed" from a dry run would otherwise be reassured about the one step
   * documented as able to strand a logo.
   */
  logoFindingsPredicted: boolean;
}

/** Every addressable logo slot, as [path, getter, setter]. */
function logoSlots(
  logos: LogoSystemRefs | undefined,
): Array<{ path: string; ref: LogoRef }> {
  if (!logos) return [];
  const out: Array<{ path: string; ref: LogoRef }> = [];
  const push = (path: string, ref?: LogoRef) => {
    if (ref?.assetId) out.push({ path, ref });
  };
  push('primary', logos.primary);
  push('secondary', logos.secondary);
  push('wordmark', logos.wordmark);
  push('iconmark', logos.iconmark);
  push('mono.black', logos.mono?.black);
  push('mono.white', logos.mono?.white);
  push('orientations.horizontal', logos.orientations?.horizontal);
  push('orientations.stacked', logos.orientations?.stacked);
  return out;
}

function setSlot(logos: LogoSystemRefs, path: string, assetId: string): void {
  const ref = (() => {
    switch (path) {
      case 'primary': return logos.primary;
      case 'secondary': return logos.secondary;
      case 'wordmark': return logos.wordmark;
      case 'iconmark': return logos.iconmark;
      case 'mono.black': return logos.mono?.black;
      case 'mono.white': return logos.mono?.white;
      case 'orientations.horizontal': return logos.orientations?.horizontal;
      case 'orientations.stacked': return logos.orientations?.stacked;
      default: return undefined;
    }
  })();
  if (ref) ref.assetId = assetId;
}

const FORMAT_PREFERENCE: AssetFormat[] = ['svg', 'png', 'webp', 'jpg', 'pdf'];

/** A BrandAsset holds files by format; the Library item needs one url. */
function preferredFile(a: BrandAsset) {
  for (const f of FORMAT_PREFERENCE) {
    const file = a.formats?.[f];
    if (file?.url) return { file, format: f };
  }
  const entry = Object.entries(a.formats ?? {}).find(([, f]) => f?.url);
  return entry ? { file: entry[1]!, format: entry[0] as AssetFormat } : null;
}

function brandAssetToInput(brandId: string, a: BrandAsset): CreateAssetInput | null {
  const picked = preferredFile(a);
  if (!picked) return null;
  return {
    brandId,
    id: a.id,
    legacyRefId: a.id,
    name: a.name || a.id,
    type: a.kind === 'logo' ? 'logo' : a.kind === 'font' ? 'font' : a.kind === 'icon' ? 'icon' : a.kind === 'document' ? 'document' : 'image',
    category: a.kind === 'logo' ? 'logo' : a.kind === 'icon' ? 'icon' : a.kind === 'font' ? 'typography' : 'photo',
    source: 'upload',
    url: picked.file.url,
    storagePath: picked.file.storagePath,
    size: picked.file.size ?? 0,
    tags: a.tags ?? [],
    metadata: {
      ...(a.metadata?.width && a.metadata?.height
        ? { dimensions: { width: a.metadata.width, height: a.metadata.height } }
        : {}),
      format: picked.format,
      originalName: a.metadata?.originalName,
    },
    origin: 'uploaded',
  };
}

function legacyAssetToInput(brandId: string, a: Asset): CreateAssetInput | null {
  if (!a.url) return null;
  return {
    brandId,
    id: a.id,
    legacyRefId: a.id,
    name: a.name || a.id,
    type: a.type,
    category: a.category,
    source: a.source ?? 'upload',
    url: a.url,
    size: a.size ?? 0,
    tags: a.tags ?? [],
    metadata: a.metadata ?? {},
    origin: 'uploaded',
  };
}

/**
 * Ingests a brand's legacy asset arrays into the Library.
 *
 * Returns a report describing exactly what happened (or would happen, under
 * `dryRun`). The caller persists `brandPatch` — the ingest never writes the
 * brand record itself, so the one authority for brand writes stays the one
 * authority.
 */
export async function ingestBrandLibrary(
  brand: Brand,
  assets: IAssetsService,
  opts: { dryRun?: boolean } = {},
): Promise<LibraryIngestReport> {
  const dryRun = opts.dryRun ?? false;
  const brandId = brand.id;

  // Existing Library state, indexed by the legacy id it came from AND by its
  // own id — an item whose legacy id was preserved has no legacyRefId to match
  // on if it was created by an earlier run of a different shape.
  //
  // TOMBSTONES AND ARCHIVED ITEMS ARE INCLUDED. `listForBrand` hides both, so
  // an item that was ingested and then deleted would look absent and be created
  // again — a re-run silently undoing an explicit deletion, which breaks the
  // first rule this ingest claims for itself. Idempotency has to mean idempotent
  // against the whole Library, not against its default view.
  const existing = await assets.listLibrary(brandId, {
    includeArchived: true,
    includeDeleted: true,
  });
  const byLegacyRef = new Map<string, Asset>();
  for (const a of existing) {
    if (a.legacyRefId) byLegacyRef.set(a.legacyRefId, a);
    byLegacyRef.set(a.id, a);
  }

  const inputs: Array<{ input: CreateAssetInput; source: LibraryIngestPlanItem['source'] }> = [];
  for (const a of brand.brandAssets ?? []) {
    const input = brandAssetToInput(brandId, a);
    inputs.push({
      input: input ?? ({ brandId, id: a.id, legacyRefId: a.id, name: a.name } as CreateAssetInput),
      source: 'brandAssets[]',
    });
  }
  for (const a of brand.assets ?? []) {
    const input = legacyAssetToInput(brandId, a);
    inputs.push({
      input: input ?? ({ brandId, id: a.id, legacyRefId: a.id, name: a.name } as CreateAssetInput),
      source: 'assets[]',
    });
  }

  const items: LibraryIngestPlanItem[] = [];
  /** legacy id → the Library id it now lives under. */
  const idMap = new Map<string, string>();

  for (const { input, source } of inputs) {
    const legacyId = input.legacyRefId as string;

    const already = byLegacyRef.get(legacyId);
    if (already) {
      idMap.set(legacyId, already.id);
      items.push({
        legacyId,
        name: input.name,
        source,
        willCreate: false,
        resolvedId: already.id,
        idPreserved: already.id === legacyId,
        skippedReason: 'already-ingested',
      });
      continue;
    }

    if (!input.url) {
      items.push({ legacyId, name: input.name, source, willCreate: false, skippedReason: 'no-url' });
      continue;
    }

    if (dryRun) {
      // Report the intent without writing. The resolved id is unknown until the
      // store answers, so only the preserved case can be predicted.
      items.push({ legacyId, name: input.name, source, willCreate: true });
      idMap.set(legacyId, legacyId);
      continue;
    }

    const created = await assets.create(input);
    idMap.set(legacyId, created.id);
    // Guard against two legacy arrays holding the same id.
    byLegacyRef.set(legacyId, created);
    items.push({
      legacyId,
      name: input.name,
      source,
      willCreate: true,
      resolvedId: created.id,
      idPreserved: created.id === legacyId,
    });
  }

  // ── logoSystem refs ────────────────────────────────────────────────
  const slots = logoSlots(brand.logoSystem);
  const logoRewrites: LogoRewritePlanItem[] = [];
  const nextLogos: LogoSystemRefs = JSON.parse(JSON.stringify(brand.logoSystem ?? {}));

  for (const { path, ref } of slots) {
    const mapped = idMap.get(ref.assetId);
    if (mapped && mapped !== ref.assetId) {
      logoRewrites.push({ slot: path, fromAssetId: ref.assetId, toAssetId: mapped });
      if (!dryRun) setSlot(nextLogos, path, mapped);
    }
  }

  // ── verification ───────────────────────────────────────────────────
  // Every slot must resolve to something the Library can serve. A slot that
  // does not is reported, never silently accepted.
  const unresolvedLogoSlots: string[] = [];
  if (!dryRun) {
    for (const { path, ref } of logoSlots(nextLogos)) {
      const hit = await assets.getById(ref.assetId);
      const resolvable = hit != null && hit.deletedAt == null && Boolean(hit.url);
      if (!resolvable) unresolvedLogoSlots.push(path);
    }
  }

  return {
    brandId,
    dryRun,
    items,
    created: items.filter((i) => i.willCreate).length,
    skipped: items.filter((i) => !i.willCreate).length,
    logoRewrites,
    brandPatch: logoRewrites.length && !dryRun ? { logoSystem: nextLogos } : {},
    unresolvedLogoSlots,
    logoFindingsPredicted: !dryRun,
  };
}

/** One-line summary for a console/dev report. */
export function formatIngestReport(r: LibraryIngestReport): string {
  const mode = r.dryRun ? 'DRY RUN' : 'applied';
  const rewrites = !r.logoFindingsPredicted
    ? ', logo rewrites NOT PREDICTED in dry run'
    : r.logoRewrites.length
      ? `, ${r.logoRewrites.length} logo ref rewrite(s)`
      : ', no logo rewrites needed';
  const unresolved = r.unresolvedLogoSlots.length
    ? ` — UNRESOLVED SLOTS: ${r.unresolvedLogoSlots.join(', ')}`
    : '';
  return `[library-ingest] ${mode} for ${r.brandId}: ${r.created} created, ${r.skipped} skipped${rewrites}${unresolved}`;
}
