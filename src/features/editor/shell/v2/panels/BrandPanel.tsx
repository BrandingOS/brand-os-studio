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
import { Link } from 'react-router-dom';
import {
  Camera,
  Check,
  ChevronDown,
  ExternalLink,
  Globe2,
  MessageCircle,
  PenTool,
  Pipette,
  Settings,
  Shapes,
  Type as TypeIcon,
} from 'lucide-react';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { BrandOSDocument, Page } from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';
import { logoUrl } from '@/shared/brand/logoUrl';
import { uniqueLogoVariants } from '@/shared/brand/uniqueLogoVariants';
import type { LogoRole } from '@/shared/types/brandAssets';

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

  const logoVariants = collectLogoVariants(brand);
  const colors = collectColors(brand);
  const fonts = collectFonts(brand);
  const icons = collectIcons(brand);
  const photos = collectPhotos(brand);

  type Entry = {
    key: BrandEntryKey;
    name: string;
    sub: string;
    Icon: typeof PenTool;
    body: React.ReactNode;
  };

  const entries: Entry[] = [
    {
      key: 'logo', name: 'Logo',
      sub: `${logoVariants.length} variant${logoVariants.length === 1 ? '' : 's'}`,
      Icon: PenTool,
      body: <LogoBody variants={logoVariants} />,
    },
    {
      key: 'color', name: 'Color',
      sub: `${colors.length} color${colors.length === 1 ? '' : 's'}`,
      Icon: Pipette,
      body: <ColorBody colors={colors} />,
    },
    {
      key: 'fonts', name: 'Typography',
      sub: fonts.length > 0 ? fonts.map((f) => f.family).join(' · ') : '—',
      Icon: TypeIcon,
      body: <FontsBody fonts={fonts} />,
    },
    {
      key: 'icons', name: 'Iconography',
      sub: icons.length > 0 ? `${icons.length} icon${icons.length === 1 ? '' : 's'}` : '—',
      Icon: Shapes,
      body: <AssetGridBody assets={icons} emptyHint="No icons in this brand yet." />,
    },
    {
      key: 'photos', name: 'Photography',
      sub: photos.length > 0 ? `${photos.length} photo${photos.length === 1 ? '' : 's'}` : '—',
      Icon: Camera,
      body: <AssetGridBody assets={photos} emptyHint="No photography in this brand yet." />,
    },
    {
      key: 'website', name: 'Website',
      sub: brand.publicUrl ?? `${brand.slug}.com`,
      Icon: Globe2,
      body: <WebsiteBody brand={brand} />,
    },
    {
      key: 'voice', name: 'About',
      sub: brand.tone ? brand.tone : '—',
      Icon: MessageCircle,
      body: <AboutBody brand={brand} />,
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
          {e.body}
        </SectionRow>
      ))}
      {/* Single "Edit in Setup" affordance at the bottom — replaces
          the per-section "stays inside /setup" stub copy. The brand
          identity surfaces (logo, color, typography, etc.) are still
          edited at /b/:slug/setup; this just shortens the journey. */}
      <Link
        to={`/b/${brand.slug}/setup`}
        data-brand-panel-setup-link
        className="mx-2 mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
        }}
      >
        <Settings size={12} aria-hidden />
        Edit brand identity
      </Link>
    </>
  );
}

// ─── Per-section bodies ────────────────────────────────────────────────

interface LogoVariantInfo {
  role: LogoRole;
  label: string;
  url?: string;
}

function LogoBody({ variants }: { variants: LogoVariantInfo[] }) {
  if (variants.length === 0) {
    return <EmptyHint>No logo uploaded yet.</EmptyHint>;
  }
  return (
    <div className="grid grid-cols-3 gap-1.5 px-1">
      {variants.map((v) => (
        <div
          key={v.role}
          data-brand-panel-logo={v.role}
          className="flex flex-col items-center gap-1 rounded-md p-1.5"
          style={{
            background: v.role === 'mono.white' ? 'var(--text-primary)' : 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div
            className="flex aspect-square w-full items-center justify-center overflow-hidden rounded"
            style={{ background: 'transparent' }}
          >
            {v.url ? (
              <img
                src={v.url}
                alt={v.label}
                className="max-h-full max-w-full object-contain"
                loading="lazy"
              />
            ) : (
              <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                —
              </span>
            )}
          </div>
          <span
            className="truncate text-[9px]"
            style={{
              color:
                v.role === 'mono.white'
                  ? 'var(--surface)'
                  : 'var(--text-muted)',
            }}
          >
            {v.label}
          </span>
        </div>
      ))}
    </div>
  );
}

interface ColorInfo {
  role: string;
  hex: string;
  name?: string;
}

function ColorBody({ colors }: { colors: ColorInfo[] }) {
  if (colors.length === 0) {
    return <EmptyHint>No colors set yet.</EmptyHint>;
  }
  return (
    <div className="grid grid-cols-3 gap-1.5 px-1">
      {colors.map((c, i) => (
        <button
          key={`${c.role}-${i}`}
          type="button"
          data-brand-panel-color={c.role}
          onClick={() => {
            void navigator.clipboard.writeText(c.hex).catch(() => {});
          }}
          title={`Copy ${c.hex}`}
          className="flex items-center gap-1.5 rounded-md p-1 text-left transition-opacity hover:opacity-80"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              background: c.hex,
              boxShadow: '0 0 0 1px var(--border)',
              flexShrink: 0,
            }}
          />
          <span className="flex flex-col overflow-hidden">
            <span
              className="truncate text-[10px] font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {c.name ?? c.role}
            </span>
            <span className="font-mono text-[9px]" style={{ color: 'var(--text-muted)' }}>
              {c.hex}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

interface FontInfo {
  role: 'primary' | 'secondary' | 'accent';
  family: string;
}

function FontsBody({ fonts }: { fonts: FontInfo[] }) {
  if (fonts.length === 0) {
    return <EmptyHint>No fonts set yet.</EmptyHint>;
  }
  return (
    <div className="flex flex-col gap-1.5 px-1">
      {fonts.map((f) => (
        <div
          key={f.role}
          data-brand-panel-font={f.role}
          className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <span
            className="text-[18px] leading-none"
            style={{
              fontFamily: `${f.family}, system-ui, sans-serif`,
              color: 'var(--text-primary)',
            }}
          >
            Aa
          </span>
          <span className="flex flex-col items-end overflow-hidden text-right">
            <span
              className="truncate text-[10px] font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {f.family}
            </span>
            <span
              className="text-[9px] uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              {f.role}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

interface AssetThumb {
  id: string;
  name: string;
  url: string;
}

function AssetGridBody({ assets, emptyHint }: { assets: AssetThumb[]; emptyHint: string }) {
  if (assets.length === 0) {
    return <EmptyHint>{emptyHint}</EmptyHint>;
  }
  // Cap at 6 — past that the panel scroll gets noisy. Counter is in the
  // section subtitle so the user knows there are more.
  const visible = assets.slice(0, 6);
  return (
    <div className="grid grid-cols-3 gap-1.5 px-1">
      {visible.map((a) => (
        <div
          key={a.id}
          data-brand-panel-asset={a.id}
          className="flex aspect-square items-center justify-center overflow-hidden rounded-md"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
          title={a.name}
        >
          <img
            src={a.url}
            alt={a.name}
            className="max-h-full max-w-full object-contain"
            loading="lazy"
          />
        </div>
      ))}
      {assets.length > visible.length ? (
        <div
          className="flex aspect-square items-center justify-center rounded-md text-[10px]"
          style={{
            background: 'var(--surface)',
            border: '1px dashed var(--border)',
            color: 'var(--text-muted)',
          }}
        >
          +{assets.length - visible.length}
        </div>
      ) : null}
    </div>
  );
}

function WebsiteBody({ brand }: { brand: Brand }) {
  const url = brand.publicUrl ?? null;
  if (!url) {
    return <EmptyHint>No public URL set yet.</EmptyHint>;
  }
  const display = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return (
    <a
      href={url.startsWith('http') ? url : `https://${url}`}
      target="_blank"
      rel="noopener noreferrer"
      data-brand-panel-website
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] hover:underline"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        color: 'var(--text-primary)',
      }}
    >
      <Globe2 size={12} aria-hidden />
      <span className="truncate">{display}</span>
      <ExternalLink size={10} aria-hidden style={{ color: 'var(--text-muted)' }} />
    </a>
  );
}

function AboutBody({ brand }: { brand: Brand }) {
  const tone = brand.tone?.trim();
  const audience = brand.audience?.trim();
  if (!tone && !audience) {
    return <EmptyHint>No tone / audience captured yet.</EmptyHint>;
  }
  return (
    <div className="flex flex-col gap-2 px-1">
      {tone ? (
        <Field label="Tone" value={tone} />
      ) : null}
      {audience ? (
        <Field label="Audience" value={audience} />
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        className="text-[9px] font-medium uppercase tracking-wider"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </p>
      <p
        className="mt-0.5 text-[11px]"
        style={{ color: 'var(--text-primary)' }}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="px-1 py-2 text-[11px]"
      style={{ color: 'var(--text-muted)' }}
    >
      {children}
    </p>
  );
}

// ─── Brand → section data collectors ────────────────────────────────────

function collectLogoVariants(brand: Brand): LogoVariantInfo[] {
  // Shared dedup utility — also used by the editor's floating-toolbar
  // logo picker. Filters out roles that resolve to the same URL as a
  // higher-priority role and roles with no asset, so a brand whose
  // primary/secondary/wordmark/iconmark all share one mark surfaces as
  // ONE tile in the brand panel instead of four duplicates.
  return uniqueLogoVariants(brand)
    .filter((v) => v.value !== 'auto')
    .map((v) => ({
      role: v.resolveRole,
      label: v.label,
      url: logoUrl(brand, v.resolveRole),
    }))
    .filter((info) => !!info.url);
}

function collectColors(brand: Brand): ColorInfo[] {
  const out: ColorInfo[] = [];
  const sys = brand.colorSystem;
  if (sys?.primary?.hex) out.push({ role: 'primary', hex: sys.primary.hex, name: sys.primary.name });
  if (sys?.secondary?.hex) out.push({ role: 'secondary', hex: sys.secondary.hex, name: sys.secondary.name });
  if (sys?.accent?.hex) out.push({ role: 'accent', hex: sys.accent.hex, name: sys.accent.name });
  if (sys?.neutrals) {
    sys.neutrals.forEach((n, i) => {
      if (n?.hex) out.push({ role: `neutral-${i}`, hex: n.hex, name: n.name });
    });
  }
  if (out.length === 0) {
    // Legacy fallback — flat brand fields.
    if (brand.primaryColor) out.push({ role: 'primary', hex: brand.primaryColor });
    if (brand.secondaryColor) out.push({ role: 'secondary', hex: brand.secondaryColor });
    if (brand.accentColor) out.push({ role: 'accent', hex: brand.accentColor });
  }
  return out;
}

function collectFonts(brand: Brand): FontInfo[] {
  const out: FontInfo[] = [];
  const t = brand.typography;
  if (t?.primary?.family) out.push({ role: 'primary', family: t.primary.family });
  if (t?.secondary?.family) out.push({ role: 'secondary', family: t.secondary.family });
  if (t?.accent?.family) out.push({ role: 'accent', family: t.accent.family });
  if (out.length === 0) {
    // Legacy fallback.
    if (brand.fonts?.primary) out.push({ role: 'primary', family: brand.fonts.primary });
    if (brand.fonts?.secondary) out.push({ role: 'secondary', family: brand.fonts.secondary });
  }
  return out;
}

function pickAssetUrl(asset: { formats: Record<string, { url: string } | undefined> }): string | null {
  // Prefer raster preview formats; SVG often has currentColor / no
  // intrinsic size and renders poorly in a tiny tile.
  const order = ['png', 'webp', 'jpg', 'jpeg', 'svg'];
  for (const fmt of order) {
    const f = asset.formats[fmt];
    if (f?.url) return f.url;
  }
  // Fall back to first available format.
  const first = Object.values(asset.formats).find((f) => f?.url);
  return first?.url ?? null;
}

function collectIcons(brand: Brand): AssetThumb[] {
  const assets = brand.brandAssets ?? [];
  return assets
    .filter((a) => a.kind === 'icon')
    .map((a) => {
      const url = pickAssetUrl(a as never);
      return url ? { id: a.id, name: a.name, url } : null;
    })
    .filter((x): x is AssetThumb => x !== null);
}

function collectPhotos(brand: Brand): AssetThumb[] {
  const assets = brand.brandAssets ?? [];
  return assets
    .filter((a) => a.kind === 'image')
    .map((a) => {
      const url = pickAssetUrl(a as never);
      return url ? { id: a.id, name: a.name, url } : null;
    })
    .filter((x): x is AssetThumb => x !== null);
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

