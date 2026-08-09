/**
 * Brand schema migration — v2 (legacy scattered fields) → v3 (unified
 * asset-ID references). Idempotent: runs on every brand load and is a
 * no-op when `brand.schemaVersion >= 3`.
 *
 * The migration:
 *  1. Collects every URL from the three legacy logo locations
 *     (`brand.logo`, `brand.logoAssets.*`, `brand.guidelines.logoSystem.*.url`)
 *     plus existing `brand.assets[]` entries.
 *  2. De-duplicates by URL (same URL → same BrandAsset entry).
 *  3. Emits a `brandAssets[]` and populates `logoSystem` with refs.
 *  4. Collapses `primaryColor`/`secondaryColor` + `guidelines.colorPalette`
 *     into `colorSystem`.
 *  5. Collapses `fonts` + `guidelines.typography` into `typography`.
 *  6. Sets `schemaVersion = 3`.
 *
 * Legacy fields are LEFT IN PLACE — existing consumers keep working.
 * New code should read through the v3 fields or the `useBrandLogo` hook.
 */
import type { Brand, BrandLogoAssets, LogoSystem, Asset } from '@/shared/types/brand';
import { dedupeLogoSystem, dedupeLogoSystemRefs } from './dedupeLogoSystem';
import type {
  BrandAsset,
  LogoRef,
  LogoSystemRefs,
  ColorSystem,
  ColorToken,
  TypographySystem,
  FontToken,
  LogoRole,
  AssetFormat,
} from '@/shared/types/brandAssets';
import { BRAND_SCHEMA_VERSION } from '@/shared/types/brandAssets';
import { CANONICAL_BRAND_SCHEMA_VERSION, type BrandIdentity } from '@/domain/brand/identity';

/** Guess an asset format from its URL / data URL prefix. */
function detectFormat(url: string): AssetFormat {
  if (!url) return 'png';
  const lower = url.toLowerCase();
  if (lower.startsWith('data:image/svg')) return 'svg';
  if (lower.startsWith('data:image/png')) return 'png';
  if (lower.startsWith('data:image/webp')) return 'webp';
  if (lower.startsWith('data:image/jpeg') || lower.startsWith('data:image/jpg')) return 'jpg';
  if (lower.startsWith('data:application/pdf')) return 'pdf';
  if (lower.endsWith('.svg')) return 'svg';
  if (lower.endsWith('.webp')) return 'webp';
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'jpg';
  return 'png';
}

/** Stable asset id for a given URL — same URL always yields the same id. */
function urlHash(url: string): string {
  // Simple, fast FNV-1a 32-bit for dedupe / id generation. Not crypto.
  let h = 0x811c9dc5;
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Upsert an asset into the accumulator keyed by URL. Returns the asset id.
 * If the URL already exists, the existing id is returned.
 */
function upsertLogoAsset(
  acc: Map<string, BrandAsset>,
  url: string | undefined,
  role: LogoRole,
  name: string,
): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const existing = acc.get(url);
  if (existing) {
    // Already seen — prefer the first role assignment.
    return existing.id;
  }
  const id = `asset-${urlHash(url)}`;
  const format = detectFormat(url);
  const now = new Date().toISOString();
  const asset: BrandAsset = {
    id,
    kind: 'logo',
    role: `logo.${role}`,
    name,
    formats: {
      [format]: { url, size: 0 },
    },
    metadata: {
      createdAt: now,
      version: 1,
      contentHash: urlHash(url),
    },
  };
  acc.set(url, asset);
  return id;
}

function logoRef(assetId: string | undefined, extra?: Partial<LogoRef>): LogoRef | undefined {
  if (!assetId) return undefined;
  return { assetId, ...extra };
}

function hexToRgb(hex: string): string | undefined {
  if (!hex) return undefined;
  const m = hex.replace('#', '').match(/^([0-9a-f]{6})$/i);
  if (!m) return undefined;
  const n = parseInt(m[1], 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

/** Same-hex compare ignoring '#'/case — used to decide when the mirror's rich
 *  metadata may enrich a fresh scalar (Stage 2D color-slice stale-mirror fix). */
function sameHex(a?: string, b?: string): boolean {
  return !!a && !!b && a.replace('#', '').toLowerCase() === b.replace('#', '').toLowerCase();
}

function buildColorSystem(brand: Brand): ColorSystem | undefined {
  const gp = brand.guidelines?.colorPalette;
  // Stage 2D root fix: prefer the FRESH scalar over a possibly-stale guidelines
  // mirror (matches src/domain/brand fromLegacyBrand). The old code preferred
  // guidelines.colorPalette, so a Setup/ColorsTab edit that updated the scalar but
  // not the mirror reverted on reload (05/11). Metadata is salvaged from the mirror
  // only when its hex still agrees with the fresh scalar.
  const primary: ColorToken | undefined = brand.primaryColor
    ? {
        hex: brand.primaryColor,
        rgb: hexToRgb(brand.primaryColor),
        ...(sameHex(gp?.primary?.hex, brand.primaryColor)
          ? {
              name: gp!.primary.name,
              rgb: gp!.primary.rgb,
              cmyk: gp!.primary.cmyk,
              pantone: gp!.primary.pantone,
              usage: gp!.primary.usage,
            }
          : {}),
      }
    : gp?.primary
    ? { hex: gp.primary.hex, name: gp.primary.name, rgb: gp.primary.rgb, cmyk: gp.primary.cmyk, pantone: gp.primary.pantone, usage: gp.primary.usage }
    : undefined;

  if (!primary) return undefined;

  const secondary: ColorToken | undefined = brand.secondaryColor
    ? {
        hex: brand.secondaryColor,
        rgb: hexToRgb(brand.secondaryColor),
        ...(sameHex(gp?.secondary?.hex, brand.secondaryColor)
          ? {
              name: gp!.secondary!.name,
              rgb: gp!.secondary!.rgb,
              cmyk: gp!.secondary!.cmyk,
              pantone: gp!.secondary!.pantone,
              usage: gp!.secondary!.usage,
            }
          : {}),
      }
    : gp?.secondary
    ? { hex: gp.secondary.hex, name: gp.secondary.name, rgb: gp.secondary.rgb, cmyk: gp.secondary.cmyk, pantone: gp.secondary.pantone, usage: gp.secondary.usage }
    : undefined;

  const accent: ColorToken | undefined = gp?.accent
    ? {
        hex: gp.accent.hex,
        name: gp.accent.name,
        rgb: gp.accent.rgb,
        cmyk: gp.accent.cmyk,
        pantone: gp.accent.pantone,
        usage: gp.accent.usage,
      }
    : undefined;

  const neutrals: ColorToken[] | undefined = gp?.neutral?.map((n) => ({
    hex: n.hex,
    name: n.name,
    rgb: n.rgb,
    cmyk: n.cmyk,
    usage: n.usage,
  }));

  const semantic = gp?.semantic
    ? {
        success: { hex: gp.semantic.success.hex, name: gp.semantic.success.name },
        warning: { hex: gp.semantic.warning.hex, name: gp.semantic.warning.name },
        error: { hex: gp.semantic.error.hex, name: gp.semantic.error.name },
        info: { hex: gp.semantic.info.hex, name: gp.semantic.info.name },
      }
    : undefined;

  return { primary, secondary, accent, neutrals, semantic };
}

function buildTypographySystem(brand: Brand): TypographySystem | undefined {
  const gt = brand.guidelines?.typography;
  // Prefer the FRESH `fonts` scalar over a stale `guidelines.typography` mirror
  // (matches buildColorSystem); enrich weights/fallbacks/url from the mirror only
  // when the family agrees. Prevents a font edit reverting on an authed reload.
  const primary: FontToken | undefined = brand.fonts?.primary
    ? {
        family: brand.fonts.primary,
        ...(gt?.primary && gt.primary.family === brand.fonts.primary
          ? { weights: gt.primary.weights, fallbacks: gt.primary.fallbacks, url: gt.primary.url, usage: gt.primary.usage }
          : {}),
      }
    : gt?.primary
    ? { family: gt.primary.family, weights: gt.primary.weights, fallbacks: gt.primary.fallbacks, url: gt.primary.url, usage: gt.primary.usage }
    : undefined;

  if (!primary) return undefined;

  const secondary: FontToken | undefined = brand.fonts?.secondary
    ? {
        family: brand.fonts.secondary,
        ...(gt?.secondary && gt.secondary.family === brand.fonts.secondary
          ? { weights: gt.secondary.weights, fallbacks: gt.secondary.fallbacks, url: gt.secondary.url, usage: gt.secondary.usage }
          : {}),
      }
    : gt?.secondary
    ? { family: gt.secondary.family, weights: gt.secondary.weights, fallbacks: gt.secondary.fallbacks, url: gt.secondary.url, usage: gt.secondary.usage }
    : undefined;

  return {
    primary,
    secondary,
    scale: gt?.scale,
  };
}

function buildLogoSystemAndAssets(brand: Brand): {
  logoSystem: LogoSystemRefs | undefined;
  brandAssets: BrandAsset[];
} {
  const acc = new Map<string, BrandAsset>();

  // Seed acc with any existing v2 Asset entries (so logo URLs matching
  // an asset reuse the same id instead of creating a duplicate).
  const existingByUrl = new Map<string, string>();
  for (const a of brand.assets ?? []) {
    if (a?.url) existingByUrl.set(a.url, a.id);
  }

  const legacyAssets: BrandLogoAssets | undefined = brand.logoAssets;
  const legacySystem: LogoSystem | undefined = brand.guidelines?.logoSystem;

  // Priority: guidelines.logoSystem (richest) → logoAssets → logo.
  const primaryUrl =
    legacySystem?.primary?.url ?? legacyAssets?.full ?? brand.logo;
  const secondaryUrl = legacySystem?.secondary?.url ?? legacyAssets?.alternate;
  const wordmarkUrl = legacySystem?.wordmark?.url ?? legacyAssets?.wordmark;
  const iconmarkUrl = legacySystem?.iconmark?.url ?? legacyAssets?.icon;
  const blackUrl = legacySystem?.blackVersion?.url ?? legacyAssets?.dark;
  const whiteUrl = legacySystem?.whiteVersion?.url ?? legacyAssets?.light;

  const primaryId = upsertLogoAsset(acc, primaryUrl, 'primary', `${brand.name} — Primary`);
  const secondaryId = upsertLogoAsset(acc, secondaryUrl, 'secondary', `${brand.name} — Secondary`);
  const wordmarkId = upsertLogoAsset(acc, wordmarkUrl, 'wordmark', `${brand.name} — Wordmark`);
  const iconmarkId = upsertLogoAsset(acc, iconmarkUrl, 'iconmark', `${brand.name} — Icon`);
  const blackId = upsertLogoAsset(acc, blackUrl, 'mono.black', `${brand.name} — Black`);
  const whiteId = upsertLogoAsset(acc, whiteUrl, 'mono.white', `${brand.name} — White`);

  const hasAny =
    primaryId || secondaryId || wordmarkId || iconmarkId || blackId || whiteId;

  // Drop a non-primary role's ref when its asset id matches a higher-
  // priority role's id — `upsertLogoAsset` returns the same id when
  // two roles point at the same URL, so this is the v3 equivalent of
  // `dedupeLogoSystem`'s URL check on the legacy shape. Without this
  // step a brand whose primary/secondary/wordmark all came from the
  // same upload still surfaces as three lookalike refs in
  // `brand.logoSystem`, which is what the user's "fix the data, not
  // just the frontend filter" feedback called out.
  const seenIds = new Set<string>();
  const dedupId = (
    id: string | undefined,
  ): string | undefined => {
    if (!id) return undefined;
    if (seenIds.has(id)) return undefined;
    seenIds.add(id);
    return id;
  };
  const primaryDeduped = dedupId(primaryId);
  const secondaryDeduped = dedupId(secondaryId);
  const wordmarkDeduped = dedupId(wordmarkId);
  const iconmarkDeduped = dedupId(iconmarkId);
  const blackDeduped = dedupId(blackId);
  const whiteDeduped = dedupId(whiteId);

  const logoSystem: LogoSystemRefs | undefined = hasAny
    ? {
        primary: logoRef(primaryDeduped, {
          description: legacySystem?.primary?.description,
          usage: legacySystem?.primary?.usage,
        }),
        secondary: logoRef(secondaryDeduped, {
          description: legacySystem?.secondary?.description,
          usage: legacySystem?.secondary?.usage,
        }),
        wordmark: logoRef(wordmarkDeduped, {
          description: legacySystem?.wordmark?.description,
          usage: legacySystem?.wordmark?.usage,
        }),
        iconmark: logoRef(iconmarkDeduped, {
          description: legacySystem?.iconmark?.description,
          usage: legacySystem?.iconmark?.usage,
        }),
        mono: {
          black: logoRef(blackDeduped, {
            description: legacySystem?.blackVersion?.description,
            usage: legacySystem?.blackVersion?.usage,
          }),
          white: logoRef(whiteDeduped, {
            description: legacySystem?.whiteVersion?.description,
            usage: legacySystem?.whiteVersion?.usage,
          }),
        },
        clearSpace: legacySystem?.clearSpace,
        minSize: legacySystem?.minSize,
        usage: legacySystem?.usage,
      }
    : undefined;

  // Carry over non-logo v2 assets (images, docs, icons) as BrandAsset entries.
  const extraAssets: BrandAsset[] = (brand.assets ?? [])
    .filter((a): a is Asset => !!a && !!a.url && a.type !== 'logo')
    .map((a) => {
      const format = detectFormat(a.url);
      return {
        id: `asset-${urlHash(a.url)}`,
        kind: (a.type === 'font'
          ? 'font'
          : a.type === 'document'
          ? 'document'
          : a.type === 'icon'
          ? 'icon'
          : 'image') as BrandAsset['kind'],
        name: a.name,
        role: a.category,
        formats: { [format]: { url: a.url, size: a.size ?? 0 } },
        tags: a.tags,
        metadata: {
          createdAt:
            a.createdAt instanceof Date ? a.createdAt.toISOString() : new Date().toISOString(),
          version: 1,
          width: a.metadata?.dimensions?.width,
          height: a.metadata?.dimensions?.height,
          originalName: a.metadata?.originalName,
          contentHash: urlHash(a.url),
        },
      };
    });

  // Dedupe extras against logo assets by id.
  const logoIds = new Set([...acc.values()].map((x) => x.id));
  const extras = extraAssets.filter((x) => !logoIds.has(x.id));

  return {
    logoSystem,
    brandAssets: [...acc.values(), ...extras],
  };
}

/**
 * Migrate a Brand to the current schema version. Idempotent — safe to
 * run on already-migrated brands. Does NOT mutate the input.
 */
/**
 * Brand System authority flip (finalization B4). Once a brand carries a canonical
 * identity blob (`brand.identity` at the current schema version), that blob is the
 * AUTHORITY for every MIGRATED subsystem — colors, typography, voice tone, and
 * strategy. On read we hydrate the brand's legacy/v3 fields FROM the blob so every
 * consumer (canonical-first readers AND direct `brand.primaryColor`/`colorSystem`/
 * `guidelines.strategy` readers) sees the canonical value, and a stale legacy
 * scalar can never override it.
 *
 * This is deliberately one-directional: legacy → canonical happens only to
 * BOOTSTRAP a brand that has never been migrated (no blob). After a blob exists,
 * canonical → legacy is the only projection direction.
 *
 * Logos are intentionally NOT hydrated: the logo subsystem is not yet canonical
 * (durable Asset records need their own persistence), so logos keep reading from
 * their always-current legacy home.
 */
function hydrateFromCanonicalIdentity(brand: Brand): Brand {
  const id: BrandIdentity | undefined = brand.identity;
  if (!id || (brand.identitySchemaVersion ?? 0) < CANONICAL_BRAND_SCHEMA_VERSION) {
    return brand; // never-migrated brand → bootstrap from legacy downstream
  }
  const c = id.colors ?? ({} as BrandIdentity['colors']);
  const t = id.typography ?? ({} as BrandIdentity['typography']);
  const v = id.voice ?? ({} as BrandIdentity['voice']);
  const s = id.strategy ?? ({} as BrandIdentity['strategy']);

  return {
    ...brand,
    // ── Colors (canonical) ──
    colorSystem: c.primary ? c : brand.colorSystem,
    primaryColor: c.primary?.hex ?? brand.primaryColor,
    secondaryColor: c.secondary?.hex ?? brand.secondaryColor,
    accentColor: c.accent?.hex ?? brand.accentColor,
    neutrals: c.neutrals?.length ? c.neutrals.map((n) => n.hex) : brand.neutrals,
    // ── Typography (canonical) ──
    typography: t.primary ? t : brand.typography,
    fonts: {
      primary: t.primary?.family ?? brand.fonts?.primary ?? 'Inter',
      secondary: t.secondary?.family ?? brand.fonts?.secondary,
    },
    // ── Voice tone (canonical) ──
    tone: v.tone ?? brand.tone,
    // ── Strategy (canonical) → hydrate the guidelines.strategy read-home + scalar ──
    strategy: s.mission ?? brand.strategy,
    guidelines: {
      ...brand.guidelines,
      strategy: {
        mission: s.mission ?? brand.guidelines?.strategy?.mission ?? '',
        vision: s.vision ?? brand.guidelines?.strategy?.vision ?? '',
        values: s.values?.length ? s.values : brand.guidelines?.strategy?.values ?? [],
        positioning: s.positioning ?? brand.guidelines?.strategy?.positioning ?? '',
        personality: s.personality?.length
          ? s.personality
          : brand.guidelines?.strategy?.personality ?? [],
        targetAudience:
          s.targetAudience ?? brand.guidelines?.strategy?.targetAudience ?? brand.audience ?? '',
      },
      ...(s.aboutSections?.length
        ? { aboutSections: s.aboutSections }
        : {}),
    },
    // logos NOT hydrated — the logo subsystem is not yet canonical.
  };
}

export function migrateBrandToCurrent(brandInput: Brand): Brand {
  if (!brandInput) return brandInput;
  // Flip: canonical identity wins over legacy for migrated subsystems (B4).
  const brand = hydrateFromCanonicalIdentity(brandInput);

  // Always normalize the legacy `guidelines.logoSystem` AND the v3
  // `brand.logoSystem` refs so seed brands and stored data with
  // duplicate URLs/assetIds across roles get cleaned in place. This
  // runs even on already-migrated brands so previously-stored data
  // improves on next read. The dedupe is a pure transform — no
  // migration version bump needed.
  const dedupedGuidelinesLogoSystem = brand.guidelines?.logoSystem
    ? dedupeLogoSystem(brand.guidelines.logoSystem)
    : undefined;
  const guidelinesNormalized = dedupedGuidelinesLogoSystem
    ? { ...brand.guidelines, logoSystem: dedupedGuidelinesLogoSystem }
    : brand.guidelines;
  const dedupedV3 = brand.logoSystem
    ? dedupeLogoSystemRefs(brand.logoSystem)
    : undefined;

  const guidelinesChanged = guidelinesNormalized !== brand.guidelines;
  const v3Changed = dedupedV3 !== undefined && dedupedV3 !== brand.logoSystem;
  const cleanBrand: Brand =
    guidelinesChanged || v3Changed
      ? {
          ...brand,
          ...(guidelinesChanged ? { guidelines: guidelinesNormalized } : {}),
          ...(v3Changed ? { logoSystem: dedupedV3 } : {}),
        }
      : brand;

  if ((cleanBrand.schemaVersion ?? 0) >= BRAND_SCHEMA_VERSION) {
    return cleanBrand;
  }

  const { logoSystem, brandAssets } = buildLogoSystemAndAssets(cleanBrand);
  const colorSystem = buildColorSystem(cleanBrand);
  const typography = buildTypographySystem(cleanBrand);

  return {
    ...cleanBrand,
    schemaVersion: BRAND_SCHEMA_VERSION,
    logoSystem: cleanBrand.logoSystem ?? logoSystem,
    colorSystem: cleanBrand.colorSystem ?? colorSystem,
    typography: cleanBrand.typography ?? typography,
    brandAssets: cleanBrand.brandAssets ?? brandAssets,
  };
}

/** Migrate a list of brands. Non-mutating. */
export function migrateBrands(list: Brand[]): Brand[] {
  return list.map(migrateBrandToCurrent);
}
