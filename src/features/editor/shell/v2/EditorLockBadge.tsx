// EditorLockBadge — Step 5c canvas-side indicator that the selected
// layer is brand-managed.
//
// Renders a 16×16 lock badge in the top-right corner of the layer's
// document-space bounding box (same coordinate system the floating
// toolbar uses — see Editor.tsx). The badge is purely informational:
// hovering it explains the lock, but the actual toggle lives in the
// floating toolbar's More menu.
//
// Mounted only when the selected layer has `brandLocked: true`.
// Pages with no selection or unlocked layers don't render the badge.

import { Lock } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import type { Layer } from '@/features/editor/schema';

const SELECTION_BLUE = '#2965f6';

interface Props {
  layer: Layer;
  /**
   * Current canvas zoom. The badge lives outside the scaled canvas
   * wrap so it stays screen-size at any zoom level; layer coords
   * are in document space, so we multiply by zoom for positioning.
   * The 8px corner outset is in SCREEN pixels, applied after the
   * multiply so the badge always reads the same regardless of zoom.
   */
  zoom?: number;
}

export function EditorLockBadge({ layer, zoom = 1 }: Props) {
  if (!layer.brandLocked) return null;
  // Top-right of the layer's visual bounding box, with an 8 SCREEN
  // px outset so the badge sits visually on the corner.
  const left = (layer.transform.x + layer.transform.width) * zoom - 8;
  const top = layer.transform.y * zoom - 8;

  return (
    <Tooltip.Provider delayDuration={250} disableHoverableContent>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            data-lock-badge
            data-layer-id={layer.id}
            aria-label="Brand-managed"
            style={{
              position: 'absolute',
              top,
              left,
              zIndex: 19,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: SELECTION_BLUE,
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-xs)',
              cursor: 'help',
            }}
          >
            <Lock className="h-2.5 w-2.5" />
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            data-workspace
            side="top"
            sideOffset={6}
            className="z-50 max-w-[220px] rounded-lg px-2 py-1.5 text-[11px]"
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
              color: 'var(--text-primary)',
            }}
            data-lock-badge-tooltip
          >
            Brand-managed. Edit in More menu.
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
