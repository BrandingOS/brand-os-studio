import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CosmosWorkspaceShell } from '@/shared/layouts/CosmosWorkspaceShell';
import { ArrowRight } from '@/features/setup/components/SetupIcons';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import {
  BrandKitSidebar,
  KIT_SECTIONS,
  type KitSectionKey,
} from './components/BrandKitSidebar';
import { KitSection } from './components/KitSection';
import { SectionGrid } from './components/sections';
import './brand-kit.css';

/**
 * BrandKitCosmosPage — single-scroll Brand Kit at /b/:slug/brand-kit.
 *
 * The page is a long list of sections (Stationery · Social · Favicons
 * · Mockups · Brand Book · Brand Guides · Profile Icons · Business
 * Cards · Facebook Covers · Instagram Posts · Instagram Stories ·
 * Presentations · Animations · QR Code · Invoices · Design Tool).
 * Each section renders a grid of placeholder cards that share a
 * single cover image — real per-item renders will replace the
 * placeholder later.
 *
 * Sidebar is a flat list of the same 16 section keys; click a row to
 * scroll to it. No deep-editors split anymore.
 */
export function BrandKitCosmosPage({ brand }: { brand: MockBrand }) {
  const [activeKey, setActiveKey] = useState<KitSectionKey>('stationery');

  const sectionRefs = useRef<Partial<Record<KitSectionKey, HTMLElement | null>>>({});

  const setRef = (key: KitSectionKey) => (el: HTMLElement | null) => {
    sectionRefs.current[key] = el;
  };

  const handleJump = useCallback((key: KitSectionKey) => {
    setActiveKey(key);
    const el = sectionRefs.current[key];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const completion = useMemo(() => {
    // All sections are always available — the brand just drives the
    // preview values inside them. Progress shows how many have been
    // "touched" in a loose sense (identity set + logo present).
    const identity = brand.logos.length > 0 && brand.colors.core.length > 0;
    const completed = identity ? KIT_SECTIONS.length : 0;
    return { completed, total: KIT_SECTIONS.length };
  }, [brand]);

  // Scroll-spy: sync the sidebar's active row with the topmost
  // in-view section. Fires only when the active changes, so it's
  // cheap even across 16 observed targets.
  useEffect(() => {
    const sections: Array<{ key: KitSectionKey; el: HTMLElement }> = KIT_SECTIONS.map((s) => {
      const el = sectionRefs.current[s.key];
      return el ? { key: s.key, el } : null;
    }).filter(Boolean) as Array<{ key: KitSectionKey; el: HTMLElement }>;
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length === 0) return;
        const top = visible[0];
        const match = sections.find((s) => s.el === top.target);
        if (match) setActiveKey(match.key);
      },
      { rootMargin: '-80px 0px -55% 0px', threshold: 0 },
    );
    sections.forEach((s) => observer.observe(s.el));
    return () => observer.disconnect();
  }, []);

  return (
    <CosmosWorkspaceShell
      rightActions={
        <button type="button" className="pill-btn pill-btn--primary">
          <span>Export kit</span>
          <ArrowRight size={14} className="pill-btn-arrow" />
        </button>
      }
    >
      <div className="shell">
        <BrandKitSidebar
          brand={brand}
          activeKey={activeKey}
          completed={completion.completed}
          total={completion.total}
          onJump={handleJump}
        />
        <div className="board-wrap">
          {KIT_SECTIONS.map((s) => (
            <KitSection
              key={s.key}
              dataKey={s.key}
              title={s.name}
              sectionRef={setRef(s.key)}
              onAdd={() =>
                toast(`Add ${s.name}`, {
                  description: 'Creation flow lands here.',
                })
              }
              onDownload={() =>
                toast(`Download ${s.name}`, {
                  description: 'Export flow lands here.',
                })
              }
            >
              <SectionGrid
                brand={brand}
                sectionKey={s.key}
                onSaveCard={(t) =>
                  toast(`Saved ${t.label}`, {
                    description: 'Persistence lands here.',
                  })
                }
                onDownloadCard={(t) =>
                  toast(`Download ${t.label}`, {
                    description: 'Export lands here.',
                  })
                }
              />
            </KitSection>
          ))}
        </div>
      </div>
    </CosmosWorkspaceShell>
  );
}

export default BrandKitCosmosPage;
