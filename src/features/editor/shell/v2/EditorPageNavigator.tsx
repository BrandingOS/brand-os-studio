// EditorPageNavigator (v2) — floating page rail on the right of the
// editor. Same functionality as the legacy left-side `PageNavigator`
// (add / duplicate / delete / reorder, master-page apply, switch
// active page) but in the cosmos floating-card visual treatment.
//
// Visible only when the active ContentTypeConfig has `pageModel: 'multi'`.
// Single-page surfaces (social-post, banner, business-card) hide it.

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Edit3,
  Layers,
  Link as LinkIcon,
  Plus,
  Trash2,
  Unlink,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { BrandOSDocument, Page } from '@/features/editor/schema';
import type { ContentTypeConfig } from '@/features/editor/content-types';
import { cn } from '@/lib/utils';

interface Props {
  adapter: EditorAdapter;
  doc: BrandOSDocument;
  activePageId: string;
  editingMasterId: string | null;
  contentType: ContentTypeConfig;
  onCollapse: () => void;
}

const NEW_PAGE_NAME = (n: number) => `Slide ${n}`;

export function EditorPageNavigator({
  adapter,
  doc,
  activePageId,
  editingMasterId,
  contentType,
  onCollapse,
}: Props) {
  const handleAddPage = () => {
    const active = doc.pages.find((p) => p.id === activePageId) ?? doc.pages[0];
    adapter.addPage({
      id: crypto.randomUUID(),
      name: NEW_PAGE_NAME(doc.pages.length + 1),
      width: active?.width ?? contentType.defaultDimensions.width,
      height: active?.height ?? contentType.defaultDimensions.height,
      background: '#ffffff',
      masterPageId: active?.masterPageId ?? null,
      layers: [],
    });
  };

  return (
    <div className="flex py-3 pl-1 pr-2" style={{ flexShrink: 0 }}>
      <aside
        className="relative flex w-44 flex-col py-2"
        data-page-navigator
        style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-sm)',
          overflow: 'visible',
        }}
        aria-label="Page navigator"
      >
        <button
          onClick={onCollapse}
          title="Collapse pages"
          aria-label="Collapse pages"
          className="absolute -left-4 top-5 z-30 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-secondary)',
            boxShadow: 'var(--shadow-md)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--surface-elevated)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <p
          className="px-3 py-1 text-[10px] font-semibold uppercase"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.14em' }}
        >
          Pages · {doc.pages.length}
        </p>

        <ul className="flex-1 space-y-1.5 overflow-auto px-2 py-1">
          {doc.pages.map((p, idx) => (
            <PageCell
              key={p.id}
              page={p}
              index={idx}
              active={p.id === activePageId && editingMasterId === null}
              adapter={adapter}
              doc={doc}
              contentType={contentType}
            />
          ))}
        </ul>

        <div className="border-t px-2 pt-2" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={handleAddPage}
            className="flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] transition-colors"
            style={{
              border: '1px dashed var(--dash)',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--dash-strong)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--dash)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <Plus className="h-3 w-3" /> Add page
          </button>
          {contentType.supportsMasterPages ? (
            <MastersSection
              doc={doc}
              adapter={adapter}
              editingMasterId={editingMasterId}
            />
          ) : null}
        </div>
      </aside>
    </div>
  );
}

// ─── Page cell ──────────────────────────────────────────────────────────

function PageCell({
  page,
  index,
  active,
  adapter,
  doc,
  contentType,
}: {
  page: Page;
  index: number;
  active: boolean;
  adapter: EditorAdapter;
  doc: BrandOSDocument;
  contentType: ContentTypeConfig;
}) {
  return (
    <li>
      <button
        type="button"
        className="group relative flex w-full flex-col items-center gap-1 rounded-lg p-1.5 transition-colors"
        style={{
          background: active ? 'var(--accent-muted)' : 'transparent',
          border: active
            ? '1px solid var(--border)'
            : '1px solid transparent',
        }}
        onClick={() => adapter.setActivePage(page.id)}
        onMouseEnter={(e) => {
          if (!active) e.currentTarget.style.background = 'var(--surface-hover)';
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.background = 'transparent';
        }}
        aria-current={active ? 'page' : undefined}
      >
        <div
          className="aspect-square w-full rounded"
          style={{
            background: cssBackground(page.background),
            boxShadow: '0 0 0 1px var(--border)',
          }}
        />
        <span
          className="truncate text-[9px]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {index + 1}. {page.name || 'Untitled'}
        </span>
        <PageMenu
          page={page}
          adapter={adapter}
          doc={doc}
          contentType={contentType}
        />
      </button>
    </li>
  );
}

/**
 * Page background can be a SlotRef under the schema; render as
 * placeholder grey when it's not a literal hex/number.
 */
function cssBackground(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return `#${value.toString(16).padStart(6, '0')}`;
  return '#cccccc';
}

// ─── Per-page dropdown menu ─────────────────────────────────────────────

function PageMenu({
  page,
  adapter,
  doc,
  contentType,
}: {
  page: Page;
  adapter: EditorAdapter;
  doc: BrandOSDocument;
  contentType: ContentTypeConfig;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        asChild
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Page options"
          className="absolute right-1 top-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-[180px] rounded-lg p-1 text-[12px]"
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {/* Step 7 — Smart duplicate submenu. As-is keeps Phase 2's
              clone behavior; "As variant" wipes content while keeping
              brand structure (text → '', images dropped, shapes /
              SVGs / logos kept); "Empty" preserves only dimensions
              + master binding. All three insert at sourceIndex + 1
              and produce a single undo entry. */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 outline-none"
              data-page-action="duplicate"
            >
              <Copy className="h-3 w-3" /> Duplicate
              <ChevronRight className="ml-auto h-3 w-3 opacity-60" />
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                sideOffset={2}
                className="z-50 min-w-[180px] rounded-lg p-1 text-[12px]"
                style={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <DropdownMenu.Item
                  className="flex cursor-pointer flex-col items-start gap-0 rounded-md px-2 py-1 outline-none"
                  onSelect={() => adapter.duplicatePage(page.id)}
                  data-duplicate-mode="as-is"
                >
                  <span>As-is</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Full clone of this page
                  </span>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex cursor-pointer flex-col items-start gap-0 rounded-md px-2 py-1 outline-none"
                  onSelect={() => adapter.duplicatePageAsVariant(page.id)}
                  data-duplicate-mode="as-variant"
                >
                  <span>As variant</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Keep styling + brand, clear text + images
                  </span>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex cursor-pointer flex-col items-start gap-0 rounded-md px-2 py-1 outline-none"
                  onSelect={() => adapter.duplicatePageEmpty(page.id)}
                  data-duplicate-mode="empty"
                >
                  <span>Empty</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Same dimensions + master, no layers
                  </span>
                </DropdownMenu.Item>
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>
          {contentType.supportsMasterPages ? (
            <>
              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 outline-none">
                  <LinkIcon className="h-3 w-3" /> Apply master
                </DropdownMenu.SubTrigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.SubContent
                    sideOffset={2}
                    className="z-50 min-w-[180px] rounded-lg p-1 text-[12px]"
                    style={{
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border)',
                      boxShadow: 'var(--shadow-md)',
                    }}
                  >
                    {doc.masterPages.length === 0 ? (
                      <DropdownMenu.Item
                        disabled
                        className="rounded-md px-2 py-1"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        No masters yet
                      </DropdownMenu.Item>
                    ) : (
                      doc.masterPages.map((m) => (
                        <DropdownMenu.Item
                          key={m.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 outline-none"
                          onSelect={() => adapter.applyMasterToPage(page.id, m.id)}
                        >
                          <Layers className="h-3 w-3" /> {m.name}
                        </DropdownMenu.Item>
                      ))
                    )}
                  </DropdownMenu.SubContent>
                </DropdownMenu.Portal>
              </DropdownMenu.Sub>
              {page.masterPageId ? (
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 outline-none"
                  onSelect={() => adapter.applyMasterToPage(page.id, null)}
                >
                  <Unlink className="h-3 w-3" /> Detach master
                </DropdownMenu.Item>
              ) : null}
            </>
          ) : null}
          <DropdownMenu.Separator
            className="my-1 h-px"
            style={{ background: 'var(--border)' }}
          />
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 outline-none"
            style={{ color: 'var(--critical)' }}
            onSelect={() => {
              if (doc.pages.length > 1) adapter.removePage(page.id);
            }}
          >
            <Trash2 className="h-3 w-3" /> Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ─── Masters list ──────────────────────────────────────────────────────

function MastersSection({
  doc,
  adapter,
  editingMasterId,
}: {
  doc: BrandOSDocument;
  adapter: EditorAdapter;
  editingMasterId: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="mt-2 border-t pt-1.5"
      style={{ borderColor: 'var(--border)' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-[10px] font-medium uppercase"
        style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}
      >
        Masters · {doc.masterPages.length}
        <ChevronDown
          className={cn('h-3 w-3 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open ? (
        <ul className="mt-1 space-y-1">
          {doc.masterPages.map((m) => (
            <li
              key={m.id}
              className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-[11px]"
              style={{
                background:
                  editingMasterId === m.id ? 'var(--accent-muted)' : 'transparent',
                color:
                  editingMasterId === m.id
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
              }}
              onClick={() =>
                editingMasterId === m.id
                  ? adapter.exitMasterMode()
                  : adapter.enterMasterMode(m.id)
              }
            >
              <Layers className="h-3 w-3" />
              <span className="min-w-0 flex-1 truncate">{m.name}</span>
              {editingMasterId === m.id ? (
                <span
                  className="text-[9px] uppercase"
                  style={{ letterSpacing: '0.1em' }}
                >
                  editing
                </span>
              ) : (
                <Edit3 className="h-2.5 w-2.5 opacity-60" />
              )}
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => {
                adapter.addMasterPage({
                  id: crypto.randomUUID(),
                  name: `Master ${doc.masterPages.length + 1}`,
                  width: doc.pages[0]?.width ?? 1920,
                  height: doc.pages[0]?.height ?? 1080,
                  background: '#ffffff',
                  masterPageId: null,
                  layers: [],
                });
              }}
              className="flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-[11px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Plus className="h-3 w-3" /> New master
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
