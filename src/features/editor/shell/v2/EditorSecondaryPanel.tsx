// EditorSecondaryPanel — floating .panel card that swaps content per
// active App Rail entry (Generate / Templates / Insert / Brand).
//
// Round 4 (clean header):
//   • Half-protruding chevron is gone. The panel now has a real
//     header bar at the top: bold panel title on the left, X close
//     button on the right, single-pixel separator below. This
//     matches the reference (Relume-style sidebar) where the panel
//     name is unambiguous and the close affordance reads like a
//     standard dialog/sheet close.
//   • Per-panel `panel-top` headings are dropped — the new header
//     is the canonical title, so each panel renders its content
//     directly.
//
// Round 3 fix 6 (v2) carryover:
//   • Panel HUGS its content via items-start on the wrapper plus
//     a maxHeight cap on the aside; no minHeight, no flex-1, no
//     wrapper height:100%.

import { X } from 'lucide-react';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { BrandOSDocument } from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';
import type { AIAgent, AICommandContext, AICommandResult } from '@/features/editor/ai/types';
import type { RailItem } from './EditorAppRail';
import { GeneratePanel } from './panels/GeneratePanel';
import { TemplatesPanel } from './panels/TemplatesPanel';
import { InsertPanel } from './panels/InsertPanel';
import { BrandPanel } from './panels/BrandPanel';

/**
 * Width of the Secondary Panel in pixels. Exported so the Editor's
 * fit-to-container math doesn't have to magic-number it.
 */
export const SECONDARY_PANEL_WIDTH = 300;

/**
 * Minimum height for the panel card. Without this floor a panel
 * with one line of placeholder content (e.g. Templates "Coming in
 * Phase 4.") would collapse to ~50px which reads as broken. The
 * floor gives the card visual presence; the maxHeight cap below
 * still keeps tall panels inside the viewport.
 */
const SECONDARY_PANEL_MIN_HEIGHT = 180;

const PANEL_TITLES: Record<RailItem, string> = {
  generate: 'Generate',
  templates: 'Templates',
  insert: 'Insert',
  brand: 'Brand',
};

interface Props {
  active: RailItem;
  adapter: EditorAdapter;
  doc: BrandOSDocument;
  activePageId: string;
  brand?: Brand;
  onCollapse: () => void;
  /** AI agent for the Generate panel's "Editable" mode. Optional —
   *  when absent, the panel hides the Editable toggle and offers
   *  Image mode only. */
  agent?: AIAgent | null;
  /** Lazy context accessor for the agent's applyCommand calls. */
  getContext?: () => AICommandContext;
  /** Staged prompt from the Design hero (?prompt=…). Pre-fills the
   *  Generate panel on mount. */
  initialPrompt?: string;
  /** Wires the Generate panel's "Editable" output to the editor's
   *  applyAICommandResult path. */
  onAIApply?: (result: AICommandResult) => void;
}

export function EditorSecondaryPanel({
  active,
  adapter,
  doc,
  activePageId,
  brand,
  onCollapse,
  agent,
  getContext,
  initialPrompt,
  onAIApply,
}: Props) {
  return (
    <div className="flex items-start py-3 pr-1" style={{ flexShrink: 0 }}>
      <aside
        className="relative flex flex-col overflow-hidden"
        data-secondary-panel={active}
        style={{
          width: SECONDARY_PANEL_WIDTH,
          minHeight: SECONDARY_PANEL_MIN_HEIGHT,
          maxHeight: 'calc(100vh - 96px)',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <header
          data-secondary-panel-header
          className="flex items-center justify-between"
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <h2
            data-secondary-panel-title
            className="text-[14px] font-semibold"
            style={{
              color: 'var(--text-primary)',
              letterSpacing: '-0.005em',
              margin: 0,
            }}
          >
            {PANEL_TITLES[active]}
          </h2>
          <button
            type="button"
            onClick={onCollapse}
            title="Close panel"
            aria-label="Close panel"
            data-secondary-panel-collapse
            className="inline-flex items-center justify-center rounded-md transition-colors"
            style={{
              width: 24,
              height: 24,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary, #6e6a69)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                'var(--surface-hover, #f5f5f4)';
              e.currentTarget.style.color = 'var(--text-primary, #0d0d0d)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary, #6e6a69)';
            }}
          >
            <X aria-hidden style={{ width: 14, height: 14 }} />
          </button>
        </header>

        <div
          data-secondary-panel-content
          className="flex flex-col"
          style={{
            overflowX: 'hidden',
            overflowY: 'auto',
          }}
        >
          {active === 'generate' && (
            <GeneratePanel
              adapter={adapter}
              activePageId={activePageId}
              doc={doc}
              brand={brand}
              agent={agent ?? null}
              getContext={getContext ?? (() => ({ activePageId, selection: [], brand: brand as Brand }))}
              initialPrompt={initialPrompt}
              onApply={onAIApply ?? (() => undefined)}
            />
          )}
          {active === 'templates' && (
            <TemplatesPanel adapter={adapter} activePageId={activePageId} />
          )}
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
