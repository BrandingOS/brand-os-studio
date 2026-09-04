/**
 * Bento's page actions, rendered into `WorkspaceShell`'s `rightActions`.
 *
 * This is what replaced `BentoTopBar`. That component stacked `EditorChrome`
 * — the unified editor's own topbar, with its own back arrow, breadcrumb and
 * title — on top of a bespoke document toolbar, and the whole thing sat inside
 * a `position: fixed` root that covered the application. Three bars of chrome,
 * none of them the product's, and no way back to the brand except a link Bento
 * drew itself.
 *
 * A page of the product does not carry its own navigation. The shell's top bar
 * is the navigation; a page contributes its ACTIONS to it, which is exactly
 * what the Guideline builder and the Identity page do.
 */
import { useState } from 'react';
import { Download, Images, Redo2, Save, Shuffle, Undo2 } from 'lucide-react';
import { DsButton, DsMenu, DsMenuItem } from '@/shared/ds';
import { useBentoStore } from '../store';

export function BentoActions({
  onShuffle,
  onExport,
  onSave,
  canSave,
  onOpenMedia,
}: {
  onShuffle: (mode: 'content' | 'layout+content') => void;
  onExport: () => void;
  onSave?: () => void;
  canSave?: boolean;
  onOpenMedia: () => void;
}) {
  const undo = useBentoStore((s) => s.undo);
  const redo = useBentoStore((s) => s.redo);
  const canUndo = useBentoStore((s) => s.past.length > 0);
  const canRedo = useBentoStore((s) => s.future.length > 0);
  const [shuffleOpen, setShuffleOpen] = useState(false);

  return (
    <>
      <DsButton
        tone="tertiary"
        size="sm"
        disabled={!canUndo}
        onClick={undo}
        title="Undo (⌘Z)"
        aria-label="Undo"
      >
        <Undo2 size={14} aria-hidden />
      </DsButton>
      <DsButton
        tone="tertiary"
        size="sm"
        disabled={!canRedo}
        onClick={redo}
        title="Redo (⇧⌘Z)"
        aria-label="Redo"
      >
        <Redo2 size={14} aria-hidden />
      </DsButton>

      <DsButton tone="secondary" size="sm" onClick={onOpenMedia} title="Media picker">
        <Images size={14} aria-hidden />
        Media
      </DsButton>

      {/* Closes on blur rather than on a document listener: the menu is two
          items and both of them close it, so the only other way out is
          leaving — which is exactly what blur means. */}
      <span
        className="bento-menu-anchor"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setShuffleOpen(false);
        }}
      >
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
  );
}
