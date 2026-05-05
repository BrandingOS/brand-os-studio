// EditorGenerateVariantsButton — Phase 5.1a.
//
// Lives in the editor's top chrome between Save-as-template and Export.
// Click → inline popover with multi-select preset checkboxes →
// generateResizeVariants(doc, selectedPresets) → IDesignStorage.saveDesign
// for each variant + the source (now stamped with familyId). User stays
// on the source design; toast confirms with a quick link to My Designs.
//
// Reflow strategy in 5.1a is dumb-clone proportional scaling. 5.2 wires
// the AI reflow engine in place of generateResizeVariants without
// touching this component.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { SERVICE_KEYS } from '@/core';
import { container as serviceContainer } from '@/core/container/ServiceContainer';
import type { IDesignStorage } from '@/core/types/services';
import type { IFormatPresetsService, FormatPreset } from '@/core/services/IFormatPresetsService';
import type { BrandOSDocument } from '@/features/editor/schema';
import {
  generateResizeVariants,
  variantName,
} from '@/features/editor/variants/generateResizeVariants';

interface Props {
  /** Lazy doc accessor — read fresh on submit so unsaved edits land in
   *  every variant. */
  getDoc: () => BrandOSDocument;
  /** Brand id the source design lives under. Variants persist under the
   *  same brand. Null = standalone (no brand) — variant generation is
   *  disabled in that case since IDesignStorage is brand-scoped. */
  brandId: string | null;
  /** Brand slug for the post-generate "view My Designs" link. Optional;
   *  when absent the toast omits the link. */
  brandSlug?: string;
  /** Source design name (for variant naming and the toast). */
  sourceName?: string;
  /** Optional thumbnail data URI captured by the caller. Used as the
   *  initial thumbnailUrl on each variant's metadata so My Designs has
   *  something to render. */
  getThumbnailUrl?: () => string | undefined;
}

export function EditorGenerateVariantsButton({
  getDoc, brandId, brandSlug, sourceName, getThumbnailUrl,
}: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Phase 5.1b — presets come from IFormatPresetsService instead of
  // reading ContentTypeConfig directly. Local impl wraps the same
  // hardcoded data; Supabase impl will read the format_presets table.
  // Async fetch on popover open; clear when popover closes.
  const [presets, setPresets] = useState<FormatPreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setPresets([]);
      setSelectedLabels(new Set());
      return;
    }
    let cancelled = false;
    const svc = serviceContainer.has(SERVICE_KEYS.FORMAT_PRESETS)
      ? serviceContainer.get<IFormatPresetsService>(SERVICE_KEYS.FORMAT_PRESETS)
      : null;
    if (!svc) {
      setPresets([]);
      return;
    }
    setPresetsLoading(true);
    let doc: BrandOSDocument;
    try {
      doc = getDoc();
    } catch {
      setPresets([]);
      setPresetsLoading(false);
      return;
    }
    void svc.listForContentType(doc.contentType).then((all) => {
      if (cancelled) return;
      // Filter presets that match the source's current dimensions —
      // generating an "identical" variant is a no-op the user doesn't
      // want. The source's first page is the reference.
      const sourceWidth = doc.pages[0]?.width;
      const sourceHeight = doc.pages[0]?.height;
      const filtered = all.filter(
        (p) => p.width !== sourceWidth || p.height !== sourceHeight,
      );
      setPresets(filtered);
      setPresetsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, getDoc]);

  // Close on outside-click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const toggle = useCallback((label: string) => {
    setSelectedLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  const submit = useCallback(async () => {
    if (selectedLabels.size === 0) {
      toast.error('Pick at least one format to generate.');
      return;
    }
    if (!brandId) {
      toast.error('Open this design inside a brand to generate variants.');
      return;
    }
    const designStorage = serviceContainer.has(SERVICE_KEYS.DESIGN_STORAGE)
      ? serviceContainer.get<IDesignStorage>(SERVICE_KEYS.DESIGN_STORAGE)
      : null;
    if (!designStorage) {
      toast.error('Design storage is not configured.');
      return;
    }

    const doc = getDoc();
    const targets = presets.filter((p) => selectedLabels.has(p.label));
    if (targets.length === 0) return;

    setBusy(true);
    try {
      const { familyId, sourceWithFamily, variants } = generateResizeVariants({
        source: doc,
        targets,
      });

      // Persist source (with new familyId) + every variant under the
      // same brand. Each variant gets the source's content-type and a
      // human-readable name like "Source Name — Story 9:16".
      const thumb = getThumbnailUrl?.();
      const baseName = sourceName ?? 'Untitled';

      // Save source first so its familyId is durable. If a variant
      // save fails midway, the source's stamp still anchors the
      // family for whatever variants did persist.
      await designStorage.saveDesign(brandId, sourceWithFamily.id, sourceWithFamily, {
        id: sourceWithFamily.id,
        name: baseName,
        thumbnailUrl: thumb,
        contentType: sourceWithFamily.contentType,
        width: sourceWithFamily.pages[0]?.width,
        height: sourceWithFamily.pages[0]?.height,
        familyId,
      });

      for (let i = 0; i < variants.length; i += 1) {
        const v = variants[i];
        const target = targets[i];
        await designStorage.saveDesign(brandId, v.id, v, {
          id: v.id,
          name: variantName(baseName, target),
          thumbnailUrl: thumb,
          contentType: v.contentType,
          width: v.pages[0]?.width,
          height: v.pages[0]?.height,
          familyId,
          sourceTemplateId: undefined,
          sourceDesignId: v.sourceDesignId,
        });
      }

      const count = variants.length;
      toast.success(
        `Generated ${count} variant${count === 1 ? '' : 's'}.`,
        {
          description: brandSlug
            ? 'Open them from your designs library to refine.'
            : undefined,
          action: brandSlug
            ? {
                label: 'View',
                onClick: () => navigate(`/b/${brandSlug}/templates?tab=my-designs`),
              }
            : undefined,
        },
      );
      setOpen(false);
    } catch (err) {
      console.error('[EditorGenerateVariantsButton] generation failed:', err);
      toast.error('Could not generate variants — please try again.');
    } finally {
      setBusy(false);
    }
  }, [brandId, brandSlug, getDoc, getThumbnailUrl, navigate, presets, selectedLabels, sourceName]);

  return (
    <div className="relative">
      <button
        type="button"
        data-generate-variants-button
        onClick={() => setOpen((v) => !v)}
        aria-label="Generate variants"
        title="Generate brand-aware variants in other formats"
        className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted/30"
        style={{ borderColor: 'var(--border)' }}
        disabled={!brandId}
      >
        <Sparkles size={14} aria-hidden />
        <span className="hidden sm:inline">Variants</span>
      </button>

      {open ? (
        <div
          ref={popoverRef}
          data-generate-variants-popover
          className="absolute right-0 top-full mt-1 w-72 rounded-md border bg-background shadow-md z-50"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: 'var(--border)' }}>
            <span className="text-[12px] font-semibold">Generate variants</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          </div>

          {presetsLoading ? (
            <div className="p-4 text-[11px] text-muted-foreground" data-generate-variants-loading>
              Loading formats…
            </div>
          ) : presets.length === 0 ? (
            <div className="p-4 text-[11px] text-muted-foreground" data-generate-variants-empty>
              No alternate formats are configured for this content type.
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto p-2">
              {presets.map((p) => {
                const checked = selectedLabels.has(p.label);
                return (
                  <button
                    key={p.id}
                    type="button"
                    data-generate-variants-preset={p.label}
                    onClick={() => toggle(p.label)}
                    className="w-full flex items-center justify-between rounded px-2 py-1.5 text-left text-[12px] hover:bg-muted/30"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="flex h-3.5 w-3.5 items-center justify-center rounded border"
                        style={{
                          borderColor: checked ? 'var(--accent)' : 'var(--border)',
                          background: checked ? 'var(--accent)' : 'transparent',
                          color: checked ? 'var(--accent-contrast, white)' : 'transparent',
                        }}
                        aria-hidden
                      >
                        {checked ? <Check size={10} strokeWidth={3} /> : null}
                      </span>
                      <span>{p.label}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {p.width} × {p.height}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t px-3 py-2" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11px] px-2 py-1 rounded text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              data-generate-variants-submit
              onClick={() => void submit()}
              disabled={busy || selectedLabels.size === 0 || presets.length === 0}
              className="pill-btn pill-btn--primary text-[11px] px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy
                ? 'Generating…'
                : `Generate ${selectedLabels.size || ''}`.trim()}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
