import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Brand } from '@/shared/types/brand';
import { useBrandStore } from '@/shared/store/brandStore';
import { useService } from '@/core';
import { SERVICE_KEYS, type IAssetsService } from '@/core/types/services';
import { useBentoStore } from './store';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';
import { BentoCanvas, type BentoCanvasHandle } from './components/BentoCanvas';
import { BentoActions } from './components/BentoActions';
import { TemplateRail } from './components/TemplateRail';
import { BentoInspector } from './components/BentoInspector';
import { ImageUploadPrompt, type PendingUpload } from './components/ImageUploadPrompt';
import { MediaPicker, type MediaPickResult } from './components/MediaPicker';
import { resolveSize } from './sizes';
import { fetchPhotoAsDataUrl, type StockPhoto } from './lib/stockPhotos';
import './bento.css';

interface Props {
  brand: Brand | null | undefined;
  /**
   * A control belonging to the page rather than the document — the brand
   * source picker on the standalone route. It sits in the page header beside
   * the title, not in the shell's action row, because it selects what the
   * page is ABOUT rather than doing something to the document.
   */
  extraLeft?: React.ReactNode;
}

/**
 * Bento, as a page of BrandingOS.
 *
 * ── What this replaced ───────────────────────────────────────────────────
 *
 * A `position: fixed; inset: 0` root that covered the application: no
 * BrandingOS top bar, no section nav, no brand switcher, no theme control, and
 * three rows of chrome Bento drew for itself (`EditorChrome`, a document
 * toolbar, and the rail's own header). It was a separate application that
 * happened to share a URL space, and the only way back to the brand was a link
 * it drew itself.
 *
 * It is now an ordinary Studio page: `WorkspaceShell` supplies the real top
 * bar and the five-section nav, the page contributes its ACTIONS to that bar,
 * and the workspace below is the app-shell grid the Guideline builder
 * established — a pinned rail and a pinned panel either side of the one thing
 * that scrolls.
 *
 * ── Why the theme scope disappeared from here ────────────────────────────
 *
 * It did not; it moved up. `WorkspaceShell` owns `data-workspace` +
 * `data-theme` for every Studio page, and setting them again here would be a
 * second writer of the one theme choice. The editor's own rules still resolve
 * because they are still inside that scope — one level further out than
 * before.
 *
 * Used by both the brand-scope page and the standalone /tools/bento page. When
 * `brand` is null the page still renders, with neutral defaults, and the
 * brand-only actions are disabled.
 */
export function BentoEditor({ brand, extraLeft }: Props) {
  const design = useBentoStore((s) => s.design);
  const selectedTileId = useBentoStore((s) => s.selectedTileId);
  const setTemplate = useBentoStore((s) => s.setTemplate);
  const selectTile = useBentoStore((s) => s.selectTile);
  const updateTile = useBentoStore((s) => s.updateTile);
  const shuffle = useBentoStore((s) => s.shuffle);
  const undo = useBentoStore((s) => s.undo);
  const redo = useBentoStore((s) => s.redo);
  const init = useBentoStore((s) => s.init);

  const assets = useService<IAssetsService>(SERVICE_KEYS.ASSETS);

  const canvasRef = useRef<BentoCanvasHandle>(null);

  const [pending, setPending] = useState<PendingUpload | null>(null);
  const [mediaOpen, setMediaOpen] = useState<{ tileId: string | null } | null>(null);

  // Init on brand change.
  useEffect(() => {
    init(brand ?? null);
  }, [brand?.id, init, brand]);

  // Hotkeys: ⌘Z / ⇧⌘Z, Backspace=deselect
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if (!inField && (e.key === 'Escape')) selectTile(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, selectTile]);

  // ─── Image upload pipeline ───────────────────────────────────────────
  const readFileAsDataUrl = async (file: File): Promise<string> => {
    const { validateUploadFile, compressAsset } = await import('@/shared/utils/imageUpload');
    const v = validateUploadFile(file, { maxSizeMB: 10 });
    if (!v.valid) throw new Error(v.error ?? 'Invalid file');
    return file.type.startsWith('image/') ? compressAsset(file) : '';
  };

  const handleImageDropped = useCallback(async (tileId: string, file: File) => {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (!dataUrl) return;
      setPending({ tileId, dataUrl, fileName: file.name, fileSize: file.size });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Image upload failed');
    }
  }, []);

  const handleStockPick = useCallback(async (tileId: string, photo: StockPhoto) => {
    try {
      toast.loading(`Fetching from ${photo.provider}…`, { id: 'stock' });
      const dataUrl = await fetchPhotoAsDataUrl(photo);
      toast.dismiss('stock');
      setPending({
        tileId,
        dataUrl,
        fileName: `${photo.provider}-${photo.id}-by-${photo.author.replace(/\s+/g, '-')}.jpg`,
        fileSize: 0,
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch photo', { id: 'stock' });
    }
  }, []);

  /** Unified handler for the MediaPicker dialog. */
  const handleMediaPick = useCallback(async (tileId: string | null, result: MediaPickResult) => {
    setMediaOpen(null);

    // If no tile was in focus, spawn a new user-image tile and target that.
    let targetTileId = tileId;
    if (!targetTileId) {
      // Find first empty cell; otherwise append.
      const state = useBentoStore.getState();
      state.addTile('user-image', brand ?? null);
      const tiles = useBentoStore.getState().design.tiles;
      targetTileId = tiles[tiles.length - 1]?.id ?? null;
      if (!targetTileId) return;
    }

    if (result.kind === 'asset') {
      // Directly apply brand asset — no upload prompt needed.
      updateTile(targetTileId, { kind: 'asset-image', content: { assetId: result.asset.id } });
      toast.success('Asset applied');
      return;
    }

    if (result.kind === 'file') {
      try {
        const dataUrl = await readFileAsDataUrl(result.file);
        if (!dataUrl) return;
        setPending({ tileId: targetTileId, dataUrl, fileName: result.file.name, fileSize: result.file.size });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed');
      }
      return;
    }

    if (result.kind === 'stock') {
      void handleStockPick(targetTileId, result.photo);
    }
  }, [brand, updateTile, handleStockPick]);

  const handleConfirmUpload = useCallback(async ({ saveToBrand, assetName }: { saveToBrand: boolean; assetName: string }) => {
    if (!pending) return;
    const { tileId, dataUrl, fileSize, fileName } = pending;

    if (saveToBrand && brand) {
      try {
        // Into the BRAND LIBRARY, the one authoritative asset store. Writing
        // the legacy `assets` array through `brandStore.update` would put asset
        // truth back on the brand record, where the read-only projection cannot
        // see it — the tile would reference an id absent from `brandAssets`
        // until an ingest ran.
        const created = await assets.create({
          brandId: brand.id,
          name: assetName || fileName.replace(/\.[^.]+$/, ''),
          type: 'image',
          category: 'photo',
          source: 'upload',
          url: dataUrl,
          size: fileSize,
          tags: ['bento'],
          metadata: { originalName: fileName },
          origin: 'uploaded',
        });
        // Re-project so every other mounted surface resolves the new asset
        // without a reload.
        await useBrandStore.getState().reprojectLibrary(brand.id);
        updateTile(tileId, { kind: 'asset-image', content: { assetId: created.id } });
        toast.success('Added to brand assets');
      } catch (err) {
        console.error(err);
        toast.error('Failed to save to brand. Keeping as one-time.');
        updateTile(tileId, { kind: 'user-image', content: { dataUrl } });
      }
    } else {
      // One-time use — store data URL inline.
      updateTile(tileId, { kind: 'user-image', content: { dataUrl } });
      toast.success('Image added');
    }
    setPending(null);
  }, [pending, brand, updateTile, assets]);

  // ─── Export ──────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    const el = canvasRef.current?.getExportElement();
    if (!el) { toast.error('Canvas not ready'); return; }
    try {
      toast.loading('Exporting PNG…', { id: 'export' });
      const { default: html2canvas } = await import('html2canvas');
      const { width, height } = resolveSize(design.sizeId, design.customSize);
      const canvas = await html2canvas(el, {
        backgroundColor: design.backgroundColor,
        width,
        height,
        windowWidth: width,
        windowHeight: height,
        scale: 1,
        useCORS: true,
      });
      const blob: Blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/png'),
      );
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `bento-${(brand?.slug ?? 'design')}-${design.sizeId}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('PNG exported', { id: 'export' });
    } catch (err) {
      console.error(err);
      toast.error('Export failed', { id: 'export' });
    }
  }, [design.sizeId, design.customSize, design.backgroundColor, brand]);

  // ─── Save to brand ───────────────────────────────────────────────────
  // For v1 the bento is ephemeral; save is a stub that notifies.
  const handleSave = useCallback(() => {
    if (!brand) return;
    toast.message('Save coming soon', { description: 'Full "Save & Share" will land in the next update.' });
  }, [brand]);

  const selectedTile = design.tiles.find((t) => t.id === selectedTileId) ?? null;
  const { width, height, name: sizeName } = resolveSize(design.sizeId, design.customSize);

  return (
    <WorkspaceShell
      rightActions={
        <BentoActions
          onShuffle={(mode) => shuffle(brand ?? null, mode)}
          onExport={handleExport}
          onSave={brand ? handleSave : undefined}
          canSave={!!brand}
          onOpenMedia={() => setMediaOpen({ tileId: null })}
        />
      }
    >
      <div className="bento-shell">
        {/*
          The page header. Slim on purpose: this is an app shell, and every
          pixel it takes comes off the canvas. It carries what a header is for
          — what this page is, and one line on what it does — and nothing else.
          The actions are in the shell's bar above, which is where every other
          tool in the product puts them.
        */}
        <header className="bento-head">
          <div className="bento-head-titles">
            <h1 className="bento-title">Bento</h1>
            <p className="bento-lede">
              Compose a bento-grid graphic from {brand ? brand.name : 'a brand'}&rsquo;s logo,
              colours, type and photos, then export it as a PNG.
            </p>
          </div>
          {extraLeft && <div className="bento-head-aside">{extraLeft}</div>}
          <p className="bento-head-meta">
            {sizeName} · {width}&times;{height}
          </p>
        </header>

        <div className="bento-work">
          <TemplateRail
            selectedId={design.templateId}
            onSelect={(id) => setTemplate(id, brand ?? null)}
          />
          <BentoCanvas
            ref={canvasRef}
            design={design}
            brand={brand}
            selectedTileId={selectedTileId}
            onSelectTile={selectTile}
            onImageDropped={handleImageDropped}
          />
          <BentoInspector
            tile={selectedTile}
            brand={brand}
            onOpenMedia={(tileId) => setMediaOpen({ tileId: tileId || null })}
          />
        </div>
      </div>

      <ImageUploadPrompt
        pending={pending}
        onClose={() => setPending(null)}
        onConfirm={handleConfirmUpload}
        brandSaveDisabled={!brand}
      />

      <MediaPicker
        open={!!mediaOpen}
        onClose={() => setMediaOpen(null)}
        brand={brand}
        defaultQuery={brand?.name ?? brand?.tone}
        onPick={(result) => void handleMediaPick(mediaOpen?.tileId ?? null, result)}
      />
    </WorkspaceShell>
  );
}
