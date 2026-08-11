import React, { useEffect, useRef, useState } from 'react';
import { CloseIcon } from '@/shared/ds/icons';
import {
  SECTIONS,
  tokensForSection,
  type ThemeMode,
  type TokenDef,
} from './registry';
import type { TokenDrafts } from './useTokenDrafts';
import { validateValue } from './validate';
import { useHighlight } from './previews';

/**
 * The editor sidebar: one compact row per token, grouped by the SAME
 * canonical sections the preview renders (same names, same order).
 * Each row shows the canonical applied value (read from tokens.css at
 * runtime), validates drafts INLINE as you type, and wires the
 * token ↔ preview highlight: focusing a row lights up and scrolls the
 * matching demo on the right.
 */

const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v.trim());
const stripUnit = (v: string, unit: string) =>
  v.trim().endsWith(unit) ? v.trim().slice(0, -unit.length) : v.trim();

const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--ds-font-mono)',
  fontSize: 11,
  color: 'var(--ds-text)',
  background: 'var(--ds-surface)',
  border: '1px solid var(--ds-border)',
  borderRadius: 7,
  padding: '5px 7px',
  outline: 'none',
};

interface TokenRowProps {
  def: TokenDef;
  mode: ThemeMode;
  defaultValue: string;
  drafts: TokenDrafts;
  invalidMessage?: string;
}

export function TokenRow({ def, mode, defaultValue, drafts, invalidMessage }: TokenRowProps) {
  const { showToken, registerControl } = useHighlight();
  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => registerControl(def.cssVar, rowRef.current), [def.cssVar, registerControl]);

  const override = drafts.getOverride(def, mode);
  const overridden = override !== undefined;
  const value = override ?? defaultValue;
  const invalid = invalidMessage !== undefined;

  const set = (v: string) => drafts.setToken(def, mode, v);
  const borderColor = invalid ? 'var(--ds-error-border)' : 'var(--ds-border)';

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
              border: `1px solid ${borderColor}`,
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
            style={{ ...inputStyle, width: 74, borderColor }}
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
            style={{ ...inputStyle, width: 62, borderColor }}
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
          style={{ ...inputStyle, width: '100%', fontSize: 10.5, borderColor }}
        />
      );
  }

  const wide = def.kind !== 'color' && def.kind !== 'size' && def.kind !== 'duration';

  return (
    <div
      ref={rowRef}
      onFocusCapture={() => showToken(def.cssVar)}
      onClick={() => showToken(def.cssVar)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '7px 0',
        borderBottom: '1px solid var(--ds-hairline)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: wide ? 'column' : 'row',
          alignItems: wide ? 'stretch' : 'center',
          gap: wide ? 5 : 10,
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
                background: invalid ? 'var(--ds-danger)' : 'var(--ds-warning)',
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
                display: 'flex',
                gap: 6,
                alignItems: 'baseline',
              }}
            >
              {def.label}
              {def.unused && (
                <span
                  title="Exists in tokens.json but nothing consumes it today"
                  style={{
                    fontSize: 8.5,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--ds-text-muted)',
                    border: '1px solid var(--ds-border)',
                    borderRadius: 999,
                    padding: '0 6px',
                  }}
                >
                  Unused
                </span>
              )}
            </div>
            <div
              title={`${def.cssVar} — ${def.purpose}\nUsed by: ${def.usedBy.join(' · ') || 'nothing yet'}`}
              style={{
                fontFamily: 'var(--ds-font-mono)',
                fontSize: 9.5,
                color: 'var(--ds-text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {overridden ? `applied ${defaultValue}` : defaultValue}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {control}
          <button
            type="button"
            aria-label={`Reset ${def.label}`}
            title="Reset to applied value"
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
      {invalid && (
        <div
          role="alert"
          style={{ fontSize: 10.5, lineHeight: 1.45, color: 'var(--ds-danger-fg)' }}
        >
          {invalidMessage}
        </div>
      )}
    </div>
  );
}

/** Details row expanded under a focused token — purpose + consumers. */
function TokenMeta({ def }: { def: TokenDef }) {
  return (
    <div style={{ padding: '2px 0 8px', fontSize: 10.5, lineHeight: 1.5, color: 'var(--ds-text-muted)' }}>
      {def.purpose}
      <span style={{ display: 'block' }}>
        Used by: {def.usedBy.length > 0 ? def.usedBy.join(' · ') : '— nothing yet'}
      </span>
    </div>
  );
}

export interface TokenPanelProps {
  mode: ThemeMode;
  /** Canonical applied values per mode, read from tokens.css via probes. */
  defaults: Record<ThemeMode, Record<string, string>>;
  drafts: TokenDrafts;
  /** cssVar → message for invalid draft values (active mode's scopes). */
  invalid: Record<string, string>;
}

export function TokenPanel({ mode, defaults, drafts, invalid }: TokenPanelProps) {
  const { activeVar } = useHighlight();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ surfaces: true });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {SECTIONS.map((section) => {
        const defs = tokensForSection(section.id);
        if (defs.length === 0) return null;
        const perModeGroup = defs.some((d) => d.perMode);
        const overriddenInGroup = defs.filter((d) => drafts.isOverridden(d, mode)).length;
        const open = openSections[section.id] ?? overriddenInGroup > 0;
        return (
          <details
            key={section.id}
            open={open}
            onToggle={(e) =>
              setOpenSections((prev) => ({ ...prev, [section.id]: (e.target as HTMLDetailsElement).open }))
            }
          >
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
              <span className="ds-eyebrow" style={{ fontSize: 10.5 }}>{section.title}</span>
              <span style={{ fontSize: 10, color: 'var(--ds-text-muted)' }}>
                {perModeGroup ? mode : 'both modes'}
              </span>
              {overriddenInGroup > 0 && (
                <>
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
                  <button
                    type="button"
                    aria-label={`Reset ${section.title} section`}
                    onClick={(e) => {
                      e.preventDefault();
                      drafts.resetSection(defs, mode);
                    }}
                    style={{
                      marginLeft: 'auto',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: 'var(--ds-text-muted)',
                      padding: '2px 4px',
                    }}
                  >
                    Reset section
                  </button>
                </>
              )}
            </summary>
            <div>
              {defs.map((def) => (
                <React.Fragment key={def.cssVar}>
                  <TokenRow
                    def={def}
                    mode={mode}
                    defaultValue={defaults[def.perMode ? mode : 'light'][def.cssVar] ?? ''}
                    drafts={drafts}
                    invalidMessage={invalid[def.cssVar]}
                  />
                  {activeVar === def.cssVar && <TokenMeta def={def} />}
                </React.Fragment>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
