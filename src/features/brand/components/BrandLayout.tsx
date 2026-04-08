/**
 * BrandLayout — brand-scope shell.
 *
 * The brand scope is built from up to three structural columns, all owned
 * by this shell:
 *
 *   ┌────┬────────────┬─────────────────────────────────┐
 *   │    │            │  BrandNavbar                    │
 *   │ App│ InnerNav   │  ───────────────────────────────│
 *   │ Rail Rail (opt) │  PageHeader (page-owned)        │
 *   │    │            │  ───────────────────────────────│
 *   │    │            │  Page sections                  │
 *   └────┴────────────┴─────────────────────────────────┘
 *      88px    240px              flex-1
 *
 * - **AppRail** — always present. Scope-aware, brand items inside a brand.
 * - **InnerNavRail** — optional. Mounted only when a page passes `innerNav`.
 *   It is a STRUCTURAL column, not a floating card inside the page body.
 * - **BrandNavbar** — slim topbar with `Brand · Section` breadcrumb.
 * - **Main content area** — pages render here. Pages should use `PageHeader`
 *   for their header (single header, no in-page sticky bars).
 *
 * The layout owns horizontal/vertical padding and the centered max-width
 * column. Pages MUST NOT redeclare these — they came from here.
 */
import { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useBrandStore } from '@/shared/store/brandStore';
import { AppRail } from '@/shared/layouts/AppRail';
import { InnerNavRail, type InnerNavConfig } from '@/shared/layouts/InnerNavRail';
import { BrandNavbar } from './BrandNavbar';

interface BrandLayoutProps {
  children: ReactNode;
  brandName?: string;
  /**
   * Override max-width of the centered content column. Defaults to `6xl`.
   * Brand pages SHOULD use this prop instead of redeclaring `max-w-* mx-auto`
   * inside their content. Horizontal/vertical padding is owned by the layout.
   */
  maxWidth?: '5xl' | '6xl' | '7xl' | 'full';
  /**
   * Optional inner-nav column config. When provided, the layout mounts an
   * `InnerNavRail` immediately to the right of `AppRail`. Pages should pass
   * data here instead of mounting `InnerNavRail` themselves.
   */
  innerNav?: InnerNavConfig;
}

const maxWidthClass: Record<NonNullable<BrandLayoutProps['maxWidth']>, string> = {
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

export function BrandLayout({
  children,
  brandName,
  maxWidth = '6xl',
  innerNav,
}: BrandLayoutProps) {
  const { slug } = useParams<{ slug: string }>();
  // Pull the active brand from the store. Pages that mount this layout
  // always run useBrandBySlug, which sets `current`, so by the time the
  // rail reads it the brand is in place.
  const currentBrand = useBrandStore((s) => s.current);
  const brandList = useBrandStore((s) => s.list);
  const resolvedBrand =
    currentBrand && currentBrand.slug === slug
      ? currentBrand
      : brandList.find((b) => b.slug === slug) ?? null;

  return (
    <div className="h-screen flex w-full bg-background overflow-hidden">
      <AppRail brandSlug={slug} />
      {innerNav && <InnerNavRail {...innerNav} />}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <BrandNavbar brandName={brandName ?? resolvedBrand?.name} />

        <main className="flex-1 overflow-auto">
          <div className="px-6 sm:px-8 lg:px-10 py-8">
            <div className={`mx-auto w-full ${maxWidthClass[maxWidth]}`}>
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
