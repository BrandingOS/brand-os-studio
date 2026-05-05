// EditorRepublishFamilyButton — Phase 5.3b.
//
// Top-chrome button visible only when the active doc is a family
// SOURCE (familyId set, no sourceDesignId). One click → confirmation
// toast → re-runs generateResizeVariants from current source state →
// overwrites each existing variant under its existing id.
//
// Destructive semantics (v1): variant edits are clobbered. Smart-merge
// (preserve variant transforms / per-variant edits) is 5.3c.

import { useCallback, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { SERVICE_KEYS } from '@/core';
import { container as serviceContainer } from '@/core/container/ServiceContainer';
import type { IDesignStorage } from '@/core/types/services';
import type { BrandOSDocument } from '@/features/editor/schema';
import { getContentTypeConfig } from '@/features/editor/content-types';
import {
  republishFamilyFromSource,
} from '@/features/editor/variants/republishFamilyFromSource';
import { variantName } from '@/features/editor/variants/generateResizeVariants';

interface Props {
  /** Lazy doc accessor — read fresh on click. */
  getDoc: () => BrandOSDocument;
  brandId: string | null;
  /** Source name for variant naming after republish. */
  sourceName?: string;
}

export function EditorRepublishFamilyButton({ getDoc, brandId, sourceName }: Props) {
  const [busy, setBusy] = useState(false);

  const onClick = useCallback(async () => {
    const source = getDoc();
    if (!source.familyId) {
      toast.error('No family yet — generate variants first.');
      return;
    }
    if (source.sourceDesignId) {
      toast.error('Open the family source to republish — this is a variant.');
      return;
    }
    if (!brandId) {
      toast.error('Open this design inside a brand to republish.');
      return;
    }
    const designStorage = serviceContainer.has(SERVICE_KEYS.DESIGN_STORAGE)
      ? serviceContainer.get<IDesignStorage>(SERVICE_KEYS.DESIGN_STORAGE)
      : null;
    if (!designStorage) {
      toast.error('Design storage is not configured.');
      return;
    }

    // Fetch the existing family — every doc with the same familyId.
    const all = await designStorage.listDesigns(brandId);
    const family = all.filter((d) => d.familyId === source.familyId);
    const variantSummaries = family.filter((d) => d.id !== source.id);

    if (variantSummaries.length === 0) {
      toast.message('No variants to republish.', {
        description: 'This family only has the source. Generate variants first.',
      });
      return;
    }

    // Two-step UX: ask for confirmation via toast.action since the
    // republish overwrites variant bodies. v1 is destructive — keep
    // the user in the loop.
    toast.warning(
      `Republish ${variantSummaries.length} variant${variantSummaries.length === 1 ? '' : 's'}?`,
      {
        description:
          'Each variant\'s layout will rebuild from the current source. ' +
          'Any edits you made to individual variants will be overwritten.',
        action: {
          label: 'Republish',
          onClick: () => void doRepublish(),
        },
        duration: 8000,
      },
    );

    async function doRepublish() {
      setBusy(true);
      try {
        // Load each variant's full doc body.
        const existingVariants: BrandOSDocument[] = [];
        for (const summary of variantSummaries) {
          const doc = await designStorage.loadDesign(brandId, summary.id);
          if (doc) existingVariants.push(doc as BrandOSDocument);
        }
        if (existingVariants.length === 0) {
          toast.error('Could not load any variant docs to republish.');
          return;
        }

        // Resolve preset labels via the source's content-type config
        // when possible — gives variants their original "Story 9:16"
        // names back instead of fallback "1080×1920".
        const cfg = (() => {
          try {
            return getContentTypeConfig(source.contentType);
          } catch {
            return null;
          }
        })();
        const resolvePresetLabel = (w: number, h: number): string | null => {
          const match = cfg?.dimensionPresets.find(
            (p) => p.width === w && p.height === h,
          );
          return match?.label ?? null;
        };

        const result = await republishFamilyFromSource({
          source,
          existingVariants,
          resolvePresetLabel,
        });

        // Persist source first (familyId stamp re-applied), then each
        // rebuilt variant under its preserved id.
        const baseName = sourceName ?? 'Untitled';
        await designStorage.saveDesign(brandId, result.source.id, result.source, {
          id: result.source.id,
          name: baseName,
          contentType: result.source.contentType,
          width: result.source.pages[0]?.width,
          height: result.source.pages[0]?.height,
          familyId: result.source.familyId,
        });

        for (let i = 0; i < result.variants.length; i += 1) {
          const v = result.variants[i];
          const label = result.presetLabels[i];
          const dimensionPreset = { label, width: v.pages[0]!.width, height: v.pages[0]!.height };
          await designStorage.saveDesign(brandId, v.id, v, {
            id: v.id,
            name: variantName(baseName, dimensionPreset),
            contentType: v.contentType,
            width: dimensionPreset.width,
            height: dimensionPreset.height,
            familyId: v.familyId,
            sourceDesignId: v.sourceDesignId,
          });
        }

        toast.success(
          `Republished ${result.variants.length} variant${result.variants.length === 1 ? '' : 's'}.`,
          { description: 'Variant layouts rebuilt from the current source.' },
        );
      } catch (err) {
        console.error('[EditorRepublishFamilyButton] republish failed:', err);
        toast.error('Could not republish variants — please try again.');
      } finally {
        setBusy(false);
      }
    }
  }, [brandId, getDoc, sourceName]);

  return (
    <button
      type="button"
      data-republish-family-button
      onClick={() => void onClick()}
      disabled={busy}
      aria-label="Republish family from source"
      title="Rebuild every variant in this family from the current source state"
      className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted/30 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ borderColor: 'var(--border)' }}
    >
      <RefreshCw size={14} aria-hidden />
      <span className="hidden sm:inline">{busy ? 'Republishing…' : 'Republish'}</span>
    </button>
  );
}
