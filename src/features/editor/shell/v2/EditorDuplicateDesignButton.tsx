// EditorDuplicateDesignButton — Phase 7.5. Task 11: master-aware.
//
// Lives in the editor's top chrome between Save-as-template and the
// AI prompt area. Click → write a new IDesignStorage entry copying
// the current doc body (with a fresh design id and "Copy of …" name),
// then navigate to the new editor URL. Brand-scoped — disabled when
// there's no brand context.
//
// Task 11: when the loaded document is a Brand Kit MASTER
// (`isTemplate` true), this same click must produce an ordinary
// WORKING design — never a second master — and reads to the user as
// "Use template" rather than "Duplicate", because that is exactly
// what Brand Kit's own Use Template action means. The saved copy
// carries `isTemplate: false` + `sourceTemplateId` pointing at the
// master it came from, both on the storage summary AND the doc body
// (mirroring how `masterTemplates.ts` stamps the master itself).

import { useCallback, useState } from 'react';
import { Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SERVICE_KEYS } from '@/core';
import { container as serviceContainer } from '@/core/container/ServiceContainer';
import type { IDesignStorage } from '@/core/types/services';
import type { BrandOSDocument } from '@/features/editor/schema';
import {
  duplicateDocument,
  instantiateFromMaster,
} from '@/features/editor/renderers/template-instance/createDocument';

interface Props {
  /** Lazy doc accessor — read fresh on click. */
  getDoc: () => BrandOSDocument;
  brandId: string;
  brandSlug: string;
  sourceName?: string;
  /** True when the loaded document is the canonical Brand Kit MASTER
   *  for its deliverable, not a working design. Changes both the
   *  button's label and what gets written on save — see file header. */
  isTemplate?: boolean;
}

export function EditorDuplicateDesignButton({
  getDoc, brandId, brandSlug, sourceName, isTemplate = false,
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
      // A master's copy is a fresh working design the user will fill in —
      // "Copy of X" reads like a duplicate; using the template's own name
      // reads like what it is (the same naming Brand Kit's own Use
      // Template action already uses).
      const newName = isTemplate ? baseName : `Copy of ${baseName}`;
      // ONE id: the document's own and the key it is stored under.
      // The editor page autosaves to `doc.id` but loads by the URL's
      // design slug, which is the storage key — so a design whose two
      // ids disagreed autosaved to a key nothing read, and a reload
      // restored the body from before the user's first edit. Every other
      // creator (Brand Kit's Use Template, ensureMasterDesign, the
      // Templates panel) uses one uuid for both; so does this now.
      const newId = crypto.randomUUID();
      // Deep copy, never a spread: a shallow copy leaves the new design
      // sharing every nested object — pages, layers, an invoice's line
      // items — with the design it came from. Family lineage is dropped
      // so a duplicate isn't bulk-republished with the source's variants.
      const copied =
        isTemplate && doc.body?.kind === 'template-instance'
          ? instantiateFromMaster(doc, newId)
          : duplicateDocument(doc, newId);
      const next: BrandOSDocument = {
        ...copied,
        metadata: {
          ...(copied.metadata ?? {}),
          name: newName,
          // Explicit, AFTER the spread: a master's own metadata carries
          // `isTemplate: true`, and that must never survive into the copy
          // — this is what makes the copy a working design instead of a
          // second master. `sourceTemplateId` names the CATALOG variant
          // when the master knew one (`instantiateFromMaster` carries it
          // across); a master with no such record falls back to naming
          // the design it was copied from.
          ...(isTemplate
            ? {
                isTemplate: false,
                sourceTemplateId: copied.metadata?.sourceTemplateId ?? doc.id,
              }
            : {}),
        },
      } as BrandOSDocument;

      await ds.saveDesign(brandId, newId, next, {
        name: newName,
        contentType: doc.contentType,
        width: doc.pages[0]?.width,
        height: doc.pages[0]?.height,
        ...(isTemplate
          ? {
              isTemplate: false,
              sourceTemplateId: next.metadata?.sourceTemplateId as string | undefined,
            }
          : {}),
      });
      toast.success(
        isTemplate
          ? `Added "${newName}" to My Designs`
          : `Duplicated as "${newName}"`,
      );
      navigate(`/b/${brandSlug}/design/${newId}`);
    } catch (err) {
      console.error('[EditorDuplicateDesignButton] failed:', err);
      toast.error(
        isTemplate
          ? 'Could not create a design from this template.'
          : 'Could not duplicate this design.',
      );
    } finally {
      setBusy(false);
    }
  }, [busy, getDoc, brandId, brandSlug, sourceName, isTemplate, navigate]);

  const label = isTemplate ? 'Use template' : 'Duplicate design';
  const busyLabel = isTemplate ? 'Adding…' : 'Duplicating…';
  const shortLabel = isTemplate ? 'Use template' : 'Duplicate';

  return (
    <button
      type="button"
      data-duplicate-design-button
      onClick={() => void onClick()}
      disabled={busy}
      aria-label={label}
      title={label}
      className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-[11px] font-medium hover:bg-muted/30 disabled:opacity-50 whitespace-nowrap shrink-0"
      style={{ borderColor: 'var(--border)' }}
    >
      <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="hidden sm:inline">{busy ? busyLabel : shortLabel}</span>
    </button>
  );
}
