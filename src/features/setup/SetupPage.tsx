import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CosmosWorkspaceShell } from '@/shared/layouts/CosmosWorkspaceShell';
import { mockBrand, type MockBrand } from './data/mockBrand';
import { SetupSidebar, type SectionKey } from './components/SetupSidebar';
import { SetupBoard, type SetupBoardRefs } from './components/SetupBoard';
import { ArrowRight } from './components/SetupIcons';
import { UploadModal, type UploadKind, type CommittedAsset } from './components/UploadModal';

const UPLOAD_KINDS: ReadonlySet<SectionKey> = new Set<SectionKey>(['logo', 'icons', 'photos']);

type ColorGroupKey = 'core' | 'accent' | 'grey';

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
  // TODO: swap for a real brand-store read once auth/backend is wired.
  const [brand, setBrand] = useState<MockBrand>(mockBrand);
  const [activeKey, setActiveKey] = useState<SectionKey | null>('logo');
  const [uploadKind, setUploadKind] = useState<UploadKind | null>(null);
  // When set, the next committed upload replaces this logo in place.
  const [replaceLogoId, setReplaceLogoId] = useState<string | null>(null);
  // Same idea for photos.
  const [replacePhotoId, setReplacePhotoId] = useState<string | null>(null);

  const handleUpdateColor = useCallback(
    (group: ColorGroupKey, index: number, hex: string) => {
      setBrand((prev) => {
        const list = prev.colors[group];
        if (!list[index]) return prev;
        const nextList = list.slice();
        nextList[index] = { ...nextList[index], hex };
        return {
          ...prev,
          colors: { ...prev.colors, [group]: nextList },
        };
      });
    },
    [],
  );

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
    setActiveKey(key);
    if (UPLOAD_KINDS.has(key)) {
      setUploadKind(key as UploadKind);
      return;
    }
    toast(`Edit ${key}`, {
      description: 'Editors will open here once the backend integration lands.',
    });
  }, []);

  const handleOpenUpload = useCallback((key: SectionKey) => {
    if (!UPLOAD_KINDS.has(key)) return;
    setActiveKey(key);
    setUploadKind(key as UploadKind);
  }, []);

  const handleCloseUpload = useCallback(() => {
    setUploadKind(null);
    setReplaceLogoId(null);
    setReplacePhotoId(null);
  }, []);

  const handleCommitAsset = useCallback(
    (asset: CommittedAsset, kind: UploadKind) => {
      const id = `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setBrand((prev) => {
        if (kind === 'photos') {
          if (replacePhotoId) {
            return {
              ...prev,
              photos: prev.photos.map((p) =>
                p.id === replacePhotoId ? { ...p, src: asset.dataUrl } : p,
              ),
            };
          }
          // Append to first unused bento slot; cap at 6.
          const used = new Set(prev.photos.map((p) => p.slot));
          const PHOTO_SLOTS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
          const nextSlot = PHOTO_SLOTS.find((s) => !used.has(s));
          if (!nextSlot) return prev;
          return { ...prev, photos: [...prev.photos, { id, src: asset.dataUrl, slot: nextSlot }] };
        }
        if (kind === 'logo') {
          const svg =
            asset.svg ??
            `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><image href="${asset.dataUrl}" x="0" y="0" width="200" height="200" preserveAspectRatio="xMidYMid meet"/></svg>`;
          const label = (asset.name || 'Logo').replace(/\.[^.]+$/, '');
          // Replace in place when a target id is set; otherwise append.
          if (replaceLogoId) {
            return {
              ...prev,
              logos: prev.logos.map((l) =>
                l.id === replaceLogoId ? { ...l, label, svg } : l,
              ),
            };
          }
          return {
            ...prev,
            logos: [...prev.logos, { id, label, variant: 'light', svg }],
          };
        }
        if (kind === 'icons') {
          const label = (asset.name || 'Icon').replace(/\.[^.]+$/, '');
          return { ...prev, icons: [...prev.icons, label] };
        }
        return prev;
      });
      // Clear any replace-target after the first successful commit.
      if (replaceLogoId) setReplaceLogoId(null);
      if (replacePhotoId) setReplacePhotoId(null);
    },
    [replaceLogoId, replacePhotoId],
  );

  const handleDeleteLogo = useCallback((id: string) => {
    setBrand((prev) => ({
      ...prev,
      logos: prev.logos.filter((l) => l.id !== id),
    }));
  }, []);

  const handleReplaceLogo = useCallback((id: string) => {
    setReplaceLogoId(id);
    setUploadKind('logo');
  }, []);

  const handleDeletePhoto = useCallback((id: string) => {
    setBrand((prev) => ({
      ...prev,
      photos: prev.photos.filter((p) => p.id !== id),
    }));
  }, []);

  const handleReplacePhoto = useCallback((id: string) => {
    setReplacePhotoId(id);
    setUploadKind('photos');
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
          onOpenUpload={handleOpenUpload}
        />
        <SetupBoard
          brand={brand}
          onEdit={handleEdit}
          sectionRefs={sectionRefs}
          onUpdateColor={handleUpdateColor}
          onDeleteLogo={handleDeleteLogo}
          onReplaceLogo={handleReplaceLogo}
          onDeletePhoto={handleDeletePhoto}
          onReplacePhoto={handleReplacePhoto}
        />
      </div>
      <UploadModal
        open={uploadKind !== null}
        kind={uploadKind}
        onClose={handleCloseUpload}
        onCommit={handleCommitAsset}
      />
    </CosmosWorkspaceShell>
  );
}

export default SetupPage;
