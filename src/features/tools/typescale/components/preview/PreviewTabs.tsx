// PreviewTabs.tsx
import { useState } from 'react';
import type { Typescale, SurfaceKey } from '@/shared/types/typescale';
import { EditorialPreview } from './EditorialPreview';
import { UIPreview } from './UIPreview';
import { LadderPreview } from './LadderPreview';
import { EditorialCreative } from './EditorialCreative';
import { UICreative } from './UICreative';
import { LadderCreative } from './LadderCreative';

type Tab = 'editorial' | 'ui' | 'ladder';
type Mode = 'plain' | 'creative';

interface Props {
  draft: Typescale;
  activeSurface: SurfaceKey;
  defaultTab?: Tab;
  accentColor?: string;
}

/**
 * PreviewTabs — three preview modes (Editorial · UI · Ladder) with a
 * secondary Plain / Creative toggle.
 *
 *   • Plain mode renders the original text-driven previews.
 *   • Creative mode renders designed mockups — magazine spread,
 *     product dashboard, typographic poster — tinted with the brand's
 *     accent color.
 *
 * `accentColor` flows from the host (TypescaleEditor reads the brand's
 * primary color) and falls back to a neutral default so the public
 * tool still paints something tasteful.
 */
export function PreviewTabs({ draft, activeSurface, defaultTab = 'editorial', accentColor }: Props) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [mode, setMode] = useState<Mode>('creative');
  const accent = accentColor || '#0f172a';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="ts-preview-header">
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
        <div className="ts-preview-mode" role="tablist" aria-label="Preview mode">
          {(['creative', 'plain'] as Mode[]).map(m => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`ts-preview-mode-btn${mode === m ? ' is-active' : ''}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="ts-board-body">
        {tab === 'editorial' && mode === 'plain' && (
          <EditorialPreview draft={draft} activeSurface={activeSurface} />
        )}
        {tab === 'editorial' && mode === 'creative' && (
          <EditorialCreative draft={draft} activeSurface={activeSurface} accent={accent} />
        )}
        {tab === 'ui' && mode === 'plain' && (
          <UIPreview draft={draft} activeSurface={activeSurface} />
        )}
        {tab === 'ui' && mode === 'creative' && (
          <UICreative draft={draft} activeSurface={activeSurface} accent={accent} />
        )}
        {tab === 'ladder' && mode === 'plain' && (
          <LadderPreview draft={draft} activeSurface={activeSurface} />
        )}
        {tab === 'ladder' && mode === 'creative' && (
          <LadderCreative draft={draft} activeSurface={activeSurface} accent={accent} />
        )}
      </div>
    </div>
  );
}
