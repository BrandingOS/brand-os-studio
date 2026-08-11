import React from 'react';
import { CloseIcon } from '@/shared/ds/icons';
import {
  DS_TOKENS,
  TOKEN_GROUPS,
  type ThemeMode,
  type TokenDef,
} from './registry';
import type { TokenDrafts } from './useTokenDrafts';

/**
 * The editor sidebar: one compact row per token, grouped. Each row shows
 * the canonical default (read from tokens.css at runtime) and, when a
 * draft override exists, marks the row and offers a per-token reset.
 */

const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v.trim());
const stripUnit = (v: string, unit: string) =>
  v.trim().endsWith(unit) ? v.trim().slice(0, -unit.length) : v.trim();

interface TokenRowProps {
  def: TokenDef;
  mode: ThemeMode;
  defaultValue: string;
  drafts: TokenDrafts;
}

function TokenRow({ def, mode, defaultValue, drafts }: TokenRowProps) {
  const override = drafts.getOverride(def, mode);
  const overridden = override !== undefined;
  const value = override ?? defaultValue;

  const set = (v: string) => drafts.setToken(def, mode, v);

  let control: React.ReactNode;
  switch (def.kind) {
    case 'color':
      control = (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="color"
            aria-label={`${def.label} color`}
            value={isHex(value) ? value : '#000000'}
            onChange={(e) => set(e.target.value)}
            style={{
              width: 26,
              height: 26,
              padding: 0,
              border: '1px solid var(--ds-border)',
              borderRadius: 7,
              background: 'none',
              cursor: 'pointer',
            }}
          />
          <input
            aria-label={`${def.label} value`}
            value={value}
            onChange={(e) => set(e.target.value)}
            spellCheck={false}
            style={{
              width: 74,
              fontFamily: 'var(--ds-font-mono)',
              fontSize: 11,
              color: 'var(--ds-text)',
              background: 'var(--ds-surface)',
              border: '1px solid var(--ds-border)',
              borderRadius: 7,
              padding: '5px 7px',
              outline: 'none',
            }}
          />
        </span>
      );
      break;
    case 'size':
    case 'duration': {
      const unit = def.kind === 'size' ? 'px' : 'ms';
      control = (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="number"
            aria-label={`${def.label} value`}
            value={stripUnit(value, unit)}
            onChange={(e) => e.target.value !== '' && set(`${e.target.value}${unit}`)}
            style={{
              width: 62,
              fontFamily: 'var(--ds-font-mono)',
              fontSize: 11,
              color: 'var(--ds-text)',
              background: 'var(--ds-surface)',
              border: '1px solid var(--ds-border)',
              borderRadius: 7,
              padding: '5px 7px',
              outline: 'none',
            }}
          />
          <span style={{ fontSize: 10, color: 'var(--ds-text-muted)' }}>{unit}</span>
        </span>
      );
      break;
    }
    default:
      // text · shadow · easing · font — raw string input
      control = (
        <input
          aria-label={`${def.label} value`}
          value={value}
          onChange={(e) => set(e.target.value)}
          spellCheck={false}
          style={{
            width: '100%',
            fontFamily: 'var(--ds-font-mono)',
            fontSize: 10.5,
            color: 'var(--ds-text)',
            background: 'var(--ds-surface)',
            border: '1px solid var(--ds-border)',
            borderRadius: 7,
            padding: '5px 7px',
            outline: 'none',
          }}
        />
      );
  }

  const wide = def.kind !== 'color' && def.kind !== 'size' && def.kind !== 'duration';

  return (
    <div
      title={def.hint ? `${def.cssVar} — ${def.hint}` : def.cssVar}
      style={{
        display: 'flex',
        flexDirection: wide ? 'column' : 'row',
        alignItems: wide ? 'stretch' : 'center',
        gap: wide ? 5 : 10,
        padding: '7px 0',
        borderBottom: '1px solid var(--ds-hairline)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        {overridden && (
          <span
            aria-label="overridden"
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: 'var(--ds-warning)',
              flexShrink: 0,
            }}
          />
        )}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: overridden ? 700 : 600,
              color: 'var(--ds-text)',
              whiteSpace: 'nowrap',
            }}
          >
            {def.label}
          </div>
          <div
            style={{
              fontFamily: 'var(--ds-font-mono)',
              fontSize: 9.5,
              color: 'var(--ds-text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {overridden ? `default ${defaultValue}` : defaultValue}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {control}
        <button
          type="button"
          aria-label={`Reset ${def.label}`}
          title="Reset to default"
          onClick={() => drafts.resetToken(def, mode)}
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            border: 'none',
            background: 'none',
            color: 'var(--ds-text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            visibility: overridden ? 'visible' : 'hidden',
          }}
        >
          <CloseIcon size={11} />
        </button>
      </div>
    </div>
  );
}

export interface TokenPanelProps {
  mode: ThemeMode;
  /** Canonical defaults per mode, read from tokens.css via probes. */
  defaults: Record<ThemeMode, Record<string, string>>;
  drafts: TokenDrafts;
}

export function TokenPanel({ mode, defaults, drafts }: TokenPanelProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {TOKEN_GROUPS.map((group) => {
        const defs = DS_TOKENS.filter((d) => d.group === group);
        if (defs.length === 0) return null;
        const perModeGroup = defs.some((d) => d.perMode);
        const overriddenInGroup = defs.filter((d) => drafts.isOverridden(d, mode)).length;
        return (
          <details key={group} open={overriddenInGroup > 0 || group === 'Core colors'}>
            <summary
              style={{
                cursor: 'pointer',
                listStyle: 'none',
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                padding: '10px 0 6px',
              }}
            >
              <span className="ds-eyebrow" style={{ fontSize: 10.5 }}>{group}</span>
              <span style={{ fontSize: 10, color: 'var(--ds-text-muted)' }}>
                {perModeGroup ? mode : 'both modes'}
              </span>
              {overriddenInGroup > 0 && (
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    color: 'var(--ds-warning-fg)',
                    background: 'var(--ds-warning-bg)',
                    borderRadius: 999,
                    padding: '1px 7px',
                  }}
                >
                  {overriddenInGroup}
                </span>
              )}
            </summary>
            <div>
              {defs.map((def) => (
                <TokenRow
                  key={def.cssVar}
                  def={def}
                  mode={mode}
                  defaultValue={defaults[def.perMode ? mode : 'light'][def.cssVar] ?? ''}
                  drafts={drafts}
                />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
