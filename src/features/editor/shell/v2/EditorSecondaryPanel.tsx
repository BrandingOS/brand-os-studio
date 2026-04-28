// EditorSecondaryPanel — floating .panel card that swaps content per
// active App Rail entry (Generate / Templates / Insert / Brand).
//
// Visual matches Variant 4 exactly: 288px wide card, --surface-elevated
// bg, 12px radius, --border, --shadow-sm. A 32px circular collapse
// toggle floats off the right edge so the user can hide the panel and
// reclaim the space for the canvas.

import { ChevronRight } from 'lucide-react';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { BrandOSDocument } from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';
import type { RailItem } from './EditorAppRail';
import { GeneratePanel } from './panels/GeneratePanel';
import { TemplatesPanel } from './panels/TemplatesPanel';
import { InsertPanel } from './panels/InsertPanel';
import { BrandPanel } from './panels/BrandPanel';

interface Props {
  active: RailItem;
  adapter: EditorAdapter;
  doc: BrandOSDocument;
  activePageId: string;
  brand?: Brand;
  onCollapse: () => void;
}

export function EditorSecondaryPanel({
  active,
  adapter,
  doc,
  activePageId,
  brand,
  onCollapse,
}: Props) {
  return (
    <div className="flex py-3 pr-1" style={{ flexShrink: 0 }}>
      <aside
        className="relative flex w-72 flex-col"
        data-secondary-panel={active}
        style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
        }}
      >
        <button
          onClick={onCollapse}
          title="Collapse panel"
          aria-label="Collapse panel"
          className="absolute -right-4 top-5 z-30 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-secondary)',
            boxShadow: 'var(--shadow-md)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--surface-elevated)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
        </button>

        {active === 'generate' && <GeneratePanel />}
        {active === 'templates' && <TemplatesPanel />}
        {active === 'insert' && <InsertPanel adapter={adapter} pageId={activePageId} />}
        {active === 'brand' && (
          <BrandPanel
            adapter={adapter}
            doc={doc}
            activePageId={activePageId}
            brand={brand}
          />
        )}
      </aside>
    </div>
  );
}
