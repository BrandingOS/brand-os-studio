// A blank page, with something to do.
//
// A blank document used to be a white rectangle on a cream background
// and nothing else — indistinguishable from a broken load. This sits on
// the screen-space overlay, so it neither scales with the artboard nor
// appears in an export, and it removes itself the moment the page has a
// layer.
//
// The four routes out are the four real starting points, and the first
// is the brand — the same claim the rail makes by putting Brand first.

import { LayoutGrid, Palette, Sparkles, Type } from 'lucide-react';
import { DsButton } from '@/shared/ds';
import type { RailId } from '../state/studioStore';
import type { InsertRequest } from '../ops/insertRequest';

const ICON = { size: 15, strokeWidth: 1.8 } as const;

interface Props {
  onInsert: (request: InsertRequest) => void;
  onOpenRail: (rail: RailId) => void;
  hasBrand: boolean;
}

export function StudioEmptyState({ onInsert, onOpenRail, hasBrand }: Props) {
  return (
    <div className="st-empty" data-studio-empty>
      <div>
        <p className="st-empty-title">This page is empty</p>
        <p className="st-empty-sub">
          {hasBrand
            ? 'Start from a template, drop in your brand, or describe what you want.'
            : 'Start from a template, add some text, or describe what you want.'}
        </p>
      </div>
      <div className="st-empty-actions">
        <DsButton tone="primary" size="sm" onClick={() => onOpenRail('templates')}>
          <LayoutGrid {...ICON} aria-hidden /> Browse templates
        </DsButton>
        {hasBrand ? (
          <DsButton tone="secondary" size="sm" onClick={() => onOpenRail('brand')}>
            <Palette {...ICON} aria-hidden /> Brand kit
          </DsButton>
        ) : null}
        <DsButton
          tone="secondary"
          size="sm"
          onClick={() => onInsert({ kind: 'text', style: 'heading' })}
        >
          <Type {...ICON} aria-hidden /> Add a heading
        </DsButton>
        <DsButton tone="secondary" size="sm" onClick={() => onOpenRail('ai')}>
          <Sparkles {...ICON} aria-hidden /> Create with AI
        </DsButton>
      </div>
    </div>
  );
}
