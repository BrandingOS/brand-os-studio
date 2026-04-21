import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CosmosWorkspaceShell } from '@/shared/layouts/CosmosWorkspaceShell';
import { mockBrand } from './data/mockBrand';
import { SetupSidebar, type SectionKey } from './components/SetupSidebar';
import { SetupBoard, type SetupBoardRefs } from './components/SetupBoard';
import { ArrowRight } from './components/SetupIcons';

/**
 * Setup — the primary workspace page of the new UI.
 *
 * This page replaces the legacy "Sitemap" concept: a single surface where
 * every ingredient of a brand (logo, color, typography, iconography,
 * photography, website, voice) lives side-by-side with a progress rail on
 * the left and a live editorial preview on the right.
 *
 * The page is presentational for now — all state is local and seeded from
 * `mockBrand`. Wiring points (TODOs inline) are where persistence should
 * land once auth/backend integration resumes.
 */
export function SetupPage() {
  const brand = mockBrand;
  const [activeKey, setActiveKey] = useState<SectionKey | null>('logo');

  const sectionRefs = useRef<SetupBoardRefs>({
    logo: null,
    colors: null,
    fonts: null,
    icons: null,
    photos: null,
    website: null,
    voice: null,
  });

  const completed = useMemo(() => {
    let n = 0;
    if (brand.logos.length) n += 1;
    if (brand.colors.core.length) n += 1;
    if (brand.fonts.display && brand.fonts.text) n += 1;
    if (brand.icons.length) n += 1;
    if (brand.photos.length) n += 1;
    if (brand.website.url) n += 1;
    if (brand.voice.essay) n += 1;
    return n;
  }, [brand]);

  const handleJump = useCallback((key: SectionKey) => {
    setActiveKey(key);
    const el = sectionRefs.current[key];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleEdit = useCallback((key: SectionKey) => {
    // TODO: open edit modal for this section once backend is wired.
    toast(`Edit ${key}`, {
      description: 'Editors will open here once the backend integration lands.',
    });
    setActiveKey(key);
  }, []);

  return (
    <CosmosWorkspaceShell
      rightActions={
        <button type="button" className="pill-btn pill-btn--primary">
          <span>Publish</span>
          <ArrowRight size={14} className="pill-btn-arrow" />
        </button>
      }
    >
      <div className="shell">
        <SetupSidebar
          brand={brand}
          activeKey={activeKey}
          completed={completed}
          total={7}
          onJump={handleJump}
        />
        <SetupBoard brand={brand} onEdit={handleEdit} sectionRefs={sectionRefs} />
      </div>
    </CosmosWorkspaceShell>
  );
}

export default SetupPage;
