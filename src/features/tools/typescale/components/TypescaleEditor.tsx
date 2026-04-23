// components/TypescaleEditor.tsx
import { useCallback, useEffect, useState } from 'react';
import type { Typescale } from '@/shared/types/typescale';
import { useBrandStore } from '@/shared/store/brandStore';
import { useTypescaleDraft } from '../hooks/useTypescaleDraft';
import { seedTypescale } from '../hooks/useSeedTypescale';
import {
  buildLadder,
  toFluid,
  DEFAULT_SURFACES,
  defaultSemanticMap,
} from '../engine';
import { FontPairPanel } from './FontPairPanel';
import { SurfaceTabs } from './SurfaceTabs';
import { ScaleControls } from './ScaleControls';
import { SemanticMap } from './SemanticMap';
import { PreviewTabs } from './preview/PreviewTabs';
import { ExportPanel } from './ExportPanel';
import { BrandSyncBar } from './BrandSyncBar';

interface Props {
  variant: 'full' | 'compact';
  brandId?: string;
  initial: Typescale;
  onClose?: () => void;
  showBrandSync?: boolean;
}

/**
 * TypescaleEditor
 *
 * Two variants:
 *   • `full` — the standalone tool page. Renders the cosmos `.shell`
 *     grid directly (left `.panel` sidebar + right `.ts-board`). The
 *     hosting page is expected to wrap this in <CosmosWorkspaceShell>.
 *   • `compact` — rendered inside <EmbeddedTypescaleDialog>. Keeps the
 *     old minimal column layout; the dialog owns the chrome.
 *
 * Brand font cascade: when used in-app the board surfaces the brand
 * display+body families via CSS variables so the right-hand preview
 * inherits the same families the showcases do.
 */
export function TypescaleEditor({ variant, brandId, initial, onClose, showBrandSync }: Props) {
  const { draft, update } = useTypescaleDraft(brandId, initial);
  const [activeSurface, setActiveSurface] = useState(initial.activeSurface);

  useEffect(() => { update(p => ({ ...p, activeSurface })); }, [activeSurface, update]);

  const brand = useBrandStore(s =>
    brandId ? s.list.find(b => b.id === brandId) ?? null : null,
  );

  const handlePullFromBrand = useCallback(() => {
    if (!brand) return;
    const next = seedTypescale(brand);
    update(() => next);
  }, [brand, update]);

  const handleResetActiveSurface = useCallback(() => {
    const def = DEFAULT_SURFACES[activeSurface];
    let steps = buildLadder({
      basePx: def.basePx,
      ratio: def.ratio.value,
      stepsUp: def.stepsUp,
      stepsDown: def.stepsDown,
      leading: def.leading,
      tracking: def.tracking,
    });
    if (activeSurface === 'web' && def.fluid) {
      steps = steps.map(st => toFluid(st, def.fluid!));
    }
    update(p => ({
      ...p,
      surfaces: {
        ...p.surfaces,
        [activeSurface]: {
          key: activeSurface,
          ...def,
          steps,
          semantic: defaultSemanticMap(activeSurface, steps),
        },
      },
    }));
  }, [activeSurface, update]);

  if (variant === 'compact') {
    return (
      <div className="flex flex-col gap-4">
        {showBrandSync && brandId && (
          <BrandSyncBar
            brandId={brandId}
            onPullFromBrand={handlePullFromBrand}
            onResetActiveSurface={handleResetActiveSurface}
          />
        )}
        <FontPairPanel draft={draft} onChange={update} compact />
        <SurfaceTabs value={activeSurface} onChange={setActiveSurface} surfaces={draft.surfaces} />
        <ScaleControls surface={draft.surfaces[activeSurface]} onChange={(next) => update(p => ({ ...p, surfaces: { ...p.surfaces, [activeSurface]: next } }))} compact />
        <PreviewTabs draft={draft} activeSurface={activeSurface} defaultTab="ladder" />
        {onClose && (
          <div className="flex justify-end">
            <button
              type="button"
              className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        )}
      </div>
    );
  }

  const boardTitle = brand?.name ? `${brand.name} typescale` : 'Public typescale';
  const headingFamily = `"${draft.fonts.heading.family}", ${draft.fonts.heading.fallback}`;
  const bodyFamily = `"${draft.fonts.body.family}", ${draft.fonts.body.fallback}`;
  const brandFontStyles = {
    ['--brand-font-display' as string]: headingFamily,
    ['--brand-font-body' as string]: bodyFamily,
  } as React.CSSProperties;

  return (
    <div className="shell" style={brandFontStyles}>
      <aside className="panel" aria-label="Typescale editor">
        <div className="panel-top">
          <div className="panel-heading">
            <span className="panel-heading-eyebrow">Typescale</span>
            <h1 className="panel-heading-title">Build your typography</h1>
          </div>
          <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--text-muted)', margin: 0 }}>
            Pick fonts, tune the scale per surface, export to every format your team uses.
          </p>
        </div>

        <div className="ts-panel-body">
          <FontPairPanel draft={draft} onChange={update} />

          <div className="ts-section">
            <div className="ts-section-head" aria-hidden>
              <span className="ts-section-title">Surface</span>
            </div>
            <div className="ts-section-body">
              <SurfaceTabs
                value={activeSurface}
                onChange={setActiveSurface}
                surfaces={draft.surfaces}
              />
            </div>
          </div>

          <ScaleControls
            surface={draft.surfaces[activeSurface]}
            onChange={(next) =>
              update(p => ({ ...p, surfaces: { ...p.surfaces, [activeSurface]: next } }))
            }
          />

          <SemanticMap
            surface={draft.surfaces[activeSurface]}
            onChange={(next) =>
              update(p => ({ ...p, surfaces: { ...p.surfaces, [activeSurface]: next } }))
            }
          />
        </div>
      </aside>

      <main className="ts-board">
        {showBrandSync && brandId && (
          <BrandSyncBar
            brandId={brandId}
            onPullFromBrand={handlePullFromBrand}
            onResetActiveSurface={handleResetActiveSurface}
          />
        )}
        <div className="ts-board-head">
          <h2 className="ts-board-title">{boardTitle}</h2>
        </div>
        <PreviewTabs draft={draft} activeSurface={activeSurface} />
        <ExportPanel draft={draft} mode={brandId ? 'in-app' : 'public'} />
      </main>
    </div>
  );
}
