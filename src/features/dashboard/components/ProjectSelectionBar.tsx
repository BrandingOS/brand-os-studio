/**
 * What you can do with the projects you have selected.
 *
 * A bar rather than a menu, because a selection is a MODE — it persists while
 * the user decides — and a mode needs something on screen saying so, and saying
 * how to leave. It appears only while something is selected, names the count,
 * and puts the way out (Clear, and Escape) beside the actions rather than
 * hidden behind them.
 */
import { useEffect } from 'react';
import { DsButton } from '@/shared/ds';
import './brandCardMenu.css';

interface Props {
  count: number;
  onMove: () => void;
  onDelete: () => void;
  onClear: () => void;
  busy?: boolean;
}

export function ProjectSelectionBar({ count, onMove, onDelete, onClear, busy }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClear();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClear]);

  if (count === 0) return null;

  return (
    <div className="bcm-selbar" role="toolbar" aria-label={`${count} projects selected`}>
      <span className="bcm-selbar-count">
        {count} selected
      </span>
      <div className="bcm-selbar-actions">
        <DsButton tone="secondary" size="sm" onClick={onMove} disabled={busy}>
          Move to folder
        </DsButton>
        <DsButton tone="danger" size="sm" onClick={onDelete} disabled={busy}>
          {busy ? 'Deleting…' : 'Delete'}
        </DsButton>
        <DsButton tone="tertiary" size="sm" onClick={onClear} disabled={busy}>
          Clear
        </DsButton>
      </div>
    </div>
  );
}
