import type { Brand, BrandLogoAssets, BrandStrategy } from '@/shared/types/brand';
import { fromLegacyBrand } from '@/domain/brand';
import type { TypographySystem, LogoRole } from '@/shared/types/brandAssets';
import { stageLogoAssignment } from '@/shared/assets/assetOperations';
import { logoRoleLabel } from '@/shared/brand/logoRoles';
import { TILE_LABEL } from './logoBoard';
import type { BrandLogo, MockBrand } from './mockBrand';
import { isRampStep } from './neutralRamp';

/**
 * Inverse of `brandToMockBrand`: takes the current Setup mock shape
 * and the canonical Brand it came from, and produces a `Partial<Brand>`
 * patch suitable for `brandStore.update(id, patch)`.
 *
 * IMPORTANT — propagation: every consumer that reads brand state
 * (case-study deck, brand kit, presentation slides, AI tools, etc.)
 * prefers the canonical structures (`brand.colorSystem.primary.hex`,
 * `brand.typography.primary.family`) over the legacy simple fields
 * (`brand.primaryColor`, `brand.fonts.primary`). Patching only the
 * legacy fields means the canonical ones stay stale and the
 * consumers keep showing old data even after the user has saved a
 * change in /setup. So when a color or font changes, we patch BOTH:
 *   - the legacy simple field (for backward compat)
 *   - the canonical colorSystem/typography token (so consumers update)
 *
 * Logos persist by extracting the source URL from each logo's SVG
 * wrapper (or by serializing the whole SVG to a data: URL when the
 * user uploaded a self-contained vector) and writing it to
 * `brand.logo` + `brand.logoAssets`. Photos and icons still flow
 * through local component state — wiring them up follows the same
 * pattern (see `buildLogoPatch`) once we settle on slot semantics
 * for both.
 */
export function mockBrandToPatch(mock: MockBrand, existing: Brand): Partial<Brand> {
  const patch: Partial<Brand> = {};

  if (mock.name !== existing.name) patch.name = mock.name;

  /* ─────────────────────────  logos  ───────────────────────── */

  const logoPatch = buildLogoPatch(mock.logos, existing);
  if (logoPatch) Object.assign(patch, logoPatch);

  /* ─────────────────────────  colors  ───────────────────────── */

  const primary = mock.colors.core[0]?.hex;
  const secondary = mock.colors.core[1]?.hex;
  const accent = mock.colors.accent[0]?.hex;
  /*
   * `neutrals` is the brand's OWN colours past primary and secondary — never
   * the ladder under "Neutral Colors".
   *
   * That ladder is generated: the same 32 pure greys for every brand, drawn by
   * the page and belonging to no one. Sending it back as `brand.neutrals` meant
   * the first save from Setup replaced whatever the brand actually owned with
   * it, so a three-colour palette became two and the third colour was gone from
   * the record — not merely hidden. Everything the user put in Core past the
   * first two IS theirs, and so is any grey they added that the ladder does not
   * already contain.
   */
  const neutrals = [
    ...mock.colors.core.slice(2).map((c) => c.hex),
    ...mock.colors.grey.map((c) => c.hex).filter((hex) => !isRampStep(hex)),
  ];

  const primaryChanged = primary && primary !== existing.primaryColor;
  const secondaryChanged = secondary !== existing.secondaryColor;
  const accentChanged = accent !== existing.accentColor;
  const neutralsChanged = !arraysEqual(neutrals, existing.neutrals ?? []);

  // A5 — color is now owned by the canonical `changeBrandColors` operation; Setup
  // reads these scalar color fields to build the canonical change and strips them
  // from the legacy patch. The legacy `colorSystem` builder (mergeColorSystem) is
  // removed — the canonical model + toLegacyBrandPatch now produce colorSystem.
  if (primaryChanged && primary) patch.primaryColor = primary;
  if (secondaryChanged) patch.secondaryColor = secondary;
  if (accentChanged) patch.accentColor = accent;
  if (neutralsChanged) patch.neutrals = neutrals;

  /* ─────────────────────────  fonts  ───────────────────────── */

  const primaryFont = mock.fonts[0]?.family;
  const secondaryFont = mock.fonts[1]?.family;
  const fontsChanged =
    primaryFont !== existing.fonts?.primary || secondaryFont !== existing.fonts?.secondary;

  if (fontsChanged && primaryFont) {
    patch.fonts = {
      primary: primaryFont,
      secondary: secondaryFont,
    };
    patch.typography = mergeTypography(existing.typography, primaryFont, secondaryFont);
  }

  // Persist uploaded font files onto the canonical typography slot
  // so they survive reloads. Scan ALL mock.fonts[] (not just 0/1) and
  // route files to the matching primary/secondary slot via lenient
  // family-name matching — rescues uploads parsed as "GT Super Display"
  // when the brand declares "GT Super". When fonts also changed above,
  // patch.typography is already set by mergeTypography; we use it as the
  // spread base so file changes augment family changes instead of
  // clobbering the metadata mergeTypography preserved.
  const primaryFiles = collectFilesFor(mock, primaryFont);
  const secondaryFiles = collectFilesFor(mock, secondaryFont);
  const existingPrimaryFiles = existing.typography?.primary?.files ?? [];
  const existingSecondaryFiles = existing.typography?.secondary?.files ?? [];
  if (
    !fontFilesEqual(primaryFiles, existingPrimaryFiles) ||
    !fontFilesEqual(secondaryFiles, existingSecondaryFiles)
  ) {
    const baseTypography = patch.typography ?? existing.typography;
    patch.typography = {
      ...baseTypography,
      primary: {
        ...baseTypography?.primary,
        family: primaryFont ?? baseTypography?.primary?.family ?? '',
        ...(primaryFiles.length > 0 ? { files: primaryFiles } : {}),
      },
      ...(secondaryFont
        ? {
            secondary: {
              ...baseTypography?.secondary,
              family: secondaryFont,
              ...(secondaryFiles.length > 0 ? { files: secondaryFiles } : {}),
            },
          }
        : {}),
    };
  }

  /* ─────────────────────────  websites / voice / strategy  ───────────────────────── */

  const firstSite = mock.websites[0]?.url;
  if (firstSite !== existing.publicUrl) {
    patch.publicUrl = firstSite;
  }

  /* ─────────────────────────  brand strategy  ───────────────────────── */
  //
  // The eleven answers. Seven are Core and travel under `guidelines.strategy`
  // + `tone` + `visualStyle`, which `splitCorePatch` routes to the canonical
  // ops; three are facts about the business and go to `businessInfo`.
  //
  // `mock.voice.essay` used to write `tone` as well. Nothing in Setup renders
  // or edits it — it is populated FROM `brand.tone` and written straight back —
  // so it was a second writer for a field that now has a real control.

  const canonical = fromLegacyBrand(existing);
  const held = {
    summary: canonical.identity?.strategy?.summary ?? '',
    audience: canonical.identity?.strategy?.targetAudience ?? '',
    positioning: canonical.identity?.strategy?.positioning ?? '',
    mission: canonical.identity?.strategy?.mission ?? '',
    personality: canonical.identity?.strategy?.personality ?? [],
    values: canonical.identity?.strategy?.values ?? [],
    tone: canonical.identity?.voice?.tone ?? '',
    style: (canonical.identity?.visualStyle?.descriptors ?? []) as string[],
  };

  const s = mock.strategy;
  // Partial on purpose: only the fields that actually changed are sent, so a
  // save that touches the mission does not restate the values as re-decided.
  const strategyChange: Partial<BrandStrategy> = {};
  if (s.summary.trim() !== held.summary) strategyChange.summary = s.summary.trim();
  if (s.audience.trim() !== held.audience) strategyChange.targetAudience = s.audience.trim();
  if (s.positioning.trim() !== held.positioning) strategyChange.positioning = s.positioning.trim();
  if (s.mission.trim() !== held.mission) strategyChange.mission = s.mission.trim();
  if (!arraysEqual(s.personality, held.personality)) strategyChange.personality = s.personality;
  if (!arraysEqual(s.values, held.values)) strategyChange.values = s.values;

  if (s.tone !== held.tone) patch.tone = s.tone;
  if (!arraysEqual(s.style, held.style)) patch.visualStyle = { descriptors: s.style };

  /* ─────────────────────────  free-form sections  ───────────────────────── */

  const nextAbout = mock.about
    .map((a) => ({ id: a.id, title: a.title, content: a.content.trim() }))
    .filter((a) => a.content);
  const prevAbout = canonical.identity?.strategy?.aboutSections ?? [];
  const aboutChanged =
    nextAbout.length !== prevAbout.length ||
    nextAbout.some(
      (a, i) => a.title !== prevAbout[i]?.title || a.content !== prevAbout[i]?.content,
    );

  if (Object.keys(strategyChange).length || aboutChanged) {
    patch.guidelines = {
      ...existing.guidelines,
      ...(Object.keys(strategyChange).length
        ? {
            strategy: {
              ...existing.guidelines?.strategy,
              ...strategyChange,
            } as BrandStrategy,
          }
        : {}),
      ...(aboutChanged ? { aboutSections: nextAbout } : {}),
    };
  }

  /* ─────────────────────────  business info  ───────────────────────── */
  //
  // MERGED against what the brand already holds, never assigned. `businessInfo`
  // is a single stored value, so a patch replaces it — assigning three fields
  // would delete the audience summary, the address and every link.

  const bi = canonical.businessInfo ?? {};
  const businessChange: Record<string, unknown> = {};
  if (s.industry !== (bi.industry ?? '')) businessChange.industry = s.industry;
  if (s.products.trim() !== (bi.description ?? '')) businessChange.description = s.products.trim();
  if (s.slogan.trim() !== (bi.tagline ?? '')) businessChange.tagline = s.slogan.trim();

  const nextLinks = mock.links
    .filter((l) => l.url.trim())
    .map((l) => ({ kind: l.kind, url: l.url.trim(), ...(l.label ? { label: l.label } : {}) }));
  // The website is a link too — it is edited in the Website section and stored
  // in `contact`, so it is folded back in here rather than being dropped by a
  // save that only knew about the social rows.
  const site = firstSite ?? bi.contact?.website;
  const withSite = site
    ? [{ kind: 'website' as const, url: site }, ...nextLinks.filter((l) => l.url !== site)]
    : nextLinks;
  const prevLinks = bi.links ?? [];
  if (!arraysEqual(withSite.map((l) => l.url), prevLinks.map((l) => l.url))) {
    businessChange.links = withSite;
  }
  if (site && site !== bi.contact?.website) {
    businessChange.contact = { ...(bi.contact ?? {}), website: site };
  }

  if (Object.keys(businessChange).length) {
    patch.businessInfo = { ...bi, ...businessChange } as Brand['businessInfo'];
  }

  return patch;
}

/* ─────────────────────────  helpers  ───────────────────────── */

function mergeTypography(
  existing: TypographySystem | undefined,
  primaryFamily: string,
  secondaryFamily: string | undefined,
): TypographySystem {
  return {
    ...(existing ?? { primary: { family: primaryFamily } }),
    primary: {
      ...(existing?.primary ?? {}),
      family: primaryFamily,
    },
    secondary: secondaryFamily
      ? {
          ...(existing?.secondary ?? {}),
          family: secondaryFamily,
        }
      : existing?.secondary,
  };
}

/** Pull every uploaded font file across mock.fonts[] that matches
 *  `family` under lenient comparison (case-insensitive, prefix-aware,
 *  ≥3 char overlap). Mirrors the matching SetupPage's handleAddFont
 *  uses when attaching uploads to existing entries — so an upload
 *  parsed as "GT Super Display" still attaches to a "GT Super" slot. */
function collectFilesFor(
  mock: MockBrand,
  family: string | undefined,
): Array<{ name: string; weight: string; format: 'ttf' | 'otf' | 'woff' | 'woff2' | 'eot'; dataUrl: string; size: number }> {
  if (!family) return [];
  const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
  const target = norm(family);
  const out: Array<{ name: string; weight: string; format: 'ttf' | 'otf' | 'woff' | 'woff2' | 'eot'; dataUrl: string; size: number }> = [];
  for (const f of mock.fonts) {
    const candidate = norm(f.family);
    const matches =
      candidate === target ||
      (candidate.length >= 3 && target.startsWith(candidate)) ||
      (target.length >= 3 && candidate.startsWith(target));
    if (matches && f.files && f.files.length > 0) {
      out.push(...f.files);
    }
  }
  return out;
}

function fontFilesEqual(
  a: Array<{ name: string; size: number }>,
  b: Array<{ name: string; size: number }>,
): boolean {
  if (a.length !== b.length) return false;
  const sig = (x: { name: string; size: number }) => `${x.name.toLowerCase()}::${x.size}`;
  const left = a.map(sig).sort().join('|');
  const right = b.map(sig).sort().join('|');
  return left === right;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/* ─────────────────────────  logos helpers  ───────────────────────── */

/**
 * Pull the original asset URL out of a Setup logo. Setup wraps every
 * uploaded image in a `<svg><image href="..."/></svg>` shell, and
 * `brandToMockBrand` does the same when projecting an existing brand
 * back into the Setup view. Round-tripping THROUGH that shell would
 * triple-base64 the asset on every save, so when a single `<image>`
 * is the only payload we extract its href verbatim.
 *
 * For self-contained SVGs (a `.svg` file the user uploaded with paths,
 * shapes, etc.) we serialize the whole document to a `data:image/svg+xml`
 * URL so it persists in the brand row.
 */
function extractLogoUrl(logo: BrandLogo): string {
  // First non-empty <image href> in the logo SVG. The wrapper Setup
  // produces always has exactly one such element.
  const m = logo.svg.match(/<image[^>]*?(?:xlink:)?href=["']([^"']+)["']/);
  if (m && m[1]) return m[1];

  // No <image> tag → user uploaded a real SVG document. Serialize it.
  try {
    const b64 = btoa(unescape(encodeURIComponent(logo.svg)));
    return `data:image/svg+xml;base64,${b64}`;
  } catch {
    // Fall through to a URI-encoded svg if base64 encoding fails on
    // exotic Unicode in the source (rare).
    return `data:image/svg+xml;utf8,${encodeURIComponent(logo.svg)}`;
  }
}

/** Which legacy dict slot each canonical role writes to. */
const ROLE_TO_SLOT: Partial<Record<LogoRole, keyof BrandLogoAssets>> = {
  primary: 'full',
  iconmark: 'icon',
  wordmark: 'wordmark',
  secondary: 'alternate',
  'mono.white': 'light',
  'mono.black': 'dark',
};

/** Map Setup logos to the BrandLogoAssets dict by inspecting their
 *  labels and variants. The first logo always anchors `full` and
 *  `brand.logo`. Subsequent logos fill more specific slots when their
 *  label hints at one (Wordmark / Mark / Icon / Inverse), falling back
 *  to ordinal fills (`alternate`, `icon`) so a no-label upload still
 *  lands somewhere.
 */
function logosToAssetsDict(logos: BrandLogo[]): BrandLogoAssets {
  const urls = logos.map(extractLogoUrl);
  const findUrl = (predicate: (l: BrandLogo, i: number) => boolean): string | undefined => {
    const idx = logos.findIndex(predicate);
    return idx >= 0 ? urls[idx] : undefined;
  };

  /*
   * A board whose tiles all know their roles states the dict outright.
   *
   * The heuristics below read labels and positions, which is all there used to
   * be to read. They are also why a swap left copies behind: after moving the
   * Icon tile to On dark, the ordinal rule matched it again as `alternate` and
   * the pre-swap `icon` survived the merge, so one drawing ended up in three
   * slots. When every tile carries a role there is nothing to guess.
   */
  if (logos.length && logos.every((l) => l.role)) {
    const out: BrandLogoAssets = {};
    logos.forEach((logo, i) => {
      const slot = ROLE_TO_SLOT[logo.role!];
      if (slot) out[slot] = urls[i];
    });
    // `full` anchors `brand.logo`, so a board with no primary still needs one.
    if (!out.full && urls[0]) out.full = urls[0];
    return out;
  }

  const out: BrandLogoAssets = {};
  if (urls[0]) out.full = urls[0];

  const wordmark = findUrl((l) => /wordmark/i.test(l.label));
  if (wordmark) out.wordmark = wordmark;

  const icon = findUrl((l) => /^(mark|icon|monogram)$/i.test(l.label));
  if (icon) out.icon = icon;

  const alternate = findUrl(
    (l, i) => i > 0 && !/wordmark|mark|icon|monogram/i.test(l.label),
  );
  if (alternate) out.alternate = alternate;
  // Fall back to the second logo if no labelled candidate stepped up
  // and no other slot has claimed it.
  if (!out.alternate && urls[1] && urls[1] !== out.wordmark && urls[1] !== out.icon) {
    out.alternate = urls[1];
  }

  // `light` is the LIGHT-COLOURED artwork (the one that sits on a dark ground)
  // and `dark` is its opposite. These used to be filled from `l.variant`, which
  // says which TILE the logo is previewed on — so the first light-variant tile
  // matched, and that is always Primary. Every brand ended up with its primary
  // logo duplicated into the mono-white slot, which is what the On-dark tile
  // then rendered. Only a tile that genuinely holds the role fills them.
  const onDark = findUrl((l) => l.role === 'mono.white' || l.id === 'on-dark');
  if (onDark) out.light = onDark;
  const onLight = findUrl((l) => l.role === 'mono.black' || l.id === 'on-light');
  if (onLight) out.dark = onLight;

  return out;
}

/**
 * The roles the board currently holds, straight from the tiles.
 *
 * Preferred over the legacy dict wherever a tile knows its own role: the dict
 * has no slot for the two orientation lockups at all, so a horizontal or
 * stacked logo could round-trip through it only by being forgotten.
 */
type RoleOnBoard = { role: LogoRole; url: string; label?: string };

function rolesFromLogos(logos: BrandLogo[]): RoleOnBoard[] {
  const seen = new Set<LogoRole>();
  const out: RoleOnBoard[] = [];
  logos.forEach((logo, i) => {
    const role = logo.role ?? (i === 0 ? 'primary' : undefined);
    if (!role || seen.has(role)) return;
    seen.add(role);
    // A label that is not the role's own name is a name the user gave it.
    const own = logo.label?.trim();
    const isDefault = !own || own.toLowerCase() === logoRoleLabel(role).toLowerCase() || own === TILE_LABEL[role];
    out.push({ role, url: extractLogoUrl(logo), label: isDefault ? undefined : own });
  });
  return out;
}

function logoAssetsEqual(a: BrandLogoAssets | undefined, b: BrandLogoAssets): boolean {
  const keys: (keyof BrandLogoAssets)[] = [
    'full',
    'icon',
    'wordmark',
    'alternate',
    'dark',
    'light',
  ];
  for (const k of keys) {
    if ((a?.[k] ?? undefined) !== (b[k] ?? undefined)) return false;
  }
  return true;
}

/**
 * Compute the logo slice of the patch. Returns null when the Setup
 * logos round-trip to the same URLs the brand already has — important,
 * because every Setup edit (even one unrelated to logos) flushes the
 * full mock through this function on the 400ms debounce; without an
 * equality check we'd rewrite the logo URLs on every keystroke.
 *
 * Strategy is MERGE, not replace. `brandToMockBrand` only surfaces
 * three logo slots in Setup (primary / wordmark / icon) — variants
 * like `light` and `dark` (used by pickLogoOnBackground for surface-
 * aware logo selection) live in `brand.logoAssets` but never appear
 * in the editor. A naive replace would clobber them on every Setup
 * save. We layer the Setup edits on top of the existing dict so seed
 * brand variants survive untouched.
 */
function buildLogoPatch(
  logos: BrandLogo[],
  existing: Brand,
): Partial<Brand> | null {
  if (logos.length === 0) {
    // User cleared every Setup-visible logo. We DON'T wipe
    // `brand.logoAssets` entirely — the user only had primary/
    // wordmark/icon under their hands; any pre-existing dark/light
    // variant they never saw should remain. Just clear the slots
    // Setup owns.
    const stripped: BrandLogoAssets = { ...existing.logoAssets };
    delete stripped.full;
    delete stripped.wordmark;
    delete stripped.icon;
    delete stripped.alternate;
    if (
      existing.logo === undefined &&
      logoAssetsEqual(existing.logoAssets, stripped)
    ) {
      return null;
    }
    return { logo: undefined, logoAssets: stripped } as Partial<Brand>;
  }

  const next = logosToAssetsDict(logos);
  // A board whose tiles all know their roles IS the answer — it is not layered
  // over what was there before. Merging kept the slot a swap had just emptied.
  const authoritative = logos.length > 0 && logos.every((l) => l.role);
  const merged: BrandLogoAssets = authoritative ? next : { ...existing.logoAssets, ...next };

  const primaryUnchanged = existing.logo === merged.full;
  const assetsUnchanged = logoAssetsEqual(existing.logoAssets, merged);
  if (primaryUnchanged && assetsUnchanged) return null;

  const out: Partial<Brand> = { logoAssets: merged };
  if (merged.full) out.logo = merged.full;
  // Also stage canonical refs + durable Asset records so Setup shares the ONE
  // logo authority. Without this, Setup's URL-only write would be reverted by the
  // persisted logoSystem/brandAssets (migration 014) that stageLogoAssignment
  // consumers wrote. stageAsset dedups by URL hash, so unchanged slots are no-ops.
  //
  // Driven by the tiles' own roles, falling back to the legacy dict for tiles
  // that predate them — so a swap in Setup moves exactly the slot the user
  // pointed at, and the orientation lockups (which the dict cannot express)
  // survive a save.
  const staged = stageLogoRoles(existing, rolesFromLogos(logos), authoritative ? {} : merged);
  if (staged.logoSystem) out.logoSystem = staged.logoSystem;
  if (staged.brandAssets) out.brandAssets = staged.brandAssets;
  return out;
}

/**
 * Point the canonical logo system at what the board now holds.
 *
 * Roles first — a tile that knows what it is decides its own slot. The legacy
 * dict fills in behind it, for a tile that arrived from a bare scalar and has
 * no role to state. Every slot goes through `stageLogoAssignment`, which dedups
 * by URL hash, so an unchanged slot is a no-op.
 */
function stageLogoRoles(
  brand: Brand,
  roles: RoleOnBoard[],
  dict: BrandLogoAssets,
): { logoSystem?: Brand['logoSystem']; brandAssets?: Brand['brandAssets'] } {
  const fromDict: Array<[keyof BrandLogoAssets, LogoRole]> = [
    ['full', 'primary'],
    ['icon', 'iconmark'],
    ['wordmark', 'wordmark'],
    ['alternate', 'secondary'],
    ['dark', 'mono.black'],
    ['light', 'mono.white'],
  ];
  const claimed = new Set(roles.map((r) => r.role));
  const all: RoleOnBoard[] = [...roles];
  for (const [slot, role] of fromDict) {
    if (claimed.has(role)) continue;
    const url = dict[slot];
    if (url) all.push({ role, url });
  }

  let working = brand;
  let staged = false;
  for (const { role, url, label } of all) {
    const { patch } = stageLogoAssignment(working, {
      role,
      url,
      kind: 'logo',
      name: `${brand.name} ${role}`,
      // The user's name for the variant rides on the ref, so it survives a
      // reload; an unnamed tile leaves it unset and reads as the role's name.
      description: label,
    });
    working = { ...working, ...patch };
    staged = true;
  }
  if (!staged) return {};

  /*
   * A slot the board no longer holds is VACATED.
   *
   * `stageLogoAssignment` merges into whatever the brand already had, which is
   * right for a fresh placement and wrong for a move: swapping the On-dark tile
   * to Wordmark left the artwork in both slots, so the tile the user had just
   * emptied went on rendering. The board now shows a tile for every canonical
   * role, so "no tile holds it" is a complete and trustworthy statement.
   */
  const held = new Set(all.map((r) => r.role));
  return {
    logoSystem: withoutUnheldRoles(working.logoSystem, held),
    brandAssets: working.brandAssets,
  };
}

/** Strips every ref whose role no tile claims any more. */
function withoutUnheldRoles(
  system: Brand['logoSystem'],
  held: ReadonlySet<LogoRole>,
): Brand['logoSystem'] {
  if (!system) return system;
  const keep = <T,>(role: LogoRole, ref: T): T | undefined => (held.has(role) ? ref : undefined);
  const next = {
    ...system,
    primary: keep('primary', system.primary),
    secondary: keep('secondary', system.secondary),
    wordmark: keep('wordmark', system.wordmark),
    iconmark: keep('iconmark', system.iconmark),
    mono: system.mono
      ? {
          black: keep('mono.black', system.mono.black),
          white: keep('mono.white', system.mono.white),
        }
      : undefined,
    orientations: system.orientations
      ? {
          horizontal: keep('horizontal', system.orientations.horizontal),
          stacked: keep('stacked', system.orientations.stacked),
        }
      : undefined,
  };
  // Drop the keys that ended up empty so the stored shape stays clean.
  for (const k of Object.keys(next) as Array<keyof typeof next>) {
    if (next[k] === undefined) delete next[k];
  }
  return next;
}
