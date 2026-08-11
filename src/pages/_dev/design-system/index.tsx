import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  DsBadge,
  DsBanner,
  DsButton,
  DsEyebrow,
  DsModal,
  DsSegmented,
  DsToast,
} from '@/shared/ds';
import {
  DS_TOKENS,
  SECTIONS,
  type ThemeMode,
  type TokenDef,
  tokenScope,
} from './registry';
import { useTokenDrafts, draftToCssPatch, type DraftState } from './useTokenDrafts';
import { TokenPanel } from './TokenPanel';
import {
  FixedPropertiesSection,
  HighlightProvider,
  SECTION_PREVIEWS,
  useHighlight,
} from './previews';
import { validateValue } from './validate';
import {
  diffSnapshots,
  loadHistory,
  pushHistory,
  type HistoryEntry,
  type TokenStateSnapshot,
} from './historyStore';
import {
  deleteVersion,
  fetchTokensState,
  fetchVersions,
  renameVersion,
  saveVersion,
  type TokenVersion,
} from './versionsClient';
import { HistoryPanel, VersionsPanel, diffCountFromCurrent } from './SidePanels';

/**
 * DS Controller — the live design-token control center at /_dev/design-system.
 *
 * Canonical chain: tokens.json → (npm run gen:tokens) → tokens.css + tokens.ts.
 * - APPLIED values are read from the shipped tokens.css at runtime via two
 *   hidden probe elements — never duplicated in JS.
 * - DRAFT overrides live in localStorage and are applied as inline custom
 *   properties on the PREVIEW wrapper only; the editor chrome stays
 *   canonical, so a wild experiment can't brick the controls. Invalid
 *   drafts are flagged inline and never reach the preview or the server.
 * - Apply POSTs the draft to /__ds-tokens/apply (validate → write →
 *   codegen → HMR) and automatically pushes a History snapshot of the
 *   state BEFORE the change. Reverts and version restores route through
 *   the same endpoint — there is exactly one write path.
 * - Named versions are complete-state checkpoints stored server-side in
 *   .ds-token-versions.json (gitignored), so they survive restarts.
 */

type Defaults = Record<ThemeMode, Record<string, string>>;

function readTokenValues(el: HTMLElement): Record<string, string> {
  const style = getComputedStyle(el);
  return Object.fromEntries(
    DS_TOKENS.map((d) => [d.cssVar, style.getPropertyValue(d.cssVar).trim()]),
  );
}

const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v.trim());
const labelOf = (cssVar: string) => DS_TOKENS.find((d) => d.cssVar === cssVar)?.label ?? cssVar;

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

/** Validation state for the whole draft: cssVar → message (any scope). */
function validateDraft(draft: DraftState): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const scope of ['light', 'dark', 'global'] as const) {
    for (const [cssVar, value] of Object.entries(draft[scope])) {
      const def = DS_TOKENS.find((d) => d.cssVar === cssVar);
      if (!def) continue;
      const res = validateValue(def, value);
      if (!res.ok && !(cssVar in errors)) errors[cssVar] = res.message ?? 'Invalid value.';
    }
  }
  return errors;
}

type SidebarTab = 'tokens' | 'history' | 'versions';

export default function DesignSystemControllerPage() {
  return (
    <HighlightProvider>
      <ControllerInner />
    </HighlightProvider>
  );
}

function ControllerInner() {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [tabId, setTabId] = useState<SidebarTab>('tokens');
  const drafts = useTokenDrafts();
  const [defaults, setDefaults] = useState<Defaults | null>(null);
  const [copied, setCopied] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [versions, setVersions] = useState<TokenVersion[]>([]);
  const [tokensState, setTokensState] = useState<TokenStateSnapshot | null>(null);
  const lightProbeRef = useRef<HTMLDivElement>(null);
  const darkProbeRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const invalid = useMemo(() => validateDraft(drafts.draft), [drafts.draft]);
  const invalidCount = Object.keys(invalid).length;

  const notify = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

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

  // The apply endpoint (and state/versions) only exist on the dev server.
  const canSave = import.meta.env.DEV;

  const refreshServerState = useCallback(async () => {
    if (!import.meta.env.DEV) return;
    try {
      setTokensState(await fetchTokensState());
    } catch {
      setTokensState(null);
    }
  }, []);

  useEffect(() => {
    refreshServerState();
    if (import.meta.env.DEV) {
      fetchVersions().then(setVersions).catch(() => setVersions([]));
    }
  }, [refreshServerState]);

  // Apply VALID draft overrides for the active mode (plus globals) to the
  // preview wrapper as inline custom properties — every DS component inside
  // reacts immediately because they read tokens only. Invalid values are
  // kept out so the preview never renders broken CSS.
  useLayoutEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    for (const def of DS_TOKENS) {
      const value = drafts.draft[tokenScope(def, mode)][def.cssVar];
      if (value !== undefined && !(def.cssVar in invalid)) el.style.setProperty(def.cssVar, value);
      else el.style.removeProperty(def.cssVar);
    }
  }, [drafts.draft, mode, invalid]);

  const allowed = import.meta.env.DEV || new URLSearchParams(window.location.search).has('dev');
  if (!allowed) return null;

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

  /** The one write path: POST a draft to /apply, wait for HMR, push history. */
  const applyToSource = async (
    payload: DraftState,
    kind: HistoryEntry['kind'],
  ): Promise<void> => {
    const before = tokensState ?? (await fetchTokensState());
    const res = await fetch('/__ds-tokens/apply', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    await waitForCss(payload);
    const after = await fetchTokensState().catch(() => null);
    if (after) {
      const changes = diffSnapshots(before, after, labelOf);
      if (changes.length > 0) setHistory(pushHistory({ ts: Date.now(), kind, before, changes }));
      setTokensState(after);
    }
    refreshDefaults();
  };

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    const saved = drafts.draft;
    const count = drafts.overrideCount;
    try {
      await applyToSource(saved, 'apply');
      // Write + codegen + HMR done — drafts become the canonical baseline.
      drafts.clearSaved();
      setDiffOpen(false);
      notify(`Applied ${count} token${count === 1 ? '' : 's'} to tokens.json`);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  /** Build the draft that turns the CURRENT state into `target`. */
  const draftTowards = (target: TokenStateSnapshot): DraftState | null => {
    if (!tokensState) return null;
    const out: DraftState = { light: {}, dark: {}, global: {} };
    let n = 0;
    for (const scope of ['light', 'dark', 'global'] as const) {
      for (const [k, v] of Object.entries(target[scope] ?? {})) {
        if ((tokensState[scope]?.[k] ?? '').trim() !== v.trim()) {
          out[scope][k] = v;
          n += 1;
        }
      }
    }
    return n === 0 ? null : out;
  };

  const [busyOp, setBusyOp] = useState(false);

  const revertTo = async (entry: HistoryEntry) => {
    const payload = draftTowards(entry.before);
    if (!payload) {
      notify('Already at this state — nothing to revert.');
      return;
    }
    setBusyOp(true);
    try {
      await applyToSource(payload, 'revert');
      drafts.clearSaved();
      notify('Reverted — tokens.json, CSS and TS regenerated.');
    } catch (e) {
      notify(`Revert failed — ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusyOp(false);
    }
  };

  const restoreVersion = async (v: TokenVersion) => {
    const payload = draftTowards(v.tokens);
    if (!payload) {
      notify(`Already matching "${v.name}".`);
      return;
    }
    setBusyOp(true);
    try {
      await applyToSource(payload, 'restore-version');
      drafts.clearSaved();
      notify(`Restored "${v.name}".`);
    } catch (e) {
      notify(`Restore failed — ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusyOp(false);
    }
  };

  const handleSaveVersion = async (name: string, note?: string) => {
    setBusyOp(true);
    try {
      setVersions(await saveVersion(name, note));
      notify(`Saved version "${name}".`);
    } catch (e) {
      notify(`Save failed — ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusyOp(false);
    }
  };

  const handleRenameVersion = async (v: TokenVersion, name: string) => {
    try {
      setVersions(await renameVersion(v.id, name));
    } catch (e) {
      notify(`Rename failed — ${e instanceof Error ? e.message : e}`);
    }
  };

  const handleDeleteVersion = async (v: TokenVersion) => {
    try {
      setVersions(await deleteVersion(v.id));
      notify(`Deleted "${v.name}".`);
    } catch (e) {
      notify(`Delete failed — ${e instanceof Error ? e.message : e}`);
    }
  };

  // ── State strip: which named version matches the ACTIVE tokens ──
  const matching = versions.find((v) => diffCountFromCurrent(v, tokensState) === 0);
  const nearest = !matching && versions.length > 0
    ? versions.reduce((a, b) =>
        diffCountFromCurrent(a, tokensState) <= diffCountFromCurrent(b, tokensState) ? a : b,
      )
    : null;
  const currentLabel = matching
    ? matching.name
    : nearest
      ? `Modified from ${nearest.name}`
      : 'No saved version';
  const draftLabel =
    drafts.overrideCount === 0
      ? 'clean'
      : `${drafts.overrideCount} unsaved change${drafts.overrideCount === 1 ? '' : 's'}${
          invalidCount > 0 ? ` · ${invalidCount} invalid` : ''
        }`;

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
          maxWidth: 1460,
          margin: '0 auto',
          padding: '32px 32px 140px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
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
                fontSize: 32,
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                color: 'var(--ds-text)',
              }}
            >
              Token control center
            </h1>
            <div
              data-testid="state-strip"
              style={{ display: 'flex', gap: 14, fontSize: 12.5, color: 'var(--ds-text-secondary)', flexWrap: 'wrap' }}
            >
              <span>
                Current:&nbsp;
                <strong style={{ color: 'var(--ds-text)' }}>{currentLabel}</strong>
              </span>
              <span aria-hidden style={{ color: 'var(--ds-border-strong)' }}>·</span>
              <span>
                Draft:&nbsp;
                <strong style={{ color: invalidCount > 0 ? 'var(--ds-danger-fg)' : 'var(--ds-text)' }}>
                  {draftLabel}
                </strong>
              </span>
              <span aria-hidden style={{ color: 'var(--ds-border-strong)' }}>·</span>
              <span style={{ color: 'var(--ds-text-muted)' }}>
                Edit → preview → Apply → snapshot → tokens.json → codegen → HMR
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {invalidCount > 0 && (
              <DsBadge tone="danger">
                {invalidCount} invalid value{invalidCount === 1 ? '' : 's'}
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
              Discard draft
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
              <DsButton
                size="sm"
                arrow
                disabled={invalidCount > 0}
                title={invalidCount > 0 ? 'Fix the invalid values first' : undefined}
                onClick={() => {
                  setSaveError(null);
                  setDiffOpen(true);
                }}
              >
                Apply
              </DsButton>
            )}
          </div>
        </header>

        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <aside
            style={{
              width: 356,
              flexShrink: 0,
              position: 'sticky',
              top: 20,
              maxHeight: 'calc(100vh - 40px)',
              overflowY: 'auto',
              background: 'var(--ds-surface)',
              border: '1px solid var(--ds-border)',
              borderRadius: 'var(--ds-radius-panel)',
              padding: '14px 20px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <DsSegmented
              aria-label="Sidebar view"
              options={[
                { value: 'tokens', label: 'Tokens' },
                { value: 'history', label: `History${history.length ? ` · ${history.length}` : ''}` },
                { value: 'versions', label: `Versions${versions.length ? ` · ${versions.length}` : ''}` },
              ]}
              value={tabId}
              onChange={(v) => setTabId(v as SidebarTab)}
            />
            {tabId === 'tokens' &&
              (defaults ? (
                <TokenPanel mode={mode} defaults={defaults} drafts={drafts} invalid={invalid} />
              ) : (
                <div style={{ padding: 20, fontSize: 13, color: 'var(--ds-text-muted)' }}>
                  Reading canonical tokens…
                </div>
              ))}
            {tabId === 'history' && (
              <HistoryPanel entries={history} busy={busyOp || saving} onRevert={revertTo} />
            )}
            {tabId === 'versions' && (
              <VersionsPanel
                versions={versions}
                current={tokensState}
                busy={busyOp || saving}
                onSave={handleSaveVersion}
                onRestore={restoreVersion}
                onRename={handleRenameVersion}
                onDelete={handleDeleteVersion}
              />
            )}
          </aside>

          <main
            ref={previewRef}
            style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 36 }}
          >
            {SECTIONS.map((section) => {
              const Preview = SECTION_PREVIEWS[section.id];
              return (
                <section
                  key={section.id}
                  id={`preview-${section.id}`}
                  style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 19,
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                        color: 'var(--ds-text)',
                      }}
                    >
                      {section.title}
                    </h2>
                    <span style={{ fontSize: 12.5, color: 'var(--ds-text-muted)' }}>{section.blurb}</span>
                  </div>
                  <Preview />
                </section>
              );
            })}
            <FixedPropertiesSection />
          </main>
        </div>
      </div>

      {/* Apply confirmation — the applied → draft diff. */}
      <DsModal
        open={diffOpen}
        onClose={() => !saving && setDiffOpen(false)}
        eyebrow="Apply approved tokens"
        title={`Apply ${diffRows.length} change${diffRows.length === 1 ? '' : 's'} to tokens.json?`}
        secondaryActions={
          <DsButton tone="tertiary" size="sm" onClick={() => setDiffOpen(false)} disabled={saving}>
            Cancel
          </DsButton>
        }
        actions={
          <DsButton size="sm" onClick={save} disabled={saving || diffRows.length === 0}>
            {saving ? 'Applying…' : 'Confirm & apply'}
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
        {saveError && <DsBanner tone="danger">Apply failed — {saveError}</DsBanner>}
        <div style={{ fontSize: 11.5, color: 'var(--ds-text-muted)', lineHeight: 1.5 }}>
          Validated server-side, snapshotted to History, written atomically to tokens.json, then
          tokens.css + tokens.ts regenerate and hot-reload. Drafts clear only after the new CSS is
          live.
        </div>
      </DsModal>

      {toast && (
        <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 300 }}>
          <DsToast message={toast} />
        </div>
      )}
    </div>
  );
}
