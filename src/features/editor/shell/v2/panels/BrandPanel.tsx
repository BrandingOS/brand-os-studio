// BrandPanel — document-level properties + brand-kit overview.
//
// Phase 5a moves the document-level controls out of the legacy
// EditorPropertiesPanel and parks them here:
//   • Page dimensions (width × height of the active page)
//   • Page background color
//   • Applied brand status (read-only display in 5a; "Re-apply brand"
//     wires in 5b)
// Plus a collapsed accordion mirroring /setup's SetupSidebar — Logo,
// Color, Typography, etc. — read-only summaries pulled from the
// supplied Brand object. All sections are open by default; clicking
// a header collapses the section, matching the Variant 4 pattern.

import { useCallback, useState } from 'react';
import {
  Camera,
  Check,
  ChevronDown,
  Globe2,
  MessageCircle,
  PenTool,
  Pipette,
  Shapes,
  Type as TypeIcon,
} from 'lucide-react';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { BrandOSDocument, Page } from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';

interface Props {
  adapter: EditorAdapter;
  doc: BrandOSDocument;
  /** Active page id — controls which page's dimensions/bg the
   *  document-level form edits. */
  activePageId: string;
  /** Optional brand context. When undefined the brand-kit overview
   *  collapses to a single placeholder entry. */
  brand?: Brand;
}

export function BrandPanel({ adapter, doc, activePageId, brand }: Props) {
  const page = doc.pages.find((p) => p.id === activePageId) ?? doc.pages[0];
  if (!page) return null;

  return (
    <>
      {/* Brand-name subtitle. The canonical "Brand" title now lives
          in the SecondaryPanel header bar; this row is a small
          supporting line so the user can see WHICH brand kit the
          panel is operating against. */}
      <div
        data-brand-panel-subtitle
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
          fontSize: 12,
          color: brand ? 'var(--text-secondary)' : 'var(--text-muted)',
        }}
      >
        {brand?.name ?? 'No brand attached'}
      </div>

      <nav className="panel-list">
        <DocumentSection adapter={adapter} page={page} />
        <BrandIdentitySection brand={brand} />
      </nav>
    </>
  );
}

// ─── Document-level controls (moved from EditorPropertiesPanel) ────────

function DocumentSection({
  adapter,
  page,
}: {
  adapter: EditorAdapter;
  page: Page;
}) {
  const [open, setOpen] = useState(true);

  const setDimensions = useCallback(
    (width: number, height: number) => {
      adapter.updatePageDimensions(page.id, width, height);
    },
    [adapter, page.id],
  );

  return (
    <SectionRow
      title="Document"
      sub={`${page.width} × ${page.height}`}
      isOpen={open}
      onToggle={() => setOpen((v) => !v)}
    >
      <div className="grid grid-cols-2 gap-2 px-1">
        <NumberField
          label="Width"
          value={page.width}
          min={1}
          onChange={(v) => setDimensions(v, page.height)}
        />
        <NumberField
          label="Height"
          value={page.height}
          min={1}
          onChange={(v) => setDimensions(page.width, v)}
        />
      </div>
      {/* Page background sits in BrandOSDocument as page.background.
          The adapter does not expose a single setPageBackground call;
          the document mirror is updated via loadDocument when needed.
          For 5a, we display it read-only and flag that color picking
          will land alongside the page-level controls in Phase 4.5. */}
      <div className="mt-2 px-1">
        <p
          className="text-[10px] font-medium uppercase"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.14em' }}
        >
          Background
        </p>
        <div
          className="mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px]"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              background: cssColor(page.background),
              boxShadow: '0 0 0 1px var(--border)',
            }}
          />
          <span className="font-mono">{cssColor(page.background)}</span>
        </div>
      </div>
    </SectionRow>
  );
}

// ─── Brand-kit overview (read-only summary) ────────────────────────────

type BrandEntryKey =
  | 'logo'
  | 'color'
  | 'fonts'
  | 'icons'
  | 'photos'
  | 'website'
  | 'voice';

const BRAND_ENTRY_KEYS: BrandEntryKey[] = [
  'logo',
  'color',
  'fonts',
  'icons',
  'photos',
  'website',
  'voice',
];

function BrandIdentitySection({ brand }: { brand?: Brand }) {
  // Hooks must come before any conditional return — keep them
  // unconditional so the no-brand and has-brand cases share the
  // same hook order. The Set is seeded from BRAND_ENTRY_KEYS so
  // every entry starts open (matches /setup's accordion behavior).
  const [open, setOpen] = useState<Set<BrandEntryKey>>(
    () => new Set(BRAND_ENTRY_KEYS),
  );
  const toggle = useCallback((key: BrandEntryKey) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  if (!brand) {
    return (
      <p
        className="px-2 py-3 text-[11px]"
        style={{ color: 'var(--text-muted)' }}
      >
        No brand attached. Open this design from inside a brand to see its
        identity here.
      </p>
    );
  }

  const logoCount = countLogos(brand);
  const colorCount = countColors(brand);
  const fontCount = countFonts(brand);

  type Entry = {
    key: BrandEntryKey;
    name: string;
    sub: string;
    Icon: typeof PenTool;
  };

  const entries: Entry[] = [
    { key: 'logo', name: 'Logo', sub: `${logoCount} variants`, Icon: PenTool },
    { key: 'color', name: 'Color', sub: `${colorCount} colors`, Icon: Pipette },
    { key: 'fonts', name: 'Typography', sub: `${fontCount} fonts`, Icon: TypeIcon },
    { key: 'icons', name: 'Iconography', sub: '—', Icon: Shapes },
    { key: 'photos', name: 'Photography', sub: '—', Icon: Camera },
    {
      key: 'website',
      name: 'Website',
      sub: brand.publicUrl ?? `${brand.slug}.com`,
      Icon: Globe2,
    },
    {
      key: 'voice',
      name: 'About',
      sub: brand.tone ? brand.tone : '—',
      Icon: MessageCircle,
    },
  ];

  return (
    <>
      {entries.map((e) => (
        <SectionRow
          key={e.key}
          title={e.name}
          sub={e.sub}
          Icon={e.Icon}
          isOpen={open.has(e.key)}
          onToggle={() => toggle(e.key)}
          status="added"
        >
          <p
            className="px-1 py-2 text-[11px]"
            style={{ color: 'var(--text-muted)' }}
          >
            Read-only summary in 5a. Editing brand assets stays inside /b/{brand.slug}/setup.
          </p>
        </SectionRow>
      ))}
    </>
  );
}

// ─── Section primitive — accordion row matching Variant 4 ──────────────

function SectionRow({
  title,
  sub,
  Icon,
  isOpen,
  onToggle,
  status,
  children,
}: {
  title: string;
  sub?: string;
  Icon?: typeof PenTool;
  isOpen: boolean;
  onToggle: () => void;
  status?: 'added';
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '7px 8px',
          borderRadius: 8,
          border: '1px solid transparent',
          background: isOpen ? 'var(--accent-muted)' : 'transparent',
          width: '100%',
          textAlign: 'left',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          font: 'inherit',
          transition: 'background 180ms var(--ease)',
        }}
      >
        {Icon ? (
          <span className="panel-item-thumb" aria-hidden style={{ flexShrink: 0 }}>
            <Icon size={16} strokeWidth={1.6} />
          </span>
        ) : null}
        <span className="panel-item-meta" style={{ flex: 1 }}>
          <span className="panel-item-name">{title}</span>
          {sub ? <span className="panel-item-sub">{sub}</span> : null}
        </span>
        {status === 'added' ? (
          <span
            className="status-chip is-added"
            aria-hidden
            style={{ flexShrink: 0 }}
          >
            <Check size={14} />
          </span>
        ) : null}
        <ChevronDown
          size={14}
          style={{
            color: 'var(--text-muted)',
            flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 180ms var(--ease)',
          }}
        />
      </button>
      {isOpen ? (
        <div style={{ padding: '6px 6px 12px 6px' }}>{children}</div>
      ) : null}
    </div>
  );
}

// ─── Field primitives ──────────────────────────────────────────────────

function NumberField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label
      className="block"
      style={{ color: 'var(--text-secondary)', fontSize: 10 }}
    >
      <span style={{ textTransform: 'uppercase', letterSpacing: '0.14em' }}>
        {label}
      </span>
      <input
        type="number"
        value={value}
        min={min}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
        className="mt-1 w-full rounded-lg px-2 py-1 text-[11px] outline-none"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
        }}
      />
    </label>
  );
}

// ─── Brand summary helpers ─────────────────────────────────────────────

/**
 * Coerce a ResolvedValue to a CSS color string. Slot refs are
 * displayed as a placeholder hex (the same hash trick the legacy
 * Properties panel used) until the real brand resolver runs in
 * Phase 3 step 6.
 */
function cssColor(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return `#${value.toString(16).padStart(6, '0')}`;
  // SlotRef — render as a deterministic placeholder hue.
  return '#cccccc';
}

function countLogos(brand: Brand): number {
  if (brand.logoSystem) {
    let n = 0;
    if (brand.logoSystem.primary) n += 1;
    if (brand.logoSystem.secondary) n += 1;
    if (brand.logoSystem.wordmark) n += 1;
    if (brand.logoSystem.iconmark) n += 1;
    if (brand.logoSystem.mono?.black) n += 1;
    if (brand.logoSystem.mono?.white) n += 1;
    return n;
  }
  return brand.logo ? 1 : 0;
}

function countColors(brand: Brand): number {
  if (brand.colorSystem) {
    let n = 0;
    if (brand.colorSystem.primary) n += 1;
    if (brand.colorSystem.secondary) n += 1;
    if (brand.colorSystem.accent) n += 1;
    n += brand.colorSystem.neutrals?.length ?? 0;
    return n;
  }
  return [brand.primaryColor, brand.secondaryColor, brand.accentColor].filter(
    Boolean,
  ).length;
}

function countFonts(brand: Brand): number {
  if (brand.typography) {
    let n = 1; // primary is required
    if (brand.typography.secondary) n += 1;
    if (brand.typography.accent) n += 1;
    return n;
  }
  return [brand.fonts?.primary, brand.fonts?.secondary].filter(Boolean).length;
}
