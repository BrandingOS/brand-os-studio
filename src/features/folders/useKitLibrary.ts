/**
 * The Kit as a place in the brand, not as a second file manager.
 *
 * Kit is the curated, final set of brand deliverables. It is deliberately
 * NOT arbitrary storage:
 *
 *   Library  source assets and files
 *   Designs  creative work in progress
 *   Kit      approved final brand deliverables
 *
 * So there is no "upload files into Kit" action here. Upload is contextual to
 * a SLOT — Business Card, Letterhead, Favicon — and an uploaded file becomes
 * the version the brand owns for that slot, sitting beside whatever
 * BrandingOS generated rather than erasing it. Brand Core is never touched.
 *
 * Nothing is copied into the Library either. Exporting a deliverable hands
 * the user a file; it does not mint a second source of truth. "Save a copy to
 * Library" can exist later as an explicit action.
 *
 * State lives in the existing `useKitStore` / `KitStateRepository` (a single
 * JSONB blob), so folder membership and provenance cost no migration.
 */
import * as React from 'react';
import { toast } from 'sonner';
import type { Brand } from '@/shared/types/brand';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { useKitStore } from '@/features/brand-kit/kit/kitStore';
import { DELIVERABLES, aspectForType, type DeliverableDef } from '@/features/brand-kit/kit/registry';
import {
  approvedItems,
  candidateItems,
  itemOrigin,
  primaryItem,
  type DeliverableKey,
  type DeliverableRecord,
  type KitItem,
  type KitItemOrigin,
} from '@/features/brand-kit/kit/types';
import { renderKitPreview, templateForVariant } from '@/features/brand-kit/kit/preview';
import { snapshotTemplatePng } from '@/features/brand-kit/data/templateSnapshot';
import { downloadKitZip, slugifyName } from '@/features/brand-kit/data/kitExport';
import { putBrandFile } from '@/features/dam/useAssetLibrary';

/** One deliverable that actually exists, with the item currently standing for it. */
export interface KitEntry {
  def: DeliverableDef;
  record: DeliverableRecord;
  /** The primary approved item, else the top candidate. Never undefined. */
  item: KitItem;
  origin: KitItemOrigin;
  folderId: string | null;
  /** True when the slot is still awaiting approval. */
  inReview: boolean;
}

const SECTION_LABEL: Record<string, string> = {
  stationery: 'Stationery',
  social: 'Social',
  web: 'Web',
  'brand-guides': 'Brand guides',
  presentations: 'Presentations',
  animations: 'Animations',
};

export function sectionLabel(def: DeliverableDef): string {
  return SECTION_LABEL[def.sectionKey] ?? def.sectionKey;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Revoking immediately can beat the download in Safari; one tick is enough.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface KitLibrary {
  entries: KitEntry[];
  loading: boolean;
  /** Every slot, for the "add a deliverable" picker. */
  slots: DeliverableDef[];
  uploadInto: (key: DeliverableKey, file: File) => Promise<void>;
  setFolder: (key: DeliverableKey, folderId: string | null) => void;
  removeItem: (key: DeliverableKey, itemId: string) => void;
  downloadOne: (entry: KitEntry) => Promise<void>;
  downloadAll: (entries: KitEntry[]) => Promise<void>;
  busy: boolean;
}

export function useKitLibrary(brand: Brand | null | undefined): KitLibrary {
  const deliverables = useKitStore((s) => s.deliverables);
  const hydrate = useKitStore((s) => s.hydrate);
  const addUploadedItem = useKitStore((s) => s.addUploadedItem);
  const setFolderAction = useKitStore((s) => s.setFolder);
  const removeItemAction = useKitStore((s) => s.removeItem);

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const mockBrand = React.useMemo(() => (brand ? brandToMockBrand(brand) : null), [brand]);

  React.useEffect(() => {
    if (!brand || !mockBrand) return;
    let cancelled = false;
    setLoading(true);
    void hydrate(brand.id, mockBrand).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [brand, mockBrand, hydrate]);

  /**
   * A deliverable is IN the kit once it has something to show. Empty slots are
   * not listed: the Kit tab is the curated set, and 25 placeholder tiles would
   * turn it back into a catalogue. The slots stay reachable through the
   * add-a-deliverable picker.
   */
  const entries = React.useMemo<KitEntry[]>(() => {
    const out: KitEntry[] = [];
    for (const def of DELIVERABLES) {
      const record = deliverables[def.key];
      if (!record) continue;
      const approved = primaryItem(record);
      const item = approved ?? candidateItems(record)[0];
      if (!item) continue;
      out.push({
        def,
        record,
        item,
        origin: itemOrigin(item),
        folderId: record.folderId ?? null,
        inReview: !approved,
      });
    }
    return out;
  }, [deliverables]);

  const uploadInto = React.useCallback(
    async (key: DeliverableKey, file: File) => {
      if (!brand) return;
      setBusy(true);
      try {
        const { url, storagePath } = await putBrandFile(brand.id, file);
        addUploadedItem(key, {
          url,
          storagePath,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        });
        toast.success('Added to the kit');
      } catch {
        toast.error("Couldn't add that file to the kit");
      } finally {
        setBusy(false);
      }
    },
    [brand, addUploadedItem],
  );

  /** The rendered artwork for a generated item, ready to rasterise. */
  const elementFor = React.useCallback(
    (entry: KitEntry) => {
      if (!brand || !mockBrand) return null;
      const template = templateForVariant(entry.def, mockBrand, entry.item.variantId);
      return renderKitPreview(entry.def, template, entry.item.customization, brand, mockBrand);
    },
    [brand, mockBrand],
  );

  const downloadOne = React.useCallback(
    async (entry: KitEntry) => {
      // An uploaded deliverable IS a file — hand back exactly what was given,
      // never a screenshot of it.
      if (entry.origin === 'uploaded' && entry.item.upload) {
        const link = document.createElement('a');
        link.href = entry.item.upload.url;
        link.download = entry.item.upload.fileName;
        link.click();
        return;
      }
      const element = elementFor(entry);
      if (!element) {
        toast.error("That deliverable can't be exported yet");
        return;
      }
      setBusy(true);
      try {
        const blob = await snapshotTemplatePng(
          element,
          260,
          aspectForType(entry.def.templateType),
        );
        if (!blob) throw new Error('no blob');
        saveBlob(blob, `${slugifyName(entry.def.label)}.png`);
      } catch {
        toast.error("Couldn't export that deliverable");
      } finally {
        setBusy(false);
      }
    },
    [elementFor],
  );

  const downloadAll = React.useCallback(
    async (list: KitEntry[]) => {
      if (!mockBrand) return;
      setBusy(true);
      const toastId = toast.loading('Building the kit…');
      try {
        const extraFiles: Array<{ path: string; blob: Blob }> = [];
        for (const entry of list) {
          const dir = `deliverables/${slugifyName(sectionLabel(entry.def))}`;
          if (entry.origin === 'uploaded' && entry.item.upload) {
            const res = await fetch(entry.item.upload.url);
            extraFiles.push({
              path: `${dir}/${entry.item.upload.fileName}`,
              blob: await res.blob(),
            });
            continue;
          }
          const element = elementFor(entry);
          if (!element) continue;
          const blob = await snapshotTemplatePng(
            element,
            260,
            aspectForType(entry.def.templateType),
          );
          if (blob) extraFiles.push({ path: `${dir}/${slugifyName(entry.def.label)}.png`, blob });
        }
        await downloadKitZip(mockBrand, { extraFiles });
        toast.success('Kit downloaded', { id: toastId });
      } catch {
        toast.error("Couldn't build the kit", { id: toastId });
      } finally {
        setBusy(false);
      }
    },
    [mockBrand, elementFor],
  );

  return {
    entries,
    loading,
    slots: DELIVERABLES,
    uploadInto,
    setFolder: setFolderAction,
    removeItem: removeItemAction,
    downloadOne,
    downloadAll,
    busy,
  };
}

/** Exposed for the tile, which paints the same artwork the export rasterises. */
export function useKitPreviewElement(brand: Brand | null | undefined, entry: KitEntry) {
  const mockBrand = React.useMemo(() => (brand ? brandToMockBrand(brand) : null), [brand]);
  return React.useMemo(() => {
    if (!brand || !mockBrand) return null;
    if (entry.origin === 'uploaded') return null;
    const template = templateForVariant(entry.def, mockBrand, entry.item.variantId);
    return renderKitPreview(entry.def, template, entry.item.customization, brand, mockBrand);
  }, [brand, mockBrand, entry]);
}

export { approvedItems };
