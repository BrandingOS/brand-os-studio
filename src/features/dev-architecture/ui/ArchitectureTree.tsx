/**
 * Tree view — browse the app top-down without knowing what to search for.
 *
 * Renders the derived tree from `tree.ts`, which is a pure function over the
 * SAME generated map the Search view uses. Nothing is registered here: a new
 * route in App.tsx becomes a new row on the next reload.
 *
 * Reads like Finder or the VS Code explorer: product area → URL region → page,
 * with the technical detail collapsed one level down so the first visual level
 * stays understandable.
 */
import { useCallback } from 'react';

import { DsButton } from '@/shared/ds';

import { badgesFor, primaryRoute, type RouteBadge, type TreeNode } from '../tree';
import type { ImportRef, RouteNode } from '../types';
import { copyToClipboard, openInEditor } from './openInEditor';

/**
 * Row hover/selection styling. Inline styles can't express `:hover`, and row
 * actions must stay hidden until they're wanted — 131 rows each showing four
 * buttons is density, not orientation.
 */
const TREE_CSS = `
.arch-row .arch-actions { opacity: 0; transition: opacity var(--ds-duration-state) var(--ds-ease); }
.arch-row:hover .arch-actions,
.arch-row:focus-within .arch-actions,
.arch-row[aria-selected="true"] .arch-actions { opacity: 1; }
.arch-row:hover { background: var(--ds-surface-subtle); }
.arch-row:focus-visible { outline: 2px solid var(--ds-focus-ring); outline-offset: -2px; }
.arch-drilldown summary::-webkit-details-marker { display: none; }
`;

/** Badge colours: structural facts are quiet, warnings are not. */
const BADGE_STYLE: Record<RouteBadge, { fg: string; bg: string; border: string }> = {
  ROUTE: { fg: 'var(--ds-success-fg)', bg: 'var(--ds-success-bg)', border: 'var(--ds-success)' },
  INDEX: { fg: 'var(--ds-text-muted)', bg: 'var(--ds-surface-subtle)', border: 'var(--ds-border)' },
  LAYOUT: { fg: 'var(--ds-text-muted)', bg: 'var(--ds-surface-subtle)', border: 'var(--ds-border)' },
  REDIRECT: { fg: 'var(--ds-warning-fg)', bg: 'var(--ds-warning-bg)', border: 'var(--ds-warning-border)' },
  SPLAT: { fg: 'var(--ds-text-muted)', bg: 'var(--ds-surface-subtle)', border: 'var(--ds-border)' },
  DYNAMIC: { fg: 'var(--ds-text-muted)', bg: 'var(--ds-surface-subtle)', border: 'var(--ds-border)' },
  DEV: { fg: 'var(--ds-text-secondary)', bg: 'var(--ds-surface-subtle)', border: 'var(--ds-border-strong)' },
  LEGACY: { fg: 'var(--ds-danger-fg)', bg: 'var(--ds-danger-bg)', border: 'var(--ds-danger-border)' },
};

function Badge({ badge }: { badge: RouteBadge }) {
  const style = BADGE_STYLE[badge];
  return (
    <span
      style={{
        fontSize: 9,
        lineHeight: '14px',
        letterSpacing: '0.05em',
        padding: '0 4px',
        borderRadius: 3,
        color: style.fg,
        background: style.bg,
        border: `1px solid ${style.border}`,
        flexShrink: 0,
      }}
    >
      {badge}
    </span>
  );
}

/**
 * Chevron / leaf gutter, sized so labels align at every depth.
 *
 * Clickable in its own right: on a leaf page the row click selects (opening the
 * detail panel) while the chevron opens the inline drill-down, so you can read
 * technical detail without losing your place — VS Code's file-vs-folder split.
 */
function Twisty({
  open,
  canExpand,
  title,
  onToggle,
}: {
  open: boolean;
  canExpand: boolean;
  title: string;
  onToggle: () => void;
}) {
  if (!canExpand) {
    return <span aria-hidden style={{ width: 14, flexShrink: 0 }} />;
  }

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      title={title}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      style={{
        all: 'unset',
        cursor: 'pointer',
        width: 14,
        flexShrink: 0,
        color: 'var(--ds-text-muted)',
        fontSize: 9,
        textAlign: 'center',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          transform: open ? 'rotate(90deg)' : 'none',
          transition: `transform var(--ds-duration-state) var(--ds-ease)`,
        }}
      >
        ▶
      </span>
    </button>
  );
}

interface ActionsProps {
  route: RouteNode;
}

/** Row actions — the four things you want while browsing code. */
function RowActions({ route }: ActionsProps) {
  const stop = (event: React.MouseEvent) => event.stopPropagation();

  return (
    <span
      onClick={stop}
      className="arch-actions"
      style={{ display: 'inline-flex', gap: 2, marginLeft: 'auto', flexShrink: 0 }}
    >
      {route.sourceFile && (
        <TinyAction
          label="Open"
          title={`Open ${route.sourceFile} in your editor`}
          onClick={() => void openInEditor({ file: route.sourceFile as string })}
        />
      )}
      <TinyAction
        label="Route"
        title={`Open the <Route> at ${route.routeFile}:${route.routeLine}`}
        onClick={() => void openInEditor({ file: route.routeFile, line: route.routeLine })}
      />
      {route.sourceFile && (
        <TinyAction
          label="Path"
          title="Copy the source file path"
          onClick={() => void copyToClipboard(route.sourceFile as string)}
        />
      )}
      <TinyAction
        label="URL"
        title="Copy the route URL"
        onClick={() => void copyToClipboard(route.path)}
      />
    </span>
  );
}

function TinyAction({
  label,
  title,
  onClick,
}: {
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        all: 'unset',
        cursor: 'pointer',
        fontSize: 10,
        padding: '1px 5px',
        borderRadius: 3,
        color: 'var(--ds-text-muted)',
        border: '1px solid transparent',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.borderColor = 'var(--ds-border)';
        event.currentTarget.style.color = 'var(--ds-text)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = 'transparent';
        event.currentTarget.style.color = 'var(--ds-text-muted)';
      }}
    >
      {label}
    </button>
  );
}

/** One `label: value` line in a page's drill-down. */
function DetailLine({
  label,
  value,
  mono = true,
  onOpen,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onOpen?: () => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '1px 0' }}>
      <span
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--ds-text-placeholder)',
          width: 76,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          title="Open in editor"
          style={{
            all: 'unset',
            cursor: 'pointer',
            fontFamily: mono ? 'var(--ds-font-mono)' : 'inherit',
            fontSize: 11,
            color: 'var(--ds-text)',
            textDecoration: 'underline dotted',
            wordBreak: 'break-all',
          }}
        >
          {value}
        </button>
      ) : (
        <span
          style={{
            fontFamily: mono ? 'var(--ds-font-mono)' : 'inherit',
            fontSize: 11,
            color: 'var(--ds-text-secondary)',
            wordBreak: 'break-all',
          }}
        >
          {value}
        </span>
      )}
    </div>
  );
}

/**
 * Imports live behind their own disclosure. A page can pull in 20+ modules and
 * dumping them into the tree would bury the structure the view exists to show.
 */
function ImportsDisclosure({ imports }: { imports: ImportRef[] }) {
  const firstParty = imports.filter((ref) => ref.kind !== 'external');
  const packages = imports.length - firstParty.length;

  return (
    <details className="arch-drilldown" style={{ padding: '1px 0' }}>
      <summary
        style={{
          cursor: 'pointer',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--ds-text-placeholder)',
          listStyle: 'none',
        }}
      >
        Imports — {firstParty.length} internal, {packages} packages
      </summary>
      <ul
        style={{
          margin: '4px 0 2px',
          padding: '0 0 0 76px',
          listStyle: 'none',
          display: 'grid',
          gap: 1,
        }}
      >
        {imports.map((ref, index) => (
          <li
            key={`${index}-${ref.specifier}`}
            style={{
              fontFamily: 'var(--ds-font-mono)',
              fontSize: 11,
              color: ref.kind === 'external' ? 'var(--ds-text-placeholder)' : 'var(--ds-text-secondary)',
            }}
          >
            {ref.file ? (
              <button
                type="button"
                onClick={() => void openInEditor({ file: ref.file as string })}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  textDecoration: 'underline dotted',
                  color: 'inherit',
                }}
              >
                {ref.specifier}
              </button>
            ) : (
              ref.specifier
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

interface TreeRowsProps {
  node: TreeNode;
  expanded: Set<string>;
  selectedRouteId: string | null;
  highlightRouteId: string | null;
  onToggle: (id: string) => void;
  onSelect: (routeId: string) => void;
}

function TreeRows({
  node,
  expanded,
  selectedRouteId,
  highlightRouteId,
  onToggle,
  onSelect,
}: TreeRowsProps) {
  const primary = primaryRoute(node.routes);
  const hasChildren = node.children.length > 0;
  // A leaf page uses its chevron for the drill-down; a branch uses it for children.
  const isLeafPage = !hasChildren && Boolean(primary);
  const canExpand = hasChildren || isLeafPage;
  const isOpen = expanded.has(node.id);
  const isSelected = Boolean(primary && primary.id === selectedRouteId);
  const isHighlighted = Boolean(primary && primary.id === highlightRouteId);

  const indent = 8 + node.depth * 14;

  /**
   * Row click follows the VS Code convention: a folder toggles, a file opens.
   * A branch therefore expands (and selects, when something is mounted on it),
   * while a leaf page only selects — its drill-down is the chevron's job, so
   * browsing never forces metadata into view.
   */
  const handleRowClick = () => {
    if (hasChildren) onToggle(node.id);
    if (primary) onSelect(primary.id);
  };

  return (
    <>
      <div
        role="treeitem"
        className="arch-row"
        aria-expanded={canExpand ? isOpen : undefined}
        aria-selected={isSelected}
        data-node-id={node.id}
        data-route-id={primary?.id}
        tabIndex={0}
        onClick={handleRowClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleRowClick();
            return;
          }
          // Arrow keys drive expansion the way a tree widget should.
          if (event.key === 'ArrowRight' && canExpand && !isOpen) {
            event.preventDefault();
            onToggle(node.id);
          }
          if (event.key === 'ArrowLeft' && canExpand && isOpen) {
            event.preventDefault();
            onToggle(node.id);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          paddingLeft: indent,
          paddingRight: 8,
          minHeight: node.kind === 'area' ? 28 : 24,
          cursor: canExpand || primary ? 'pointer' : 'default',
          background: isHighlighted
            ? 'var(--ds-warning-bg)'
            : isSelected
              ? 'var(--ds-surface-hover)'
              : 'transparent',
          boxShadow: isSelected ? 'inset 2px 0 0 var(--ds-text)' : 'none',
          borderRadius: 3,
        }}
      >
        <Twisty
          open={isOpen}
          canExpand={canExpand}
          title={hasChildren ? 'Expand / collapse' : 'Show route, component, source and imports'}
          onToggle={() => onToggle(node.id)}
        />

        <span
          style={{
            fontSize: node.kind === 'area' ? 11 : 13,
            fontWeight: node.kind === 'area' ? 600 : isSelected ? 600 : 450,
            letterSpacing: node.kind === 'area' ? '0.07em' : undefined,
            textTransform: node.kind === 'area' ? 'uppercase' : undefined,
            color: node.kind === 'area' ? 'var(--ds-text-secondary)' : 'var(--ds-text)',
            whiteSpace: 'nowrap',
          }}
        >
          {node.label}
        </span>

        {/* The URL, whenever it adds information the label doesn't already carry. */}
        {node.path && node.path !== node.label && (
          <span
            style={{
              fontFamily: 'var(--ds-font-mono)',
              fontSize: 10.5,
              color: 'var(--ds-text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {node.path}
          </span>
        )}

        {primary &&
          badgesFor(primary)
            .filter((badge) => badge !== 'ROUTE')
            .map((badge) => <Badge key={badge} badge={badge} />)}

        {hasChildren && (
          <span
            style={{
              fontSize: 10,
              color: 'var(--ds-text-placeholder)',
              flexShrink: 0,
            }}
          >
            {node.routeCount}
          </span>
        )}

        {primary && <RowActions route={primary} />}
      </div>

      {/* Leaf drill-down: route / component / source / imports, one level down. */}
      {isOpen && isLeafPage && primary && (
        <div
          data-drilldown={primary.id}
          style={{
            paddingLeft: indent + 26,
            paddingRight: 8,
            paddingBottom: 4,
            borderLeft: '1px solid var(--ds-hairline)',
            marginLeft: indent + 12,
          }}
        >
          <DetailLine label="Route" value={primary.path} />
          {primary.redirectTo && <DetailLine label="Redirects" value={primary.redirectTo} />}
          <DetailLine label="Component" value={primary.component ?? '—'} />
          {primary.sourceFile && (
            <DetailLine
              label="Source"
              value={primary.sourceFile}
              onOpen={() => void openInEditor({ file: primary.sourceFile as string })}
            />
          )}
          <DetailLine
            label="Defined in"
            value={`${primary.routeFile}:${primary.routeLine}`}
            onOpen={() =>
              void openInEditor({ file: primary.routeFile, line: primary.routeLine })
            }
          />
          {primary.analysis?.imports && primary.analysis.imports.length > 0 && (
            <ImportsDisclosure imports={primary.analysis.imports} />
          )}
        </div>
      )}

      {isOpen &&
        hasChildren &&
        node.children.map((child) => (
          <TreeRows
            key={child.id}
            node={child}
            expanded={expanded}
            selectedRouteId={selectedRouteId}
            highlightRouteId={highlightRouteId}
            onToggle={onToggle}
            onSelect={onSelect}
          />
        ))}
    </>
  );
}

export interface ArchitectureTreeProps {
  tree: TreeNode;
  expanded: Set<string>;
  selectedRouteId: string | null;
  /** Briefly tinted after "Show in Tree" so the eye lands on the right row. */
  highlightRouteId: string | null;
  onToggle: (id: string) => void;
  onSelect: (routeId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export function ArchitectureTree({
  tree,
  expanded,
  selectedRouteId,
  highlightRouteId,
  onToggle,
  onSelect,
  onExpandAll,
  onCollapseAll,
}: ArchitectureTreeProps) {
  const toggle = useCallback((id: string) => onToggle(id), [onToggle]);

  return (
    <div>
      <style>{TREE_CSS}</style>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--ds-space-2)',
          padding: '0 0 var(--ds-space-2)',
        }}
      >
        <DsButton tone="tertiary" onClick={onExpandAll}>
          Expand all
        </DsButton>
        <DsButton tone="tertiary" onClick={onCollapseAll}>
          Collapse all
        </DsButton>
        <span style={{ fontSize: 11, color: 'var(--ds-text-muted)', marginLeft: 'auto' }}>
          {tree.routeCount} routes · {tree.children.length} areas
        </span>
      </div>

      <div
        role="tree"
        aria-label="Application architecture"
        style={{
          border: '1px solid var(--ds-border)',
          borderRadius: 'var(--ds-radius-panel)',
          background: 'var(--ds-surface)',
          padding: 'var(--ds-space-2) 0',
          maxHeight: 'calc(100vh - 290px)',
          overflow: 'auto',
        }}
      >
        <TreeRows
          node={tree}
          expanded={expanded}
          selectedRouteId={selectedRouteId}
          highlightRouteId={highlightRouteId}
          onToggle={toggle}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}
