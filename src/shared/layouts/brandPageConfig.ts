/**
 * brandPageConfig — the layout-config bridge between child pages and the
 * shared `BrandRouteLayout` parent.
 *
 * Why this exists
 * ---------------
 * Brand pages are nested under a single parent route that mounts
 * `BrandLayout` exactly once. That parent layout NEVER unmounts as the user
 * navigates between brand pages — only the `<Outlet />` (the page content)
 * swaps. AppRail, BrandNavbar, and the InnerNavRail container stay mounted,
 * which means navigation inside the brand scope feels instant: no flicker,
 * no scroll loss, no re-running of "lazy load brand list" effects.
 *
 * The catch: each page has its own `innerNav`, `maxWidth`, and `brandName`
 * config that the parent layout needs to know about. Pages publish that
 * config here via `useBrandPageConfig`. The parent reads it via the store.
 *
 * Usage in a brand page
 * ---------------------
 * ```tsx
 * export default function MyBrandPage() {
 *   const { brand } = useBrandBySlug(slug);
 *
 *   const innerNav = useMemo<InnerNavConfig>(() => ({
 *     title: 'My Page',
 *     icon: SomeIcon,
 *     storageKey: 'brandos:my-page-nav-open',
 *     groups: [...],
 *   }), []);
 *
 *   useBrandPageConfig({
 *     brandName: brand?.name,
 *     maxWidth: '7xl',
 *     innerNav,
 *   });
 *
 *   return <>...page content (no BrandLayout wrapper)...</>;
 * }
 * ```
 *
 * IMPORTANT: pages MUST memoize `innerNav` (or build it from stable
 * inputs). Without memoization, the publish effect would fire on every
 * render and the parent layout would re-render unnecessarily.
 */
import { useEffect } from 'react';
import { create } from 'zustand';
import type { InnerNavConfig } from './InnerNavRail';

export interface BrandPageConfig {
  brandName?: string;
  maxWidth?: '5xl' | '6xl' | '7xl' | 'full';
  innerNav?: InnerNavConfig;
}

interface BrandPageConfigStore extends BrandPageConfig {
  setConfig: (config: BrandPageConfig) => void;
  reset: () => void;
}

const DEFAULTS: BrandPageConfig = {
  brandName: undefined,
  maxWidth: '6xl',
  innerNav: undefined,
};

export const useBrandPageConfigStore = create<BrandPageConfigStore>((set) => ({
  ...DEFAULTS,
  setConfig: (config) => set(config),
  reset: () => set(DEFAULTS),
}));

/**
 * Pages call this to publish their layout config to BrandRouteLayout.
 *
 * @param brandName label shown in BrandNavbar's breadcrumb
 * @param maxWidth  content max-width
 * @param innerNav  the InnerNavRail config — pass undefined for no rail
 *                  (Pages must memoize the config object so this hook
 *                  doesn't churn on every render.)
 */
export function useBrandPageConfig({
  brandName,
  maxWidth,
  innerNav,
}: BrandPageConfig) {
  useEffect(() => {
    useBrandPageConfigStore.getState().setConfig({
      brandName,
      maxWidth,
      innerNav,
    });
    // No cleanup — the next page's mount overwrites the config. We deliberately
    // do NOT reset on unmount because that would create a one-frame flash of
    // empty config between pages.
  }, [brandName, maxWidth, innerNav]);
}
