// EditorSecondaryPanel — floating .panel card that swaps content per
// active App Rail entry (Generate / Templates / Insert / Brand).
//
// Round 2:
//   • Width bumped from 288px (w-72) to 340px so the Generate prompt
//     input + history list have breathing room.
//   • Collapse toggle shrunk from 32×32 → 24×24, half-protrudes from
//     the right edge (Notion / Figma pattern). Subtle border + soft
//     shadow + small chevron so the seam between panel and canvas
//     stays clean.
//
// Round 3 fix 6:
//   • Panel no longer stretches full viewport height. Its slot in
//     Editor.tsx still spans top:0 → bottom:0 for layout, but the
//     aside aligns to the slot's top and clamps to a min/max range.
//     min-height ~200px keeps the card from collapsing when content
//     is sparse; max-height calc(100vh - 80px) reserves room for the
//     editor topbar + breathing space at the bottom. Inner content
//     scrolls independently when it overflows.

import { ChevronRight } from 'lucide-react';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { BrandOSDocument } from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';
import type { RailItem } from './EditorAppRail';
import { GeneratePanel } from './panels/GeneratePanel';
import { TemplatesPanel } from './panels/TemplatesPanel';
import { InsertPanel } from './panels/InsertPanel';
import { BrandPanel } from './panels/BrandPanel';

/**
 * Width of the Secondary Panel in pixels. Exported so the Editor's
 * fit-to-container math doesn't have to magic-number it.
 */
export const SECONDARY_PANEL_WIDTH = 340;

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
    <div
      className="flex items-start py-3 pr-1"
      style={{ flexShrink: 0, height: '100%' }}
    >
      <aside
        className="relative flex flex-col"
        data-secondary-panel={active}
        style={{
          width: SECONDARY_PANEL_WIDTH,
          minHeight: 200,
          maxHeight: 'calc(100vh - 80px)',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-sm)',
          // overflow:hidden clips the half-protruding toggle. Use
          // overflow:visible on the wrapper, hidden on the inner
          // content area instead.
          overflow: 'visible',
        }}
      >
        <button
          onClick={onCollapse}
          title="Collapse panel"
          aria-label="Collapse panel"
          data-secondary-panel-collapse
          // 24×24 button, half-protrudes from the right edge so it
          // floats on the seam between panel and canvas. Small
          // 16-ish chevron, subtle border + soft shadow.
          className="absolute z-30 inline-flex items-center justify-center rounded-full transition-colors"
          style={{
            top: '50%',
            right: -12,
            width: 24,
            height: 24,
            transform: 'translateY(-50%)',
            background: 'var(--surface-elevated, #ffffff)',
            border: '1px solid var(--border, rgba(13, 13, 13, 0.12))',
            color: 'var(--text-secondary, #6e6a69)',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface-hover, #f5f5f4)';
            e.currentTarget.style.color = 'var(--text-primary, #0d0d0d)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              'var(--surface-elevated, #ffffff)';
            e.currentTarget.style.color = 'var(--text-secondary, #6e6a69)';
          }}
        >
          <ChevronRight aria-hidden style={{ width: 14, height: 14 }} />
        </button>

        <div
          data-secondary-panel-content
          className="flex flex-1 flex-col"
          style={{
            // Inner content owns its own clipping so the toggle can
            // protrude past the wrapper's rounded corners. R3 fix 6:
            // overflow-y:auto lets the panel scroll its content
            // internally once the aside hits its max-height clamp.
            overflowX: 'hidden',
            overflowY: 'auto',
            borderRadius: 12,
          }}
        >
          {active === 'generate' && <GeneratePanel />}
          {active === 'templates' && <TemplatesPanel />}
          {active === 'insert' && (
            <InsertPanel adapter={adapter} pageId={activePageId} />
          )}
          {active === 'brand' && (
            <BrandPanel
              adapter={adapter}
              doc={doc}
              activePageId={activePageId}
              brand={brand}
            />
          )}
        </div>
      </aside>
    </div>
  );
}
