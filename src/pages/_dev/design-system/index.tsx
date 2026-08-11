import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { DsBadge, DsBanner, DsButton, DsEyebrow, DsModal, DsSegmented, DsToast } from '@/shared/ds';
import { DS_TOKENS, type ThemeMode, type TokenDef, tokenScope } from './registry';
import { useTokenDrafts, draftToCssPatch, type DraftState } from './useTokenDrafts';
import { TokenPanel } from './TokenPanel';
import { Showcase } from './Showcase';

/**
 * DS Controller — the live design-token control center at /_dev/design-system.
 *
 * Canonical chain: tokens.json → (npm run gen:tokens) → tokens.css + tokens.ts.
 * - APPLIED values are read from the shipped tokens.css at runtime via two
 *   hidden probe elements — never duplicated in JS.
 * - DRAFT overrides live in localStorage and are applied as inline custom
 *   properties on the PREVIEW wrapper only; the editor chrome stays
 *   canonical, so a wild experiment can't brick the controls.
 * - Save (dev server only) POSTs the draft to /__ds-tokens/apply, which
 *   validates, merges into tokens.json, and regenerates both files; drafts
 *   are cleared only after the write succeeds AND HMR has delivered the new
 *   CSS, so the preview never flashes back to stale values.
 */

type Defaults = Record<ThemeMode, Record<string, string>>;

function readTokenValues(el: HTMLElement): Record<string, string> {
  const style = getComputedStyle(el);
  return Object.fromEntries(
    DS_TOKENS.map((d) => [d.cssVar, style.getPropertyValue(d.cssVar).trim()]),
  );
}

const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v.trim());

function ValueChip({ value }: { value: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      {isHex(value) && (
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: 4,
            background: value,
            border: '1px solid var(--ds-border)',
            flexShrink: 0,
          }}
        />
      )}
      <span
        style={{
          fontFamily: 'var(--ds-font-mono)',
          fontSize: 11,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </span>
    </span>
  );
}

interface DiffRow {
  def: TokenDef;
  scope: 'light' | 'dark' | 'global';
  applied: string;
  draft: string;
}

function collectDiff(draft: DraftState, defaults: Defaults): DiffRow[] {
  const rows: DiffRow[] = [];
  for (const scope of ['light', 'dark', 'global'] as const) {
    for (const [cssVar, value] of Object.entries(draft[scope])) {
      const def = DS_TOKENS.find((d) => d.cssVar === cssVar);
      if (!def) continue;
      rows.push({
        def,
        scope,
        applied: defaults[scope === 'global' ? 'light' : scope][cssVar] ?? '',
        draft: value,
      });
    }
  }
  return rows;
}

export default function DesignSystemControllerPage() {
  const [mode, setMode] = useState<ThemeMode>('light');
  const drafts = useTokenDrafts();
  const [defaults, setDefaults] = useState<Defaults | null>(null);
  const [copied, setCopied] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const lightProbeRef = useRef<HTMLDivElement>(null);
  const darkProbeRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const refreshDefaults = useCallback(() => {
    if (!lightProbeRef.current || !darkProbeRef.current) return null;
    const next: Defaults = {
      light: readTokenValues(lightProbeRef.current),
      dark: readTokenValues(darkProbeRef.current),
    };
    setDefaults(next);
    return next;
  }, []);

  // Read canonical applied values from the real stylesheet once the probes
  // mount. This is the single source of "applied value" everywhere below.
  useLayoutEffect(() => {
    refreshDefaults();
  }, [refreshDefaults]);

  // Apply draft overrides for the active mode (plus globals) to the preview
  // wrapper as inline custom properties — every DS component inside reacts
  // immediately because they read tokens only.
  useLayoutEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    for (const def of DS_TOKENS) {
      const value = drafts.draft[tokenScope(def, mode)][def.cssVar];
      if (value !== undefined) el.style.setProperty(def.cssVar, value);
      else el.style.removeProperty(def.cssVar);
    }
  }, [drafts.draft, mode]);

  const allowed = import.meta.env.DEV || new URLSearchParams(window.location.search).has('dev');
  if (!allowed) return null;

  // The apply endpoint only exists on the Vite dev server.
  const canSave = import.meta.env.DEV;

  const copyPatch = async () => {
    try {
      await navigator.clipboard.writeText(draftToCssPatch(drafts.draft));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  /** Wait until the probes see the saved values (HMR delivered the new CSS). */
  const waitForCss = async (saved: DraftState) => {
    const targets: Array<[ThemeMode, string, string]> = [];
    for (const scope of ['light', 'dark'] as const) {
      for (const [k, v] of Object.entries(saved[scope])) targets.push([scope, k, v]);
    }
    for (const [k, v] of Object.entries(saved.global)) targets.push(['light', k, v]);
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 250));
      const light = lightProbeRef.current;
      const dark = darkProbeRef.current;
      if (!light || !dark) continue;
      const styles = { light: getComputedStyle(light), dark: getComputedStyle(dark) };
      if (targets.every(([m, k, v]) => styles[m].getPropertyValue(k).trim() === v.trim())) {
        return true;
      }
    }
    return false;
  };

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    const saved = drafts.draft;
    const count = drafts.overrideCount;
    try {
      const res = await fetch('/__ds-tokens/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(saved),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      // The write + codegen succeeded. Keep drafts applied until the new CSS
      // arrives via HMR, so the preview never flashes stale values.
      await waitForCss(saved);
      drafts.clearSaved();
      refreshDefaults();
      setDiffOpen(false);
      setToast(`Applied ${count} token${count === 1 ? '' : 's'} to tokens.json`);
      setTimeout(() => setToast(null), 3500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const diffRows = defaults && diffOpen ? collectDiff(drafts.draft, defaults) : [];

  return (
    <div
      className="ds"
      data-theme={mode}
      style={{ minHeight: '100vh', background: 'var(--ds-bg)', transition: 'background 220ms' }}
    >
      {/* Hidden probes: canonical applied values per theme scope. */}
      <div style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
        <div ref={lightProbeRef} data-theme="light" />
        <div ref={darkProbeRef} data-theme="dark" />
      </div>

      <div
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: '36px 32px 140px',
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <DsEyebrow>BrandingOS · Design System · Controller</DsEyebrow>
            <h1
              style={{
                margin: 0,
                fontWeight: 800,
                fontSize: 34,
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                color: 'var(--ds-text)',
              }}
            >
              Token control center
            </h1>
            <div style={{ fontSize: 13, color: 'var(--ds-text-secondary)', maxWidth: 560, lineHeight: 1.5 }}>
              Drafts persist locally and restyle the preview only. Save validates and writes
              tokens.json, then regenerates tokens.css + tokens.ts.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {drafts.overrideCount > 0 && (
              <DsBadge tone="warning">
                {drafts.overrideCount} draft override{drafts.overrideCount === 1 ? '' : 's'}
              </DsBadge>
            )}
            <DsSegmented
              aria-label="Edit target"
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
              value={mode}
              onChange={(v) => setMode(v as ThemeMode)}
            />
            <DsButton tone="secondary" size="sm" onClick={drafts.undo} disabled={!drafts.canUndo}>
              Undo
            </DsButton>
            <DsButton
              tone="secondary"
              size="sm"
              onClick={drafts.resetAll}
              disabled={drafts.overrideCount === 0}
            >
              Discard all
            </DsButton>
            <DsButton
              tone="tertiary"
              size="sm"
              onClick={copyPatch}
              disabled={drafts.overrideCount === 0}
            >
              {copied ? 'Copied' : 'Copy CSS'}
            </DsButton>
            {canSave && drafts.overrideCount > 0 && (
              <DsButton size="sm" arrow onClick={() => { setSaveError(null); setDiffOpen(true); }}>
                Save to tokens.json
              </DsButton>
            )}
          </div>
        </header>

        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <aside
            style={{
              width: 348,
              flexShrink: 0,
              position: 'sticky',
              top: 20,
              maxHeight: 'calc(100vh - 40px)',
              overflowY: 'auto',
              background: 'var(--ds-surface)',
              border: '1px solid var(--ds-border)',
              borderRadius: 'var(--ds-radius-panel)',
              padding: '10px 20px 20px',
            }}
          >
            {defaults ? (
              <TokenPanel mode={mode} defaults={defaults} drafts={drafts} />
            ) : (
              <div style={{ padding: 20, fontSize: 13, color: 'var(--ds-text-muted)' }}>
                Reading canonical tokens…
              </div>
            )}
          </aside>

          <main ref={previewRef} style={{ flex: 1, minWidth: 0 }}>
            <Showcase />
          </main>
        </div>
      </div>

      {/* Save confirmation — the applied → draft diff. */}
      <DsModal
        open={diffOpen}
        onClose={() => !saving && setDiffOpen(false)}
        eyebrow="Save approved tokens"
        title={`Apply ${diffRows.length} change${diffRows.length === 1 ? '' : 's'} to tokens.json?`}
        secondaryActions={
          <DsButton tone="tertiary" size="sm" onClick={() => setDiffOpen(false)} disabled={saving}>
            Cancel
          </DsButton>
        }
        actions={
          <DsButton size="sm" onClick={save} disabled={saving || diffRows.length === 0}>
            {saving ? 'Applying…' : 'Confirm & save'}
          </DsButton>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 360, overflowY: 'auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 64px 1fr 1fr',
              gap: 10,
              padding: '6px 0',
              borderBottom: '1px solid var(--ds-hairline)',
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--ds-text-muted)',
            }}
          >
            <span>Token</span>
            <span>Scope</span>
            <span>Applied</span>
            <span>Draft</span>
          </div>
          {diffRows.map((row) => (
            <div
              key={`${row.scope}:${row.def.cssVar}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 64px 1fr 1fr',
                gap: 10,
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid var(--ds-hairline)',
                fontSize: 12.5,
              }}
            >
              <span style={{ minWidth: 0 }}>
                <span style={{ fontWeight: 600 }}>{row.def.label}</span>
                <span
                  style={{
                    display: 'block',
                    fontFamily: 'var(--ds-font-mono)',
                    fontSize: 9.5,
                    color: 'var(--ds-text-muted)',
                  }}
                >
                  {row.def.cssVar}
                </span>
              </span>
              <span style={{ fontSize: 11, color: 'var(--ds-text-secondary)' }}>{row.scope}</span>
              <ValueChip value={row.applied} />
              <ValueChip value={row.draft} />
            </div>
          ))}
        </div>
        {saveError && (
          <DsBanner tone="danger">Save failed — {saveError}</DsBanner>
        )}
        <div style={{ fontSize: 11.5, color: 'var(--ds-text-muted)', lineHeight: 1.5 }}>
          Validated server-side, written atomically to tokens.json, then tokens.css + tokens.ts
          regenerate and hot-reload. Drafts clear only after the new CSS is live.
        </div>
      </DsModal>

      {toast && (
        <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 80 }}>
          <DsToast message={toast} />
        </div>
      )}
    </div>
  );
}
