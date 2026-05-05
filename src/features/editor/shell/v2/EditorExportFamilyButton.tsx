// EditorExportFamilyButton — Phase 5.4.
//
// Top-chrome button visible only when the active doc has a `familyId`
// (i.e. it's part of a generated variant family). One click → fetches
// every family member from IDesignStorage → builds a ZIP via
// buildFamilyZip → triggers a browser download.
//
// JSON-only in 5.4a. PNG / PDF rendering needs headless canvas
// infrastructure that doesn't exist yet — deliberately deferred.

import { useCallback, useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { SERVICE_KEYS } from '@/core';
import { container as serviceContainer } from '@/core/container/ServiceContainer';
import type { IDesignStorage } from '@/core/types/services';
import type { BrandOSDocument } from '@/features/editor/schema';
import {
  exportFamilyAsZip,
  triggerDownload,
} from '@/features/editor/variants/exportFamily';

interface Props {
  /** Lazy doc accessor — read fresh on click. */
  getDoc: () => BrandOSDocument;
  brandId: string | null;
  /** Source design name for the ZIP filename. */
  sourceName?: string;
}

export function EditorExportFamilyButton({ getDoc, brandId, sourceName }: Props) {
  const [busy, setBusy] = useState(false);

  const onClick = useCallback(async () => {
    const doc = getDoc();
    if (!doc.familyId) {
      // Should not be reachable — caller hides the button when familyId
      // is absent. Defensive in case the doc loses familyId at runtime.
      toast.error('This design is not part of a family yet — generate variants first.');
      return;
    }
    if (!brandId) {
      toast.error('Open this design inside a brand to export the family.');
      return;
    }
    const designStorage = serviceContainer.has(SERVICE_KEYS.DESIGN_STORAGE)
      ? serviceContainer.get<IDesignStorage>(SERVICE_KEYS.DESIGN_STORAGE)
      : null;
    if (!designStorage) {
      toast.error('Design storage is not configured.');
      return;
    }

    setBusy(true);
    try {
      const { blob, manifest } = await exportFamilyAsZip({
        designStorage,
        brandId,
        familyId: doc.familyId,
      });
      // Sanitize the source name into a filesystem-safe slug, then
      // suffix it with "-family". When we have no source name, drop
      // the leading slug entirely so the file is just "family.zip"
      // (avoids the "family-family.zip" double-naming).
      const slug = (sourceName ?? '')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 64);
      const filename = slug ? `${slug}-family.zip` : 'family.zip';
      triggerDownload(blob, filename);
      toast.success(
        `Exported ${manifest.members.length} design${manifest.members.length === 1 ? '' : 's'}.`,
        { description: filename },
      );
    } catch (err) {
      console.error('[EditorExportFamilyButton] export failed:', err);
      toast.error('Could not export family — please try again.');
    } finally {
      setBusy(false);
    }
  }, [brandId, getDoc, sourceName]);

  return (
    <button
      type="button"
      data-export-family-button
      onClick={() => void onClick()}
      disabled={busy}
      aria-label="Export family as ZIP"
      title="Export every variant in this family as a ZIP"
      className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted/30 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ borderColor: 'var(--border)' }}
    >
      <Download size={14} aria-hidden />
      <span className="hidden sm:inline">{busy ? 'Exporting…' : 'Family'}</span>
    </button>
  );
}
