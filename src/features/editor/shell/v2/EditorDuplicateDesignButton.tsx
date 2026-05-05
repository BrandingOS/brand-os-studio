// EditorDuplicateDesignButton — Phase 7.5.
//
// Lives in the editor's top chrome between Save-as-template and the
// AI prompt area. Click → write a new IDesignStorage entry copying
// the current doc body (with a fresh design id and "Copy of …" name),
// then navigate to the new editor URL. Brand-scoped — disabled when
// there's no brand context.

import { useCallback, useState } from 'react';
import { Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SERVICE_KEYS } from '@/core';
import { container as serviceContainer } from '@/core/container/ServiceContainer';
import type { IDesignStorage } from '@/core/types/services';
import type { BrandOSDocument } from '@/features/editor/schema';

interface Props {
  /** Lazy doc accessor — read fresh on click. */
  getDoc: () => BrandOSDocument;
  brandId: string;
  brandSlug: string;
  sourceName?: string;
}

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

export function EditorDuplicateDesignButton({
  getDoc, brandId, brandSlug, sourceName,
}: Props) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const onClick = useCallback(async () => {
    if (busy) return;
    if (!serviceContainer.has(SERVICE_KEYS.DESIGN_STORAGE)) return;
    setBusy(true);
    try {
      const ds = serviceContainer.get<IDesignStorage>(SERVICE_KEYS.DESIGN_STORAGE);
      const doc = getDoc();
      const baseName = sourceName ?? (doc.metadata?.name as string | undefined) ?? 'Untitled design';
      const newName = `Copy of ${baseName}`;
      const newId = `${slugify(newName)}-${Date.now().toString(36)}`;
      // Copy the doc body, give it a fresh inner id + name so it's
      // recognized as a distinct design. Variants/family pointers are
      // intentionally NOT carried over — a duplicate is its OWN design,
      // not a sibling variant.
      const next: BrandOSDocument = {
        ...doc,
        id: crypto.randomUUID(),
        metadata: {
          ...(doc.metadata ?? {}),
          name: newName,
        },
      } as BrandOSDocument;
      // Strip family lineage so the duplicate doesn't get bulk-
      // republished alongside the source's variants.
      delete (next as { familyId?: string }).familyId;
      delete (next as { sourceDesignId?: string }).sourceDesignId;

      await ds.saveDesign(brandId, newId, next, {
        name: newName,
        contentType: doc.contentType,
        width: doc.pages[0]?.width,
        height: doc.pages[0]?.height,
      });
      toast.success(`Duplicated as "${newName}"`);
      navigate(`/b/${brandSlug}/design/${newId}`);
    } catch (err) {
      console.error('[EditorDuplicateDesignButton] failed:', err);
      toast.error('Could not duplicate this design.');
    } finally {
      setBusy(false);
    }
  }, [busy, getDoc, brandId, brandSlug, sourceName, navigate]);

  return (
    <button
      type="button"
      data-duplicate-design-button
      onClick={() => void onClick()}
      disabled={busy}
      aria-label="Duplicate design"
      title="Duplicate design"
      className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted/30 disabled:opacity-50"
      style={{ borderColor: 'var(--border)' }}
    >
      <Copy className="h-3.5 w-3.5" aria-hidden />
      <span className="hidden sm:inline">{busy ? 'Duplicating…' : 'Duplicate'}</span>
    </button>
  );
}
