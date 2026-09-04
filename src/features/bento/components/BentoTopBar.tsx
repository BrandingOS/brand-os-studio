import { useState } from 'react';
import { Undo2, Redo2, Shuffle, Download, Save, Images } from 'lucide-react';
import { EditorChrome } from '@/features/editor/core';
import { DsButton, DsMenu, DsMenuItem } from '@/shared/ds';
import { useBentoStore } from '../store';
import { SizePicker } from './SizePicker';
import { LayoutPopover } from './LayoutPopover';
import type { Brand } from '@/shared/types/brand';
import type { SizePresetId } from '../types';

interface Props {
  brand?: Brand | null;
  backTo: string;
  /** Accepted for call-site compatibility; EditorChrome labels its own back control. */
  backLabel?: string;
  onShuffle: (mode: 'content' | 'layout+content') => void;
  onExport: () => void;
  onSave?: () => void;
  canSave?: boolean;
  onOpenMedia?: () => void;
  extraLeft?: React.ReactNode;
}

/**
 * The Bento editor's chrome.
 *
 * Two rows, and the split is the point. `EditorChrome` is the app's canonical
 * editor topbar — back, breadcrumb, title, save state, actions — and every
 * editor wears it, so Bento does not get its own. Underneath it sits a
 * document toolbar carrying the controls that belong to THIS document: the
 * canvas size, its ground, the grid, and history.
 *
 * `EditorTopToolbar` from the same module would have been the obvious choice
 * for that second row and is deliberately not used: it reads the unified
 * editor's `useEditor()` context, and Bento keeps its state in its own zustand
 * store. Adopting it means porting Bento's state model, which is a rewrite
 * rather than a migration.
 */
export function BentoTopBar({
  brand, backTo, onShuffle, onExport, onSave, canSave, onOpenMedia, extraLeft,
}: Props) {
  const design = useBentoStore((s) => s.design);
  const undo = useBentoStore((s) => s.undo);
  const redo = useBentoStore((s) => s.redo);
  const canUndo = useBentoStore((s) => s.past.length > 0);
  const canRedo = useBentoStore((s) => s.future.length > 0);
  const setSize = useBentoStore((s) => s.setSize);
  const setBackground = useBentoStore((s) => s.setBackground);
  const [shuffleOpen, setShuffleOpen] = useState(false);

  return (
    <>
      <EditorChrome
        backTo={backTo}
        breadcrumb={brand ? [brand.name] : undefined}
        title="Bento"
        actions={
          <>
            {onOpenMedia && (
              <DsButton tone="secondary" size="sm" onClick={onOpenMedia} title="Media picker">
                <Images size={14} aria-hidden />
                Media
              </DsButton>
            )}

            {/* Closes on blur rather than on a document listener: the menu is
                two items and both of them close it, so the only other way out
                is leaving — which is exactly what blur means. */}
            <span className="bento-menu-anchor" onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setShuffleOpen(false);
            }}>
              <DsButton
                tone="secondary"
                size="sm"
                aria-expanded={shuffleOpen}
                onClick={() => setShuffleOpen((o) => !o)}
              >
                <Shuffle size={14} aria-hidden />
                Shuffle
              </DsButton>
              {shuffleOpen && (
                <DsMenu className="bento-menu">
                  <DsMenuItem onClick={() => { setShuffleOpen(false); onShuffle('content'); }}>
                    Shuffle content only
                  </DsMenuItem>
                  <DsMenuItem onClick={() => { setShuffleOpen(false); onShuffle('layout+content'); }}>
                    Shuffle everything
                  </DsMenuItem>
                </DsMenu>
              )}
            </span>

            {onSave && (
              <DsButton
                tone="secondary"
                size="sm"
                onClick={onSave}
                disabled={!canSave}
                title={canSave ? 'Save to brand' : 'Select a brand first'}
              >
                <Save size={14} aria-hidden />
                Save
              </DsButton>
            )}
            <DsButton tone="primary" size="sm" onClick={onExport}>
              <Download size={14} aria-hidden />
              Export
            </DsButton>
          </>
        }
      />

      <div className="bento-toolbar" role="toolbar" aria-label="Document">
        <div className="bento-toolbar-group">
          <button
            type="button"
            className="bento-iconbtn"
            disabled={!canUndo}
            onClick={undo}
            title="Undo (⌘Z)"
            aria-label="Undo"
          >
            <Undo2 size={15} aria-hidden />
          </button>
          <button
            type="button"
            className="bento-iconbtn"
            disabled={!canRedo}
            onClick={redo}
            title="Redo (⇧⌘Z)"
            aria-label="Redo"
          >
            <Redo2 size={15} aria-hidden />
          </button>
        </div>

        <span className="bento-toolbar-rule" aria-hidden />

        <div className="bento-toolbar-group">
          <SizePicker value={design.sizeId as SizePresetId} onChange={(id, custom) => setSize(id, custom)} />
          {/* The swatch IS the control: a colour input styled as a chip, with
              the native picker kept clickable underneath it. */}
          <label className="bento-swatch" title="Background colour">
            <input
              type="color"
              value={design.backgroundColor}
              onChange={(e) => setBackground(e.target.value)}
              aria-label="Background colour"
            />
            <span style={{ background: design.backgroundColor }} />
          </label>
          <LayoutPopover />
        </div>

        {extraLeft && <div className="bento-toolbar-extra">{extraLeft}</div>}
      </div>
    </>
  );
}
