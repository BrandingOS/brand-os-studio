// PreviewTabs.tsx
import { useState } from 'react';
import type { Typescale, SurfaceKey } from '@/shared/types/typescale';
import { EditorialPreview } from './EditorialPreview';
import { UIPreview } from './UIPreview';
import { LadderPreview } from './LadderPreview';

type Tab = 'editorial' | 'ui' | 'ladder';

interface Props { draft: Typescale; activeSurface: SurfaceKey; defaultTab?: Tab; }

/**
 * PreviewTabs — three preview modes for the typescale:
 *   • editorial: long-form article demo (h1, body, caption, …)
 *   • ui: dashboard-style UI demo
 *   • ladder: every step rendered at its actual size
 *
 * Tab pills use `.ts-board-tabs` so they match the Color System tool's
 * showcase strip. Bodies render inside the shared preview container.
 */
export function PreviewTabs({ draft, activeSurface, defaultTab = 'editorial' }: Props) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="ts-board-tabs" role="tablist" aria-label="Preview">
        {(['editorial', 'ui', 'ladder'] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`ts-board-tab${tab === t ? ' is-active' : ''}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="ts-board-body">
        {tab === 'editorial' && <EditorialPreview draft={draft} activeSurface={activeSurface} />}
        {tab === 'ui' && <UIPreview draft={draft} activeSurface={activeSurface} />}
        {tab === 'ladder' && <LadderPreview draft={draft} activeSurface={activeSurface} />}
      </div>
    </div>
  );
}
