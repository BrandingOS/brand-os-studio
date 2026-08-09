import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import SetupPage from '@/features/setup/SetupPage';
import { useBrandFromSlug } from '@/shared/hooks/useBrandFromSlug';
import { useBrandStore } from '@/shared/store/brandStore';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { mockBrandToPatch } from '@/features/setup/data/mockBrandToPatch';
import { migrateBrandToCurrent } from '@/shared/brand/migrateSchema';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { useService, SERVICE_KEYS } from '@/core';
import type { BrandRepository } from '@/domain/brand/repository';
import { changeBrandColors, type BrandColorChanges } from '@/application/brand/changeBrandColor';
import { changeBrandTypography, type TypographyChanges } from '@/application/brand/changeBrandTypography';
import { changeBrandVoiceTone } from '@/application/brand/changeBrandVoice';
import { changeBrandStrategy, type StrategyChange } from '@/application/brand/changeBrandStrategy';
import { toLegacyBrandPatch, type CanonicalBrand } from '@/domain/brand';
import { applyBrandTokens } from '@/shared/design-system/PresentationStyleAdapter';
import { BrandNotFoundPanel } from '@/shared/components/BrandNotFoundPanel';

/**
 * Brand-scoped Setup tab at /b/:slug/setup.
 *
 * Wiring:
 *  1. Load the brand by slug (sync for seed brands, async for user brands).
 *  2. Project Brand → MockBrand for the editor.
 *  3. On each (debounced) edit inside SetupPage, project MockBrand →
 *     Partial<Brand> and call `brandStore.update(id, patch)` so every
 *     edit persists through the service layer (localStorage +
 *     Supabase, depending on which brands service is active).
 *
 * CRITICAL: we never render SetupPage with `initialBrand=undefined`.
 * Its `useState` captures the initial prop once — feeding undefined
 * would stick on the Nuworld mock. The seed fallback in
 * `useBrandFromSlug` handles /b/skam, /b/raqm, /b/vector
 * synchronously.
 *
 * `key={brand.id}` forces a clean remount when switching brands so
 * the edit state inside SetupPage resets cleanly.
 */
export default function BrandSetupPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand, isLoading } = useBrandFromSlug(slug);
  const updateBrand = useBrandStore((s) => s.update);
  const repo = useService<BrandRepository>(SERVICE_KEYS.BRAND_REPOSITORY);

  const handlePersist = useCallback(
    async (next: MockBrand) => {
      if (!brand) return;
      const patch = mockBrandToPatch(next, brand);
      if (Object.keys(patch).length === 0) return;

      // Brand System finalization — EVERY identity subsystem Setup edits is routed
      // through its ONE canonical operation (colors, typography, voice tone,
      // strategy), so Setup and the Settings tabs share a single write authority
      // and the canonical identity blob is always the source of truth. Only
      // genuinely non-identity fields (name, logos, publicUrl) fall through to the
      // legacy `updateBrand`. Logos stay legacy until the logo subsystem is
      // canonical (durable Asset persistence).
      const {
        primaryColor: _p,
        secondaryColor: _s,
        accentColor: _a,
        neutrals: _n,
        colorSystem: _cs,
        fonts: _f,
        typography: _t,
        tone: _to,
        guidelines: _g,
        ...rest
      } = patch;

      try {
        let latest: CanonicalBrand | null = null;

        // Colors
        const colorChanges: BrandColorChanges = {};
        if (patch.primaryColor) colorChanges.primary = { hex: patch.primaryColor };
        if (patch.secondaryColor) colorChanges.secondary = { hex: patch.secondaryColor };
        if (patch.accentColor) colorChanges.accent = { hex: patch.accentColor };
        if (patch.neutrals) colorChanges.neutrals = patch.neutrals.map((hex) => ({ hex }));
        if (Object.keys(colorChanges).length > 0) {
          latest = await changeBrandColors(repo, brand.id, colorChanges);
        }

        // Typography — families AND uploaded font files (both must reach the blob).
        if (patch.fonts || patch.typography) {
          const typo: TypographyChanges = {};
          const pf = patch.typography?.primary;
          const primaryFam = patch.fonts?.primary ?? pf?.family;
          if (primaryFam || pf?.files) {
            typo.primary = {
              ...(primaryFam ? { family: primaryFam } : {}),
              ...(pf?.files ? { files: pf.files } : {}),
            };
          }
          const sf = patch.typography?.secondary;
          const secFam = patch.fonts?.secondary ?? sf?.family;
          if (secFam) typo.secondary = { family: secFam, ...(sf?.files ? { files: sf.files } : {}) };
          else if (patch.fonts && 'secondary' in patch.fonts && !patch.fonts.secondary) typo.secondary = null;
          if (typo.primary || typo.secondary !== undefined) {
            latest = await changeBrandTypography(repo, brand.id, typo);
          }
        }

        // Voice tone
        if (typeof patch.tone === 'string') {
          latest = await changeBrandVoiceTone(repo, brand.id, patch.tone);
        }

        // Strategy (+ free-form About sections)
        const gStrategy = patch.guidelines?.strategy;
        const about = patch.guidelines?.aboutSections;
        if (gStrategy || about) {
          const change: StrategyChange = {};
          if (gStrategy?.mission !== undefined) change.mission = gStrategy.mission;
          if (gStrategy?.vision !== undefined) change.vision = gStrategy.vision;
          if (gStrategy?.positioning !== undefined) change.positioning = gStrategy.positioning;
          if (about) change.aboutSections = about;
          if (Object.keys(change).length > 0) {
            latest = await changeBrandStrategy(repo, brand.id, change);
          }
        }

        // One store sync with the final canonical result. Re-run
        // `migrateBrandToCurrent` so the identity blob in the patch re-hydrates
        // ALL legacy read-homes (incl. guidelines.strategy, which the patch does
        // not carry) — otherwise store readers would see stale strategy until reload.
        if (latest) {
          const cpatch = toLegacyBrandPatch(latest);
          useBrandStore.setState((st) => ({
            current:
              st.current?.id === brand.id
                ? migrateBrandToCurrent({ ...st.current, ...cpatch })
                : st.current,
            list: st.list.map((b) =>
              b.id === brand.id ? migrateBrandToCurrent({ ...b, ...cpatch }) : b,
            ),
          }));
          const cur = useBrandStore.getState().current;
          if (cur?.id === brand.id) applyBrandTokens(cur);
        }

        // Non-identity remainder (name, logos, publicUrl).
        if (Object.keys(rest).length > 0) {
          await updateBrand(brand.id, rest);
        }
      } catch (err) {
        toast.error('Could not save changes', {
          description: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
    [brand, updateBrand, repo],
  );

  if (!brand) return <BrandNotFoundPanel slug={slug} isLoading={isLoading} />;

  return (
    <SetupPage
      key={brand.id}
      brandId={brand.id}
      initialBrand={brandToMockBrand(brand)}
      onPersist={handlePersist}
    />
  );
}
