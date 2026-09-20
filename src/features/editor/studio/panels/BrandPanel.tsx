// The brand, inside the editor, doing something.
//
// The panel this replaces DISPLAYED the brand: seven read-only
// accordions where clicking a colour copied its hex to the clipboard and
// clicking a logo did nothing at all. In a product whose thesis is that
// the brand is part of the creation environment, the brand panel was the
// one surface that could not affect the canvas.
//
// Every row here acts:
//   • a logo variant inserts, or re-points the selected logo layer
//   • a colour applies to the selection, or to the page background
//   • a typeface applies to selected text
//   • an icon or photo from the brand's library inserts as a layer
//
// It also carries "Re-apply brand kit", which is the one operation that
// belongs to the brand rather than to a layer.

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { DsButton } from '@/shared/ds';
import type { Brand } from '@/shared/types/brand';
import type { BrandAsset } from '@/shared/types/brandAssets';
import type { Layer, Page } from '@/features/editor/schema';
import type { BrandKit } from '@/features/editor/brand/BrandKit';
import type { LayerEditingAdapter } from '@/features/editor/adapter/EditorAdapter';
import { brandSwatches } from '../components/ColorField';
import { assetUrl } from './assetUrl';
import { InsertTile } from './InsertTile';
import type { InsertRequest } from '../ops/insertRequest';
import { useSelectedLayers } from '../state/studioStore';

interface Props {
  brand?: Brand;
  brandKit: BrandKit | null;
  adapter: LayerEditingAdapter | null;
  page: Page | null;
  readOnly: boolean;
  insert: (request: InsertRequest) => void;
  updateLayer: (pageId: string, layerId: string, patch: Partial<Layer>) => void;
  onReapplyBrand: () => void;
}

const LOGO_ROLES = [
  { variant: 'primary', label: 'Primary' },
  { variant: 'secondary', label: 'Secondary' },
  { variant: 'wordmark', label: 'Wordmark' },
  { variant: 'iconmark', label: 'Brand icon' },
  { variant: 'mono.black', label: 'Black' },
  { variant: 'mono.white', label: 'White' },
] as const;

export function BrandPanel({
  brand,
  brandKit,
  adapter,
  page,
  readOnly,
  insert,
  updateLayer,
  onReapplyBrand,
}: Props) {
  const selected = useSelectedLayers();
  const swatches = useMemo(() => brandSwatches(brandKit), [brandKit]);
  const assets = brand?.brandAssets ?? [];
  const icons = assets.filter((a) => a.kind === 'icon');
  const photos = assets.filter((a) => a.kind === 'image');

  if (!brand || !brandKit) {
    return (
      <p className="st-empty-sub" style={{ padding: 8 }}>
        This design isn’t attached to a brand, so there’s no kit to pull from.
        Open it from inside a brand to use its colours, type and logos.
      </p>
    );
  }

  /**
   * A colour click does the most useful thing for what is selected:
   * paint the selection, or — with nothing selected — the page itself.
   * That second case is the page-background control the old panel
   * showed as read-only text with a "Phase 4.5" note beside it.
   */
  const applyColour = (hex: string) => {
    if (!page || readOnly) return;
    if (selected.length === 0) {
      setPageBackground(adapter, page, hex);
      return;
    }
    adapter?.batch('Brand colour', () => {
      for (const layer of selected) {
        if (layer.locked) continue;
        if (layer.kind === 'text') updateLayer(page.id, layer.id, { color: hex } as Partial<Layer>);
        else if (layer.kind === 'shape')
          updateLayer(page.id, layer.id, { fill: hex } as Partial<Layer>);
      }
    });
  };

  const applyFont = (family: string) => {
    if (!page || readOnly) return;
    const texts = selected.filter((l) => l.kind === 'text' && !l.locked);
    if (texts.length === 0) return;
    adapter?.batch('Brand typeface', () => {
      for (const layer of texts) {
        updateLayer(page.id, layer.id, { fontFamily: family } as Partial<Layer>);
      }
    });
  };

  const colourHint =
    selected.length === 0
      ? 'Click to set the page background'
      : `Click to apply to ${selected.length === 1 ? 'the selection' : `${selected.length} layers`}`;
  const selectedLogo = selected.length === 1 && selected[0].kind === 'logo' ? selected[0] : null;
  const selectedText = selected.some((l) => l.kind === 'text');

  return (
    <>
      <section className="st-section">
        <p className="st-section-label">
          Logo{selectedLogo ? ' · click to swap the selected logo' : ''}
        </p>
        <div className="st-tile-grid">
          {LOGO_ROLES.filter((role) => hasLogo(brandKit, role.variant)).map((role) => (
            <InsertTile
              key={role.variant}
              label={role.label}
              caption={role.label}
              disabled={readOnly}
              request={{ kind: 'logo', variant: role.variant }}
              onInsert={(request) => {
                // Swapping the variant of a logo already on the canvas
                // is what you want when one is selected — inserting a
                // second logo almost never is.
                if (selectedLogo && page) {
                  updateLayer(page.id, selectedLogo.id, {
                    variant: role.variant,
                  } as unknown as Partial<Layer>);
                  return;
                }
                insert(request);
              }}
            >
              <LogoThumb kit={brandKit} variant={role.variant} />
            </InsertTile>
          ))}
        </div>
      </section>

      <section className="st-section">
        <p className="st-section-label">Colours · {colourHint}</p>
        <div className="st-swatch-grid">
          {swatches.map((s) => (
            <button
              key={s.hex}
              type="button"
              className="st-swatch-btn"
              style={{ background: s.hex }}
              title={`${s.name} · ${s.hex}`}
              aria-label={`${s.name} ${s.hex}`}
              disabled={readOnly}
              onClick={() => applyColour(s.hex)}
            />
          ))}
        </div>
      </section>

      <section className="st-section">
        <p className="st-section-label">
          Typography{selectedText ? '' : ' · select text to apply'}
        </p>
        {[
          { family: brandKit.typography.heading.family, role: 'Heading' },
          { family: brandKit.typography.body.family, role: 'Body' },
        ]
          .filter((f, i, arr) => f.family && arr.findIndex((o) => o.family === f.family) === i)
          .map((f) => (
            <button
              key={f.role}
              type="button"
              className="st-layer-row"
              disabled={readOnly || !selectedText}
              onClick={() => applyFont(f.family)}
              title={selectedText ? `Apply ${f.family}` : 'Select text first'}
            >
              <span
                className="st-layer-icon"
                style={{ fontFamily: f.family, fontSize: 17, width: 26 }}
                aria-hidden
              >
                Aa
              </span>
              <span className="st-layer-name" style={{ fontFamily: f.family }}>
                {f.family}
              </span>
              <span className="st-tile-caption" style={{ margin: 0 }}>
                {f.role}
              </span>
            </button>
          ))}
      </section>

      {icons.length > 0 ? (
        <AssetSection
          title="Icons"
          assets={icons}
          readOnly={readOnly}
          onInsert={insert}
          asSvg
        />
      ) : null}

      {photos.length > 0 ? (
        <AssetSection title="Photos" assets={photos} readOnly={readOnly} onInsert={insert} />
      ) : null}

      <section className="st-section">
        <DsButton
          tone="secondary"
          size="sm"
          onClick={onReapplyBrand}
          disabled={readOnly}
          style={{ width: '100%' }}
        >
          <RefreshCw size={14} strokeWidth={1.8} aria-hidden /> Re-apply brand kit
        </DsButton>
        <Link
          to={`/b/${brand.slug}/brand-kit`}
          className="st-icon-btn st-icon-btn--label"
          style={{ width: '100%', marginTop: 6, justifyContent: 'center' }}
        >
          Open brand kit <ExternalLink size={13} strokeWidth={1.8} aria-hidden />
        </Link>
      </section>
    </>
  );
}

function AssetSection({
  title,
  assets,
  readOnly,
  onInsert,
  asSvg,
}: {
  title: string;
  assets: BrandAsset[];
  readOnly: boolean;
  onInsert: (request: InsertRequest) => void;
  asSvg?: boolean;
}) {
  return (
    <section className="st-section">
      <p className="st-section-label">{title}</p>
      <div className="st-tile-grid">
        {assets.slice(0, 24).map((asset) => {
          const url = assetUrl(asset);
          if (!url) return null;
          return (
            <InsertTile
              key={asset.id}
              label={asset.name}
              disabled={readOnly}
              request={
                asSvg && url.includes('svg')
                  ? { kind: 'svg', src: url, name: asset.name }
                  : { kind: 'image', src: url }
              }
              onInsert={onInsert}
            >
              <img src={url} alt="" loading="lazy" />
            </InsertTile>
          );
        })}
      </div>
    </section>
  );
}

function hasLogo(kit: BrandKit, variant: string): boolean {
  if (variant === 'mono.black') return !!kit.logos.mono?.black;
  if (variant === 'mono.white') return !!kit.logos.mono?.white;
  return !!kit.logos[variant as 'primary' | 'secondary' | 'wordmark' | 'iconmark'];
}

function LogoThumb({ kit, variant }: { kit: BrandKit; variant: string }) {
  const asset =
    variant === 'mono.black'
      ? kit.logos.mono?.black
      : variant === 'mono.white'
        ? kit.logos.mono?.white
        : kit.logos[variant as 'primary' | 'secondary' | 'wordmark' | 'iconmark'];
  if (!asset?.url) return <span className="st-tile-caption">—</span>;
  return (
    <img
      src={asset.url}
      alt=""
      loading="lazy"
      // A white logo is invisible on a light tile, so the tile carries a
      // dark ground for exactly the variant that needs one.
      style={
        variant === 'mono.white'
          ? { background: 'var(--ds-text)', borderRadius: 4, padding: 4 }
          : undefined
      }
    />
  );
}

/**
 * Write the page background.
 *
 * The adapter has no page-background setter — the only page-level write
 * it exposes is `updatePageDimensions` — so this goes through
 * `replaceDocument` inside a batch, which is one undo step and one
 * change emit like every other operation.
 */
function setPageBackground(
  adapter: LayerEditingAdapter | null,
  page: Page,
  hex: string,
): void {
  if (!adapter) return;
  const doc = adapter.getDocument();
  const next = {
    ...doc,
    pages: doc.pages.map((p) => (p.id === page.id ? { ...p, background: hex } : p)),
  };
  adapter.batch('Page background', () => {
    void adapter.replaceDocument(next);
  });
}
