// Page navigator — vertical rail showing every page in the document.
// Visible only when the active ContentTypeConfig has pageModel='multi'.
//
// Phase 2 scope: numbered cells with name + dimensions, click to switch
// active page, "+" to add, dropdown menu per cell for duplicate/delete/
// apply-master/detach-master/edit-master. Real thumbnail rendering is
// a Phase 2+ polish (rendering each page to a 100px PNG on every
// document change is expensive; cache + invalidate is its own design).

import { useState } from 'react';
import {
  ChevronDown,
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
}

const NEW_PAGE_NAME = (n: number) => `Slide ${n}`;

export function PageNavigator({
  adapter,
  doc,
  activePageId,
  editingMasterId,
  contentType,
}: Props) {
  const handleAddPage = () => {
    // Clone the active page's dimensions so new pages match the
    // document's surface, not the content-type's default (the user
    // may have already overridden the size).
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
    <aside
      className="flex w-44 flex-col border-r bg-background"
      aria-label="Page navigator"
    >
      <header className="flex items-center justify-between border-b px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Pages
        <span className="text-[10px] normal-case opacity-70">{doc.pages.length}</span>
      </header>

      <ul className="flex-1 overflow-auto px-2 py-2 space-y-1">
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

      <footer className="border-t px-2 py-2 space-y-1">
        <button
          type="button"
          onClick={handleAddPage}
          className="flex w-full items-center justify-center gap-1.5 rounded border bg-background py-1.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          Add page
        </button>
        {contentType.supportsMasterPages ? (
          <MastersSection
            doc={doc}
            adapter={adapter}
            editingMasterId={editingMasterId}
          />
        ) : null}
      </footer>
    </aside>
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
      <div
        className={cn(
          'group flex items-center gap-2 rounded border px-2 py-1.5 text-[11px] cursor-pointer transition-colors',
          active
            ? 'border-primary bg-primary/5 text-foreground'
            : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/50',
        )}
        onClick={() => adapter.setActivePage(page.id)}
        aria-current={active ? 'page' : undefined}
      >
        <span className="text-[10px] tabular-nums opacity-60 w-4 text-right">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1 truncate">{page.name || 'Untitled'}</span>
        <span className="text-[9px] opacity-50 hidden xl:inline">
          {page.width}×{page.height}
        </span>
        <PageMenu
          page={page}
          adapter={adapter}
          doc={doc}
          contentType={contentType}
        />
      </div>
      {page.masterPageId ? (
        <p className="ml-6 mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground/70">
          on {doc.masterPages.find((m) => m.id === page.masterPageId)?.name ?? 'master'}
        </p>
      ) : null}
    </li>
  );
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
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-[180px] rounded-md border bg-popover p-1 text-[12px] shadow-md"
        >
          <DropdownMenu.Item
            className="flex items-center gap-2 rounded px-2 py-1 outline-none cursor-pointer hover:bg-muted"
            onSelect={() => adapter.duplicatePage(page.id)}
          >
            <Copy className="h-3 w-3" /> Duplicate
          </DropdownMenu.Item>
          {contentType.supportsMasterPages ? (
            <>
              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger className="flex items-center gap-2 rounded px-2 py-1 outline-none cursor-pointer hover:bg-muted">
                  <LinkIcon className="h-3 w-3" /> Apply master
                </DropdownMenu.SubTrigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.SubContent
                    sideOffset={2}
                    className="z-50 min-w-[180px] rounded-md border bg-popover p-1 text-[12px] shadow-md"
                  >
                    {doc.masterPages.length === 0 ? (
                      <DropdownMenu.Item
                        disabled
                        className="rounded px-2 py-1 text-muted-foreground"
                      >
                        No masters yet
                      </DropdownMenu.Item>
                    ) : (
                      doc.masterPages.map((m) => (
                        <DropdownMenu.Item
                          key={m.id}
                          className="flex items-center gap-2 rounded px-2 py-1 outline-none cursor-pointer hover:bg-muted"
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
                  className="flex items-center gap-2 rounded px-2 py-1 outline-none cursor-pointer hover:bg-muted"
                  onSelect={() => adapter.applyMasterToPage(page.id, null)}
                >
                  <Unlink className="h-3 w-3" /> Detach master
                </DropdownMenu.Item>
              ) : null}
            </>
          ) : null}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            className="flex items-center gap-2 rounded px-2 py-1 outline-none cursor-pointer text-destructive hover:bg-destructive/10"
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

// ─── Masters list (footer) ──────────────────────────────────────────────

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
    <div className="border-t pt-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
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
              className={cn(
                'flex items-center gap-1 rounded px-1.5 py-1 text-[11px] cursor-pointer',
                editingMasterId === m.id
                  ? 'bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:bg-muted',
              )}
              onClick={() =>
                editingMasterId === m.id
                  ? adapter.exitMasterMode()
                  : adapter.enterMasterMode(m.id)
              }
            >
              <Layers className="h-3 w-3" />
              <span className="min-w-0 flex-1 truncate">{m.name}</span>
              {editingMasterId === m.id ? (
                <span className="text-[9px] uppercase tracking-wider opacity-70">
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
              className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Plus className="h-3 w-3" /> New master
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
