/**
 * BrandRouteLayout — the parent route component for the entire brand scope.
 *
 * Mounts `BrandLayout` exactly once. As the user navigates between brand
 * pages (Overview → Setup → Guidelines → …), this component DOES NOT
 * unmount. Only the `<Outlet />` (the page contents) swaps. AppRail,
 * BrandNavbar, and the InnerNavRail container all stay mounted, so brand-
 * scope navigation feels instant — no flicker, no scroll loss, no re-running
 * of "lazy load brand list" effects.
 *
 * Pages publish their per-page config (innerNav, maxWidth, brandName) via
 * `useBrandPageConfig`; this component reads it from the store and threads
 * it into BrandLayout.
 */
import { Outlet } from 'react-router-dom';
import { BrandLayout } from '@/features/brand/components/BrandLayout';
import { BrandSettingsProvider } from '@/shared/brand-settings';
import { useBrandPageConfigStore } from './brandPageConfig';

export function BrandRouteLayout() {
  const brandName = useBrandPageConfigStore((s) => s.brandName);
  const maxWidth = useBrandPageConfigStore((s) => s.maxWidth);
  const innerNav = useBrandPageConfigStore((s) => s.innerNav);

  return (
    <BrandSettingsProvider>
      <BrandLayout brandName={brandName} maxWidth={maxWidth} innerNav={innerNav}>
        <Outlet />
      </BrandLayout>
    </BrandSettingsProvider>
  );
}
