// components/TypescaleEditor.tsx
import { useEffect, useState } from 'react';
import type { Typescale } from '@/shared/types/typescale';
import { useTypescaleDraft } from '../hooks/useTypescaleDraft';
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

export function TypescaleEditor({ variant, brandId, initial, onClose, showBrandSync }: Props) {
  const { draft, update } = useTypescaleDraft(brandId, initial);
  const [activeSurface, setActiveSurface] = useState(initial.activeSurface);

  useEffect(() => { update(p => ({ ...p, activeSurface })); }, [activeSurface, update]);

  if (variant === 'compact') {
    return (
      <div className="flex flex-col gap-4">
        {showBrandSync && brandId && <BrandSyncBar brandId={brandId} />}
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

  return (
    <div className="grid h-full w-full grid-cols-[18rem_minmax(0,1fr)_22rem] gap-4">
      <aside className="space-y-4">
        <FontPairPanel draft={draft} onChange={update} />
      </aside>
      <main className="space-y-4">
        {showBrandSync && brandId && <BrandSyncBar brandId={brandId} />}
        <SurfaceTabs value={activeSurface} onChange={setActiveSurface} surfaces={draft.surfaces} />
        <PreviewTabs draft={draft} activeSurface={activeSurface} />
      </main>
      <aside className="space-y-4">
        <ScaleControls surface={draft.surfaces[activeSurface]} onChange={(next) => update(p => ({ ...p, surfaces: { ...p.surfaces, [activeSurface]: next } }))} />
        <SemanticMap surface={draft.surfaces[activeSurface]} onChange={(next) => update(p => ({ ...p, surfaces: { ...p.surfaces, [activeSurface]: next } }))} />
        <ExportPanel draft={draft} mode={brandId ? 'in-app' : 'public'} />
      </aside>
    </div>
  );
}
