import { useCallback, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CosmosWorkspaceShell } from '@/shared/layouts/CosmosWorkspaceShell';
import { useBrandFromSlug } from '@/shared/hooks/useBrandFromSlug';
import { KitSection } from '@/features/brand-kit/components/KitSection';
import {
  ToolsSidebar,
  type ToolsSectionKey,
} from '@/features/tools-cosmos/components/ToolsSidebar';
import { ToolCard } from '@/features/tools-cosmos/components/ToolCard';
import {
  ChartIcon,
  ContrastIcon,
  FolderIcon,
  GlobeIcon,
  InboxIcon,
  LayersIcon,
  PaletteIcon,
  PenToolIcon,
  ShareIcon,
  ShieldCheckIcon,
} from '@/features/tools-cosmos/components/icons';
import '@/features/tools-cosmos/tools-cosmos.css';

/**
 * Brand-scoped Tools tab at `/b/:slug/tools`.
 *
 * This is a HUB — each card links out to the existing tool route. The
 * tools themselves keep their implementations on their current pages
 * (`/b/:slug/folders`, `/b/:slug/studio`, `/b/:slug/analytics`, etc).
 *
 * Layout mirrors the Setup / Brand Kit cosmos pages:
 *   - CosmosWorkspaceShell (auto-detects slug, renders the pill nav)
 *   - `.shell` grid with a sticky `.panel` sidebar and a `.board-wrap`
 *     board of `<KitSection>` blocks, each full of `<ToolCard>`s.
 */
export default function BrandToolsTabPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand } = useBrandFromSlug(slug);

  const [activeKey, setActiveKey] = useState<ToolsSectionKey>('assets');

  const sectionRefs = useRef<Partial<Record<ToolsSectionKey, HTMLElement | null>>>({
    assets: null,
    share: null,
    validation: null,
    analytics: null,
    approvals: null,
    utilities: null,
  });

  const handleJump = useCallback((key: ToolsSectionKey) => {
    setActiveKey(key);
    const el = sectionRefs.current[key];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const setRef = (key: ToolsSectionKey) => (el: HTMLElement | null) => {
    sectionRefs.current[key] = el;
  };

  // Asset count — prefer the v3 `brandAssets` array, fall back to the
  // legacy `assets` array, default to 0 so the badge always renders.
  const assetCount = useMemo(() => {
    if (!brand) return 0;
    const v3 = brand.brandAssets?.length ?? 0;
    if (v3 > 0) return v3;
    return brand.assets?.length ?? 0;
  }, [brand]);

  // Slug-dependent URLs. If the brand is still loading we fall back to a
  // safe `/b/:slug/...` string using the URL slug so links never go blank.
  const s = slug ?? brand?.slug ?? '';
  const brandName = brand?.name ?? 'Brand';

  return (
    <CosmosWorkspaceShell>
      <div className="shell">
        <ToolsSidebar
          brandName={brandName}
          activeKey={activeKey}
          onJump={handleJump}
        />
        <div className="board-wrap">
          {/* ——— Assets ——— */}
          <KitSection
            dataKey="assets"
            title="Assets"
            spec="Your brand's uploaded library"
            sectionRef={setRef('assets')}
          >
            <div className="tools-grid tools-grid--1">
              <ToolCard
                to={`/b/${s}/folders`}
                icon={FolderIcon}
                title="Brand Assets Library"
                description="Logos, photos, documents, and exports — every file scoped to this brand, searchable and foldered."
                badge={`${assetCount} ${assetCount === 1 ? 'file' : 'files'}`}
                size="feature"
              />
            </div>
          </KitSection>

          {/* ——— Share ——— */}
          <KitSection
            dataKey="share"
            title="Share"
            spec="Distribute your brand to partners and the public"
            sectionRef={setRef('share')}
          >
            <div className="tools-grid">
              <ToolCard
                to={`/b/${s}/share`}
                icon={ShareIcon}
                title="Public Share"
                description="Generate a public link for your logo deck, guidelines, and brand showcase."
              />
              <ToolCard
                to={`/p/${s}`}
                external
                icon={GlobeIcon}
                title="Brand Portal"
                description="Open the public-facing portal for this brand in a new tab."
              />
            </div>
          </KitSection>

          {/* ——— Validation ——— */}
          <KitSection
            dataKey="validation"
            title="Validation"
            spec="Check consistency, contrast, and WCAG compliance"
            sectionRef={setRef('validation')}
          >
            <div className="tools-grid">
              <ToolCard
                to={`/b/${s}/studio`}
                icon={ShieldCheckIcon}
                title="Brand Consistency Studio"
                description="Audit designs against your brand rules — colors, fonts, logo usage, and spacing."
              />
              <ToolCard
                to={`/b/${s}/tools/ui-color-system`}
                icon={ContrastIcon}
                title="Contrast Checker"
                description="Verify every text/background pair hits AA or AAA contrast across your palette."
              />
            </div>
          </KitSection>

          {/* ——— Analytics ——— */}
          <KitSection
            dataKey="analytics"
            title="Analytics"
            spec="Track how your brand is performing"
            sectionRef={setRef('analytics')}
          >
            <div className="tools-grid tools-grid--1">
              <ToolCard
                to={`/b/${s}/analytics`}
                icon={ChartIcon}
                title="Brand Analytics"
                description="Live brand health score, asset usage, and recent activity across templates and exports."
                size="feature"
              />
            </div>
          </KitSection>

          {/* ——— Approvals ——— */}
          <KitSection
            dataKey="approvals"
            title="Approvals"
            spec="Review and greenlight brand assets"
            sectionRef={setRef('approvals')}
          >
            <div className="tools-grid tools-grid--1">
              <ToolCard
                to={`/b/${s}/approvals`}
                icon={InboxIcon}
                title="Review Queue"
                description="Pending assets awaiting your approval. Comment, accept, or request changes from teammates."
                size="feature"
              />
            </div>
          </KitSection>

          {/* ——— Utilities ——— */}
          <KitSection
            dataKey="utilities"
            title="Utilities"
            spec="Studios, makers, and everyday helpers"
            sectionRef={setRef('utilities')}
          >
            <div className="tools-grid tools-grid--3">
              <ToolCard
                to={`/b/${s}/tools/variant-studio`}
                icon={LayersIcon}
                title="Logo Variant Studio"
                description="Generate horizontal, stacked, mono, and reversed logo variants from a single mark."
                size="compact"
              />
              <ToolCard
                to={`/b/${s}/tools/ui-color-system`}
                icon={PaletteIcon}
                title="UI Color System"
                description="Build UI tokens — surface, border, accent — from your brand palette."
                size="compact"
              />
              <ToolCard
                to="/dashboard/logo-maker"
                icon={PenToolIcon}
                title="Logo Maker"
                description="Create a new logo from scratch. Save the result back into this brand."
                size="compact"
              />
            </div>
          </KitSection>
        </div>
      </div>
    </CosmosWorkspaceShell>
  );
}
