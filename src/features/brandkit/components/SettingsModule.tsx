/**
 * SettingsModule — DEPRECATED in v2.1.
 *
 * This module used to be the per-brandkit-module settings form. v2.1
 * centralizes brand settings into a single canonical component
 * `BrandSettingsHub` (in features/brandkit-v2/) so editing the brand
 * is identical no matter where you do it. This file now delegates to
 * that component to satisfy any legacy deep link
 * (/dashboard/brand/:slug/brandkit/settings).
 *
 * Do not extend this file — extend BrandSettingsHub instead.
 */
import { BrandSettingsHub } from '@/features/brandkit-v2/BrandSettingsHub';
import type { Brand } from '@/shared/types/brand';

interface SettingsModuleProps {
  // Kept for prop-shape compatibility with the legacy dispatcher.
  brand?: Brand;
  onUpdate?: (patch: Partial<Brand>) => void;
}

export function SettingsModule(_props: SettingsModuleProps = {}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
        <p className="text-xs text-foreground">
          Brand settings are now centralized. Every change here updates every asset, every page, every export.
        </p>
      </div>
      <BrandSettingsHub />
    </div>
  );
}
