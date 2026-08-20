/**
 * Putting projects in a folder.
 *
 * A folder here is a NAME, not a record. There is no folders table, no id, no
 * parent, no ordering — a project's folder is a string on its own card, and the
 * set of folders is whatever names the projects currently carry. That is the
 * whole feature, and it is deliberately the whole feature: a folder that exists
 * only while something is in it cannot go stale, cannot be orphaned, and costs
 * no migration. If folders later need to be empty, be renamed, or nest, they
 * become a record then — and the names already stored are the migration.
 */
import { useState } from 'react';
import { DsButton, DsInput, DsModal } from '@/shared/ds';
import './brandCardMenu.css';

interface Props {
  open: boolean;
  /** How many projects are being moved — the modal says so rather than listing. */
  count: number;
  /** Folder names already in use, for picking rather than retyping. */
  folders: string[];
  /** The folder they share now, if they all share one. */
  current?: string;
  busy?: boolean;
  onCancel: () => void;
  /** `undefined` means "no folder" — the way back out. */
  onChoose: (folder: string | undefined) => void;
}

export function MoveToFolderModal({
  open,
  count,
  folders,
  current,
  busy,
  onCancel,
  onChoose,
}: Props) {
  const [draft, setDraft] = useState('');

  if (!open) return null;

  const typed = draft.trim();
  const isNew = typed.length > 0 && !folders.some((f) => f.toLowerCase() === typed.toLowerCase());

  return (
    <DsModal
      open={open}
      onClose={() => !busy && onCancel()}
      eyebrow="Dashboard"
      title={count === 1 ? 'Move project' : `Move ${count} projects`}
      actions={
        <>
          <DsButton tone="secondary" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </DsButton>
          <DsButton
            tone="primary"
            size="sm"
            onClick={() => onChoose(typed || undefined)}
            disabled={busy || !typed}
          >
            {isNew ? 'Create and move' : 'Move'}
          </DsButton>
        </>
      }
      secondaryActions={
        current ? (
          <DsButton tone="tertiary" size="sm" onClick={() => onChoose(undefined)} disabled={busy}>
            Take out of “{current}”
          </DsButton>
        ) : undefined
      }
    >
      <DsInput
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && typed) onChoose(typed);
        }}
        placeholder="Folder name"
        aria-label="Folder name"
      />

      {folders.length > 0 && (
        <div className="bcm-folder-list">
          {folders.map((folder) => (
            <button
              key={folder}
              type="button"
              className={
                folder === current ? 'bcm-folder-chip bcm-folder-chip--current' : 'bcm-folder-chip'
              }
              onClick={() => setDraft(folder)}
              disabled={busy}
            >
              {folder}
            </button>
          ))}
        </div>
      )}
    </DsModal>
  );
}
