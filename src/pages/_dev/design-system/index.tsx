import React, { useLayoutEffect, useRef, useState } from 'react';
import { DsBadge, DsButton, DsEyebrow, DsSegmented } from '@/shared/ds';
import { DS_TOKENS, type ThemeMode, tokenScope } from './registry';
import { useTokenDrafts, draftToCssPatch } from './useTokenDrafts';
import { TokenPanel } from './TokenPanel';
import { Showcase } from './Showcase';

/**
 * DS Controller — the live design-token control center at /_dev/design-system.
 *
 * How it stays canonical:
 * - Default values are READ from the shipped tokens.css at runtime via two
 *   hidden probe elements (one per theme scope) — never duplicated in JS.
 * - Draft overrides live in localStorage and are applied as inline custom
 *   properties on the PREVIEW wrapper only. The editor chrome keeps
 *   canonical tokens, so a wild experiment can't brick the controls.
 * - "Copy CSS" emits a patch shaped like tokens.css's value maps — the
 *   manual apply path until a codegen pipeline lands.
 */

type Defaults = Record<ThemeMode, Record<string, string>>;

function readTokenValues(el: HTMLElement): Record<string, string> {
  const style = getComputedStyle(el);
  return Object.fromEntries(
    DS_TOKENS.map((d) => [d.cssVar, style.getPropertyValue(d.cssVar).trim()]),
  );
}

export default function DesignSystemControllerPage() {
  const [mode, setMode] = useState<ThemeMode>('light');
  const drafts = useTokenDrafts();
  const [defaults, setDefaults] = useState<Defaults | null>(null);
  const [copied, setCopied] = useState(false);
  const lightProbeRef = useRef<HTMLDivElement>(null);
  const darkProbeRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Read canonical defaults from the real stylesheet once, after the probes
  // mount. This is the single source of "original value" everywhere below.
  useLayoutEffect(() => {
    if (!lightProbeRef.current || !darkProbeRef.current) return;
    setDefaults({
      light: readTokenValues(lightProbeRef.current),
      dark: readTokenValues(darkProbeRef.current),
    });
  }, []);

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

  const copyPatch = async () => {
    try {
      await navigator.clipboard.writeText(draftToCssPatch(drafts.draft));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  return (
    <div
      className="ds"
      data-theme={mode}
      style={{ minHeight: '100vh', background: 'var(--ds-bg)', transition: 'background 220ms' }}
    >
      {/* Hidden probes: canonical token values per theme scope. */}
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
              Drafts persist locally and restyle the preview only — tokens.css stays canonical
              until you apply a copied patch in code.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {drafts.overrideCount > 0 && (
              <DsBadge tone="warning">{drafts.overrideCount} draft override{drafts.overrideCount === 1 ? '' : 's'}</DsBadge>
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
              Reset all
            </DsButton>
            <DsButton size="sm" onClick={copyPatch} disabled={drafts.overrideCount === 0}>
              {copied ? 'Copied' : 'Copy CSS'}
            </DsButton>
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
    </div>
  );
}
