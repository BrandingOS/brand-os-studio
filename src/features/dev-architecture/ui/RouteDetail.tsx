/**
 * Detail panel for one route — the "orientation" payload.
 *
 * Answers, in order of how often a developer needs them: what URL is this, what
 * component renders it, which file is that, where is the route declared, and what
 * does the page pull in.
 */
import { useState } from 'react';

import { DsBadge, DsButton, DsChip, DsEyebrow } from '@/shared/ds';

import type { ImportKind, RelationKind, RouteNode } from '../types';
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

export interface RelationSummary {
  kind: RelationKind;
  label: string;
}

export interface RouteDetailProps {
  route: RouteNode;
  /** Incoming / outgoing relationships, computed by the shell. */
  relations?: { incoming: RelationSummary[]; outgoing: RelationSummary[] };
  /** Jumps to this route inside the Tree. */
  onShowInTree?: () => void;
  /** Centres the Diagram on this route's neighbourhood. */
  onFocusInDiagram?: () => void;
  /** Seeds a search from this route's name. */
  onSearchRelated?: () => void;
  /** Toggles L4 technical dependency nodes for this route in the Diagram. */
  onShowTechnical?: () => void;
}

const RELATION_LABEL: Record<RelationKind, string> = {
  hierarchy: 'hierarchy',
  navigation: 'navigation',
  redirect: 'redirect',
  import: 'import',
};

function RelationList({ items }: { items: RelationSummary[] }) {
  if (items.length === 0) {
    return <span style={{ color: 'var(--ds-text-muted)', fontSize: 12 }}>none detected</span>;
  }
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 3 }}>
      {items.map((item) => (
        <li
          key={`${item.kind}:${item.label}`}
          style={{ display: 'flex', gap: 6, alignItems: 'baseline', fontSize: 12 }}
        >
          <span
            style={{
              fontSize: 9,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--ds-text-placeholder)',
              border: '1px solid var(--ds-border)',
              borderRadius: 3,
              padding: '0 4px',
              flexShrink: 0,
            }}
          >
            {RELATION_LABEL[item.kind]}
          </span>
          <span style={{ color: 'var(--ds-text-secondary)', wordBreak: 'break-word' }}>
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function RouteDetail({
  route,
  relations,
  onShowInTree,
  onFocusInDiagram,
  onSearchRelated,
  onShowTechnical,
}: RouteDetailProps) {
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
        {(onShowInTree || onSearchRelated || onFocusInDiagram || onShowTechnical) && (
          <div
            style={{
              display: 'flex',
              gap: 'var(--ds-space-2)',
              marginTop: 2,
              flexWrap: 'wrap',
            }}
          >
            {onFocusInDiagram && (
              <DsButton tone="secondary" onClick={onFocusInDiagram}>
                Focus in Diagram
              </DsButton>
            )}
            {onShowInTree && (
              <DsButton tone="secondary" onClick={onShowInTree}>
                Show in Tree
              </DsButton>
            )}
            {onShowTechnical && (
              <DsButton tone="tertiary" onClick={onShowTechnical}>
                Technical detail
              </DsButton>
            )}
            {onSearchRelated && (
              <DsButton tone="tertiary" onClick={onSearchRelated}>
                Search related
              </DsButton>
            )}
          </div>
        )}
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

      {relations && (
        <>
          <Field label={`Incoming — ${relations.incoming.length}`}>
            <RelationList items={relations.incoming} />
          </Field>
          <Field label={`Outgoing — ${relations.outgoing.length}`}>
            <RelationList items={relations.outgoing} />
          </Field>
        </>
      )}

      {/* Collapsed by default — a page can pull in 20+ modules and dumping them
          buries the four facts above, which are what the panel is really for. */}
      {imports.length > 0 && (
        <details>
          <summary
            style={{
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--ds-text-muted)',
            }}
          >
            {`Depends on — ${firstParty.length} internal, ${packages.length} packages`}
          </summary>
          <div style={{ display: 'grid', gap: 'var(--ds-space-3)', marginTop: 8 }}>
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
        </details>
      )}
    </div>
  );
}
