// PreviewTabs.tsx
import { useState } from 'react';
import type { Typescale, SurfaceKey } from '@/shared/types/typescale';
import { EditorialPreview } from './EditorialPreview';
import { UIPreview } from './UIPreview';
import { LadderPreview } from './LadderPreview';

type Tab = 'editorial' | 'ui' | 'ladder';

interface Props { draft: Typescale; activeSurface: SurfaceKey; defaultTab?: Tab; }

export function PreviewTabs({ draft, activeSurface, defaultTab = 'editorial' }: Props) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-md border p-0.5 text-xs">
        {(['editorial','ui','ladder'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1 rounded ${tab===t?'bg-primary text-primary-foreground':'text-muted-foreground'}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'editorial' && <EditorialPreview draft={draft} activeSurface={activeSurface} />}
      {tab === 'ui' && <UIPreview draft={draft} activeSurface={activeSurface} />}
      {tab === 'ladder' && <LadderPreview draft={draft} activeSurface={activeSurface} />}
    </div>
  );
}
