import React from 'react';

/** A file the customer uploaded: thumb · name + meta · quiet icon actions. */

export interface DsAssetRowAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

export interface DsAssetRowProps {
  /** Thumbnail content — an <img>, an icon, or a mini preview. */
  thumb: React.ReactNode;
  name: string;
  meta?: string;
  actions?: DsAssetRowAction[];
  /** Optional upload progress 0–1; renders a slim bar under the name. */
  progress?: number;
}

export function DsAssetRow({ thumb, name, meta, actions = [], progress }: DsAssetRowProps) {
  return (
    <div className="ds-asset-row">
      <div className="ds-asset-row-thumb">{thumb}</div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: progress !== undefined ? 5 : 0 }}>
        <div className="ds-asset-row-name">{name}</div>
        {progress !== undefined ? (
          <div className="ds-progress-track" style={{ height: 4 }}>
            <div
              className="ds-progress-fill"
              style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
            />
          </div>
        ) : (
          meta && <div className="ds-asset-row-meta">{meta}</div>
        )}
      </div>
      {progress !== undefined && (
        <span className="ds-mono" style={{ fontSize: 11, color: 'var(--ds-text-muted)' }}>
          {Math.round(Math.max(0, Math.min(1, progress)) * 100)}%
        </span>
      )}
      {actions.length > 0 && (
        <div style={{ display: 'flex', gap: 4 }}>
          {actions.map((action) => (
            <button
              type="button"
              key={action.label}
              aria-label={action.label}
              title={action.label}
              className={['ds-asset-row-action', action.danger ? 'ds-asset-row-action--danger' : '']
                .filter(Boolean)
                .join(' ')}
              onClick={action.onClick}
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
