/**
 * NewFolderModal — a folder in the brand, created where you are standing.
 *
 * It names the parent, because a folder created while you are three levels
 * deep is not a root folder and a user who assumes otherwise will file work
 * somewhere they cannot find it.
 */
import * as React from 'react';
import { DsButton, DsInput, DsModal } from '@/shared/ds';
import type { BrandFolder } from '@/shared/types/brand';
import { validateFolderName } from '@/shared/folders';

export interface NewFolderModalProps {
  open: boolean;
  onClose: () => void;
  folders: BrandFolder[];
  parentId: string | null;
  parentName: string;
  onCreate: (name: string) => Promise<void>;
}

export function NewFolderModal({
  open,
  onClose,
  folders,
  parentId,
  parentName,
  onCreate,
}: NewFolderModalProps) {
  const [name, setName] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setName('');
  }, [open]);

  // Live, so the clash is visible before the button is pressed — the database
  // has the same rule and answers with a 23505, which is not a sentence.
  const problem = name.trim() ? validateFolderName(name, folders, parentId) : null;

  const submit = async () => {
    if (!name.trim() || problem || saving) return;
    setSaving(true);
    try {
      await onCreate(name);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <DsModal
      open={open}
      onClose={onClose}
      eyebrow={`In ${parentName}`}
      title="New folder"
      actions={
        <>
          <DsButton tone="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </DsButton>
          <DsButton
            tone="primary"
            size="sm"
            disabled={!name.trim() || Boolean(problem) || saving}
            onClick={() => void submit()}
          >
            Create
          </DsButton>
        </>
      }
    >
      <DsInput
        autoFocus
        label="Name"
        value={name}
        error={problem ?? undefined}
        placeholder="Campaigns"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void submit();
        }}
      />
    </DsModal>
  );
}
