/**
 * BrandLayout — brand-scope shell (v3, two-rail).
 *
 * The brand scope mounts BOTH global navigation surfaces side by side:
 *
 *   AppRail (88px)  ·  BrandContextRail (256px)  ·  page
 *   global product       contextual to this brand
 *
 * AppRail is the spine that follows the user across the whole product. The
 * brand switcher lives in its top slot, satisfying the rule that switching
 * brands belongs at the top of the sidebar area, never inside the canvas.
 *
 * BrandContextRail is the brand's own home — the five-section IA from
 * docs/ux-redesign/ARCHITECTURE.md §3, with a brand-identity header card so
 * the user always knows exactly which brand they are operating on.
 *
 * The layout owns horizontal/vertical padding and the centered max-width
 * column. Pages MUST NOT redeclare these — they came from here.
 */
import { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useBrandStore } from '@/shared/store/brandStore';
import { AppRail } from '@/shared/layouts/AppRail';
import { BrandContextRail } from '@/shared/layouts/BrandContextRail';
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
}

const maxWidthClass: Record<NonNullable<BrandLayoutProps['maxWidth']>, string> = {
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

export function BrandLayout({ children, brandName, maxWidth = '6xl' }: BrandLayoutProps) {
  const { slug } = useParams<{ slug: string }>();
  // Pull the active brand straight from the store. Pages that mount this
  // layout always run useBrandBySlug, which sets `current`, so by the time the
  // rails read it the brand is in place.
  const currentBrand = useBrandStore((s) => s.current);
  const brandList = useBrandStore((s) => s.list);
  const brandForRail =
    currentBrand && currentBrand.slug === slug
      ? currentBrand
      : brandList.find((b) => b.slug === slug) ?? null;

  return (
    <div className="h-screen flex w-full bg-background overflow-hidden">
      <AppRail brandSlug={slug} />
      {slug && <BrandContextRail slug={slug} brand={brandForRail} />}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <BrandNavbar brandName={brandName ?? brandForRail?.name} />

        <main className="flex-1 overflow-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className={`mx-auto w-full ${maxWidthClass[maxWidth]}`}>
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
