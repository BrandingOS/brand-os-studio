import React, { useState } from 'react';
import { DsBadge, DsButton, DsEmptyState, DsInput } from '@/shared/ds';
import {
  entryScopes,
  type HistoryEntry,
  type TokenStateSnapshot,
} from './historyStore';
import { diffCountFromCurrent, type TokenVersion } from './versionsClient';

/** Sidebar panels: automatic apply History and durable named Versions. */

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const hm = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `Today ${hm}`;
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${hm}`;
}

function ValueMini({ v }: { v: string }) {
  const isHex = /^#[0-9a-fA-F]{6}$/.test(v.trim());
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
      {isHex && (
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 3,
            background: v,
            border: '1px solid var(--ds-border)',
            flexShrink: 0,
          }}
        />
      )}
      <span
        className="ds-mono"
        style={{ fontSize: 9.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {v}
      </span>
    </span>
  );
}

const KIND_LABEL: Record<HistoryEntry['kind'], string> = {
  apply: 'Apply',
  revert: 'Revert',
  'restore-version': 'Restore',
};

export function HistoryPanel({
  entries,
  busy,
  onRevert,
  onDelete,
}: {
  entries: HistoryEntry[];
  busy: boolean;
  onRevert: (entry: HistoryEntry) => void;
  /** Requests deletion of one snapshot — the page-level owner shows the
   *  confirm dialog OUTSIDE this sticky sidebar (same stacking-context
   *  trap as the version delete). */
  onDelete: (entry: HistoryEntry) => void;
}) {
  if (entries.length === 0) {
    return (
      <DsEmptyState>
        No applies yet. Every Apply automatically snapshots the state before the change, so you
        can always step back.
      </DsEmptyState>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 11, color: 'var(--ds-text-muted)', padding: '8px 0 10px', lineHeight: 1.5 }}>
        Automatic snapshots of the state BEFORE each apply (latest 40, this browser). Reverting
        snapshots the current state first — nothing is ever lost.
      </div>
      {entries.map((entry) => {
        const scopes = entryScopes(entry);
        return (
          <div
            key={entry.id}
            style={{
              borderTop: '1px solid var(--ds-hairline)',
              padding: '10px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ds-text)' }}>
                {fmtTime(entry.ts)}
              </span>
              <span style={{ fontSize: 10.5, color: 'var(--ds-text-muted)' }}>
                {KIND_LABEL[entry.kind]} · {entry.changes.length} change{entry.changes.length === 1 ? '' : 's'} ·{' '}
                {scopes.map((s) => s[0].toUpperCase() + s.slice(1)).join(' / ')}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {entry.changes.slice(0, 5).map((c) => (
                <div
                  key={`${c.scope}:${c.cssVar}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(70px, 1fr) 1fr 12px 1fr',
                    gap: 6,
                    alignItems: 'center',
                    fontSize: 10.5,
                  }}
                >
                  <span style={{ color: 'var(--ds-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.label}
                  </span>
                  <ValueMini v={c.from} />
                  <span style={{ color: 'var(--ds-text-muted)' }}>→</span>
                  <ValueMini v={c.to} />
                </div>
              ))}
              {entry.changes.length > 5 && (
                <span style={{ fontSize: 10, color: 'var(--ds-text-muted)' }}>
                  +{entry.changes.length - 5} more
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <DsButton tone="secondary" size="sm" disabled={busy} onClick={() => onRevert(entry)}>
                Revert to this state
              </DsButton>
              <DsButton tone="tertiary" size="sm" disabled={busy} onClick={() => onDelete(entry)}>
                Delete
              </DsButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Versions ─────────────────────────────────────────────────── */

export function VersionsPanel({
  versions,
  current,
  busy,
  onSave,
  onRestore,
  onRename,
  onDelete,
}: {
  versions: TokenVersion[];
  current: TokenStateSnapshot | null;
  busy: boolean;
  onSave: (name: string, note?: string) => void;
  onRestore: (v: TokenVersion) => void;
  onRename: (v: TokenVersion, name: string) => void;
  /** Requests deletion — the page-level owner shows the confirm dialog
   *  OUTSIDE this sticky sidebar (sticky creates a stacking context that
   *  would trap a fixed scrim under the preview's z-indexed elements). */
  onDelete: (v: TokenVersion) => void;
}) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--ds-text-muted)', lineHeight: 1.5 }}>
        Durable checkpoints of the COMPLETE token state — stored in
        <span className="ds-mono" style={{ fontSize: 10 }}> .ds-token-versions.json</span> (gitignored),
        so they survive refresh and browser restarts. Restore routes through the same
        validate → tokens.json → codegen pipeline.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <DsInput
          label="Save current as version"
          placeholder='e.g. "v1 — Current Stable"'
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <DsInput
          placeholder="Optional note"
          aria-label="Version note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div>
          <DsButton
            size="sm"
            disabled={busy || name.trim().length === 0}
            onClick={() => {
              onSave(name.trim(), note.trim() || undefined);
              setName('');
              setNote('');
            }}
          >
            Save version
          </DsButton>
        </div>
      </div>

      {versions.length === 0 ? (
        <DsEmptyState>No named versions yet — save the current state as your first checkpoint.</DsEmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {versions.map((v) => {
            const diff = diffCountFromCurrent(v, current);
            const isCurrent = diff === 0;
            const total =
              Object.keys(v.tokens.light ?? {}).length +
              Object.keys(v.tokens.dark ?? {}).length +
              Object.keys(v.tokens.global ?? {}).length;
            return (
              <div
                key={v.id}
                style={{
                  borderTop: '1px solid var(--ds-hairline)',
                  padding: '10px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {renamingId === v.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => {
                        if (renameValue.trim()) onRename(v, renameValue.trim());
                        setRenamingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      style={{
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: 'var(--ds-text)',
                        background: 'var(--ds-surface)',
                        border: '1px solid var(--ds-border)',
                        borderRadius: 6,
                        padding: '3px 6px',
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ds-text)' }}>{v.name}</span>
                  )}
                  {isCurrent ? (
                    <DsBadge tone="success">Current</DsBadge>
                  ) : (
                    <DsBadge tone="warning">{diff} differ</DsBadge>
                  )}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--ds-text-muted)' }}>
                  {fmtTime(v.createdAt)} · {total} tokens
                  {v.note ? ` · ${v.note}` : ''}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <DsButton
                    tone="secondary"
                    size="sm"
                    disabled={busy || isCurrent}
                    onClick={() => onRestore(v)}
                  >
                    Restore
                  </DsButton>
                  <DsButton
                    tone="tertiary"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      setRenamingId(v.id);
                      setRenameValue(v.name);
                    }}
                  >
                    Rename
                  </DsButton>
                  <DsButton tone="tertiary" size="sm" disabled={busy} onClick={() => onDelete(v)}>
                    Delete
                  </DsButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
