/**
 * Detail panel for one route — the "orientation" payload.
 *
 * Answers, in order of how often a developer needs them: what URL is this, what
 * component renders it, which file is that, where is the route declared, and what
 * does the page pull in.
 */
import { useState } from 'react';

import { DsBadge, DsButton, DsChip, DsEyebrow } from '@/shared/ds';

import type { ImportKind, RouteNode } from '../types';
import { copyToClipboard, openInEditor } from './openInEditor';

const KIND_TONE: Record<RouteNode['kind'], 'neutral' | 'success' | 'warning' | 'danger'> = {
  page: 'success',
  layout: 'neutral',
  redirect: 'warning',
  index: 'neutral',
  'catch-all': 'warning',
};

/** Layer order for the dependency list — highest-level first. */
const IMPORT_ORDER: ImportKind[] = [
  'feature',
  'shared',
  'ds',
  'store',
  'service',
  'domain',
  'component',
  'page',
  'external',
];

const IMPORT_LABEL: Record<ImportKind, string> = {
  feature: 'Features',
  shared: 'Shared',
  ds: 'Design system',
  store: 'Stores',
  service: 'Services / core',
  domain: 'Domain',
  component: 'Components (legacy)',
  page: 'Pages',
  external: 'Packages',
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'grid', gap: 'var(--ds-space-1)' }}>
      <DsEyebrow>{label}</DsEyebrow>
      <div style={{ fontSize: 14, color: 'var(--ds-text)', lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

/** Monospace value with a copy affordance; optionally opens in the editor. */
function CodeValue({
  value,
  file,
  line,
}: {
  value: string;
  file?: string;
  line?: number;
}) {
  const [note, setNote] = useState<string | null>(null);

  const flash = (message: string) => {
    setNote(message);
    window.setTimeout(() => setNote(null), 1600);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-2)', flexWrap: 'wrap' }}>
      <code
        style={{
          fontFamily: 'var(--ds-font-mono)',
          fontSize: 13,
          background: 'var(--ds-surface-subtle)',
          border: '1px solid var(--ds-border)',
          borderRadius: 'var(--ds-radius-control)',
          padding: '3px 7px',
          wordBreak: 'break-all',
        }}
      >
        {value}
      </code>
      <DsButton
        tone="tertiary"
        onClick={async () => {
          flash((await copyToClipboard(file ?? value)) ? 'Copied' : 'Copy failed');
        }}
      >
        Copy
      </DsButton>
      {file && (
        <DsButton
          tone="tertiary"
          onClick={async () => {
            const opened = await openInEditor({ file, line });
            if (opened) {
              flash('Opening…');
              return;
            }
            await copyToClipboard(file);
            flash('Editor unavailable — path copied instead');
          }}
        >
          Open in editor
        </DsButton>
      )}
      {note && <span style={{ fontSize: 12, color: 'var(--ds-text-muted)' }}>{note}</span>}
    </div>
  );
}

export function RouteDetail({ route }: { route: RouteNode }) {
  const imports = route.analysis?.imports ?? [];
  const firstParty = imports.filter((ref) => ref.kind !== 'external');
  const packages = imports.filter((ref) => ref.kind === 'external');

  const grouped = IMPORT_ORDER.map((kind) => ({
    kind,
    refs: imports.filter((ref) => ref.kind === kind),
  })).filter((entry) => entry.refs.length > 0);

  return (
    <div style={{ display: 'grid', gap: 'var(--ds-space-6)', alignContent: 'start' }}>
      <header style={{ display: 'grid', gap: 'var(--ds-space-2)' }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--ds-text)' }}>
          {route.name}
        </h2>
        <div style={{ display: 'flex', gap: 'var(--ds-space-2)', flexWrap: 'wrap' }}>
          <DsBadge tone={KIND_TONE[route.kind]}>{route.kind}</DsBadge>
          <DsBadge tone="neutral">{route.group}</DsBadge>
          {route.devOnly && <DsBadge tone="warning">dev only</DsBadge>}
        </div>
      </header>

      <Field label="URL">
        <CodeValue value={route.path} />
      </Field>

      {route.redirectTo && (
        <Field label="Redirects to">
          <CodeValue value={route.redirectTo} />
        </Field>
      )}

      <Field label="Component">
        {route.component ? (
          <code style={{ fontFamily: 'var(--ds-font-mono)', fontSize: 13 }}>
            {route.component}
          </code>
        ) : (
          <span style={{ color: 'var(--ds-text-muted)' }}>none</span>
        )}
      </Field>

      <Field label="Source">
        {route.sourceFile ? (
          <CodeValue value={route.sourceFile} file={route.sourceFile} />
        ) : (
          <span style={{ color: 'var(--ds-text-muted)' }}>could not be resolved</span>
        )}
      </Field>

      <Field label="Route definition">
        <CodeValue
          value={`${route.routeFile}:${route.routeLine}`}
          file={route.routeFile}
          line={route.routeLine}
        />
      </Field>

      {route.wrappers.length > 0 && (
        <Field label="Wrapped in">
          <div style={{ display: 'flex', gap: 'var(--ds-space-2)', flexWrap: 'wrap' }}>
            {route.wrappers.map((wrapper) => (
              <DsChip key={wrapper}>{wrapper}</DsChip>
            ))}
          </div>
        </Field>
      )}

      {route.params.length > 0 && (
        <Field label="URL parameters">
          <div style={{ display: 'flex', gap: 'var(--ds-space-2)', flexWrap: 'wrap' }}>
            {route.params.map((param) => (
              <DsChip key={param}>:{param}</DsChip>
            ))}
          </div>
        </Field>
      )}

      {route.parentPath && (
        <Field label="Nested under">
          <CodeValue value={route.parentPath} />
        </Field>
      )}

      {imports.length > 0 && (
        <Field
          label={`Depends on — ${firstParty.length} internal, ${packages.length} packages`}
        >
          <div style={{ display: 'grid', gap: 'var(--ds-space-3)', marginTop: 4 }}>
            {grouped.map(({ kind, refs }) => (
              <div key={kind} style={{ display: 'grid', gap: 'var(--ds-space-1)' }}>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--ds-text-muted)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {IMPORT_LABEL[kind]} · {refs.length}
                </span>
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: 'none',
                    display: 'grid',
                    gap: 2,
                  }}
                >
                  {refs.map((ref, index) => (
                    <li
                      key={`${kind}-${index}-${ref.specifier}`}
                      style={{
                        fontFamily: 'var(--ds-font-mono)',
                        fontSize: 12,
                        color: 'var(--ds-text-secondary)',
                        display: 'flex',
                        gap: 6,
                        alignItems: 'baseline',
                      }}
                    >
                      {ref.file ? (
                        <button
                          type="button"
                          onClick={() => void openInEditor({ file: ref.file as string })}
                          title={`Open ${ref.file}`}
                          style={{
                            all: 'unset',
                            cursor: 'pointer',
                            color: 'var(--ds-text)',
                            textDecoration: 'underline dotted',
                          }}
                        >
                          {ref.specifier}
                        </button>
                      ) : (
                        <span>{ref.specifier}</span>
                      )}
                      {ref.names.length > 0 && (
                        <span style={{ color: 'var(--ds-text-placeholder)' }}>
                          {ref.names.slice(0, 4).join(', ')}
                          {ref.names.length > 4 ? '…' : ''}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p
            style={{
              margin: '10px 0 0',
              fontSize: 11,
              color: 'var(--ds-text-muted)',
            }}
          >
            Direct imports only — not the transitive graph.
          </p>
        </Field>
      )}
    </div>
  );
}
