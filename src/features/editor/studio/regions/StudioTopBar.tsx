// The Studio top bar.
//
// A DOCUMENT bar. What used to be here was the brand's section nav —
// Setup · Brand Kit · Guideline · Design · Tools — added so "the editor
// reads as a sibling page in the brand workspace". That is exactly the
// impression a design application must not give: it told you where you
// were in the product at the moment you needed to know where you were in
// your work.
//
// Left is the way out and what you are in. Centre is history and the
// document's identity. Right is what you do with the finished thing.

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Eye,
  Moon,
  Redo2,
  Share2,
  Sun,
  Undo2,
} from 'lucide-react';
import { DsStatusDot } from '@/shared/ds';
import type { EditorSaveState } from '@/features/editor/core';
import type { Brand } from '@/shared/types/brand';
import { BrandAvatar } from '@/shared/brand/BrandAvatar';
import { EditableTitle, IconButton } from '../components/chrome';

interface Props {
  brand?: Brand;
  backTo: string;
  name: string;
  onRename: (next: string) => void;
  contentTypeLabel: string;
  pageCount: number;
  saveState: EditorSaveState;
  saveEnabled: boolean;
  onRetrySave: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onExport: () => void;
  onShare?: () => void;
  readOnly: boolean;
  moreActions?: React.ReactNode;
}

const ICON = { size: 16, strokeWidth: 1.8 } as const;

export function StudioTopBar({
  brand,
  backTo,
  name,
  onRename,
  contentTypeLabel,
  pageCount,
  saveState,
  saveEnabled,
  onRetrySave,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  theme,
  onToggleTheme,
  onExport,
  onShare,
  readOnly,
  moreActions,
}: Props) {
  const meta = useMemo(
    () =>
      [contentTypeLabel, pageCount > 1 ? `${pageCount} pages` : null]
        .filter(Boolean)
        .join(' · '),
    [contentTypeLabel, pageCount],
  );

  return (
    <header className="st-topbar" data-studio-topbar>
      <div className="st-topbar-left">
        {/* A real link, not a button with a navigate() — ⌘-click on a
            back arrow should open the brand in a new tab. */}
        <Link
          to={backTo}
          className="st-icon-btn"
          title="Back to designs"
          aria-label="Back to designs"
        >
          <ArrowLeft {...ICON} />
        </Link>
        {brand ? (
          <Link
            to={backTo}
            className="st-icon-btn st-topbar-brand"
            title={`${brand.name} · designs`}
            style={{ gap: 8, paddingRight: 10 }}
          >
            <BrandAvatar brand={brand} size={20} />
            <span style={{ fontSize: 12, fontWeight: 500 }}>{brand.name}</span>
          </Link>
        ) : null}
      </div>

      <div className="st-topbar-centre">
        <IconButton
          icon={<Undo2 {...ICON} />}
          label="Undo"
          shortcut="⌘Z"
          disabled={!canUndo || readOnly}
          onClick={onUndo}
        />
        <IconButton
          icon={<Redo2 {...ICON} />}
          label="Redo"
          shortcut="⌘⇧Z"
          disabled={!canRedo || readOnly}
          onClick={onRedo}
        />
        <span className="st-divider" aria-hidden />
        <EditableTitle value={name} onCommit={onRename} disabled={readOnly} />
        <span className="st-docmeta" data-studio-docmeta>
          {meta}
        </span>
        <SaveState
          state={saveState}
          enabled={saveEnabled}
          readOnly={readOnly}
          onRetry={onRetrySave}
        />
      </div>

      <div className="st-topbar-right">
        {moreActions}
        {onShare ? (
          <IconButton
            icon={<Share2 {...ICON} />}
            label="Share"
            onClick={onShare}
          />
        ) : null}
        <IconButton
          icon={<Download {...ICON} />}
          label="Export"
          showLabel
          onClick={onExport}
        />
        <IconButton
          icon={theme === 'dark' ? <Sun {...ICON} /> : <Moon {...ICON} />}
          label={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          onClick={onToggleTheme}
        />
      </div>
    </header>
  );
}

/**
 * Save state, quietly.
 *
 * Saving is the editor's promise, not its feature: it says as little as
 * possible while it is working and speaks up only when it fails, where
 * it also offers the way out.
 */
function SaveState({
  state,
  enabled,
  readOnly,
  onRetry,
}: {
  state: EditorSaveState;
  enabled: boolean;
  readOnly: boolean;
  onRetry: () => void;
}) {
  if (readOnly) {
    return (
      <span className="st-readonly-note" data-studio-readonly>
        <Eye size={13} strokeWidth={1.8} aria-hidden />
        View only
      </span>
    );
  }
  if (!enabled) return null;
  if (state === 'error') {
    return (
      <button
        type="button"
        className="st-icon-btn st-icon-btn--label"
        onClick={onRetry}
        data-studio-save="error"
        style={{ color: 'var(--ds-danger)' }}
      >
        Couldn’t save · Retry
      </button>
    );
  }
  if (state === 'saving') {
    return (
      <span data-studio-save="saving">
        <DsStatusDot tone="muted" label="Saving…" />
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span data-studio-save="saved">
        <DsStatusDot tone="success" label="Saved" />
      </span>
    );
  }
  return null;
}
