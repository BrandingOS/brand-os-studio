import type { Brand } from '@/shared/types/brand';
import type { BentoTile, TileKind } from '../types';
import { useBentoStore } from '../store';
import { DsButton, DsInput, DsSegmented, DsSelect, DsSlider, DsTextArea } from '@/shared/ds';
import { Copy, Trash2, Plus, AlignLeft, AlignCenter, AlignRight, Images } from 'lucide-react';

const KIND_OPTIONS: Array<{ value: TileKind; label: string }> = [
  { value: 'logo', label: 'Logo' },
  { value: 'color', label: 'Colour' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'typography', label: 'Typography' },
  { value: 'voice-quote', label: 'Voice / Quote' },
  { value: 'asset-image', label: 'Brand Asset' },
  { value: 'user-image', label: 'Uploaded Image' },
  { value: 'text', label: 'Text' },
  { value: 'pattern', label: 'Pattern' },
  { value: 'stat', label: 'Stat' },
];

const LOGO_VARIANTS = ['full', 'icon', 'wordmark', 'dark', 'light'].map((v) => ({
  value: v,
  label: v[0].toUpperCase() + v.slice(1),
}));
const PATTERNS = ['dots', 'stripes', 'checker', 'circles'].map((v) => ({
  value: v,
  label: v[0].toUpperCase() + v.slice(1),
}));
const FITS = ['cover', 'contain', 'fill'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));

const pct = (v: number) => `${v.toFixed(1)}%`;
const int = (v: number) => `${v.toFixed(0)}`;

interface Props {
  tile: BentoTile | null;
  brand: Brand | null | undefined;
  onOpenMedia: (tileId: string) => void;
}

export function TileInspector({ tile, brand, onOpenMedia }: Props) {
  const setKind = useBentoStore((s) => s.setTileKind);
  const updateContent = useBentoStore((s) => s.updateTileContent);
  const updateStyle = useBentoStore((s) => s.updateTileStyle);
  const deleteTile = useBentoStore((s) => s.deleteTile);
  const duplicateTile = useBentoStore((s) => s.duplicateTile);
  const addTile = useBentoStore((s) => s.addTile);

  if (!tile) {
    return (
      <aside className="panel bento-inspector" aria-label="Inspector">
        <div className="panel-top">
          <div className="panel-heading">
            <span className="panel-heading-eyebrow">Inspector</span>
          </div>
        </div>
        <div className="bento-inspector-body">
          <p className="bento-hint">
            Select a tile to edit it, drag an image onto one, or browse the media library.
          </p>
          <Group label="Add tile">
            <div className="bento-addgrid">
              {KIND_OPTIONS.slice(0, 8).map((o) => (
                <DsButton key={o.value} tone="secondary" size="sm" onClick={() => addTile(o.value, brand)}>
                  <Plus size={12} aria-hidden />
                  {o.label}
                </DsButton>
              ))}
            </div>
          </Group>
          <DsButton className="bento-block" onClick={() => onOpenMedia('')}>
            <Images size={14} aria-hidden />
            Browse media library
          </DsButton>
        </div>
      </aside>
    );
  }

  const palette = buildPalette(brand);
  const withNeutrals = [...palette, '#FFFFFF', '#000000'];
  const fonts = buildFonts(brand).map((f) => ({ value: f, label: f }));
  const images = (brand?.assets ?? []).filter((a) => a.type === 'image');
  const style = tile.style ?? {};
  const isTextLike =
    tile.kind === 'voice-quote' || tile.kind === 'text' || tile.kind === 'stat' || tile.kind === 'typography';
  const isImageLike = tile.kind === 'asset-image' || tile.kind === 'user-image' || tile.kind === 'logo';
  const grad = tile.content.gradient;

  return (
    <aside className="panel bento-inspector" aria-label="Inspector">
      <div className="panel-top">
        <div className="bento-inspector-head">
          <span className="panel-heading-eyebrow">Inspector</span>
          <span className="bento-inspector-acts">
            <button
              type="button"
              className="bento-iconbtn"
              onClick={() => duplicateTile(tile.id, brand)}
              title="Duplicate"
              aria-label="Duplicate tile"
            >
              <Copy size={14} aria-hidden />
            </button>
            <button
              type="button"
              className="bento-iconbtn bento-iconbtn--danger"
              onClick={() => deleteTile(tile.id)}
              title="Delete"
              aria-label="Delete tile"
            >
              <Trash2 size={14} aria-hidden />
            </button>
          </span>
        </div>
      </div>

      <div className="bento-inspector-body">
        <Group label="Type">
          <DsSelect
            options={KIND_OPTIONS}
            value={tile.kind}
            onChange={(v) => setKind(tile.id, v as TileKind, brand)}
          />
          <div className="bento-readouts">
            <span><em>Position</em><code>r{tile.row} · c{tile.col}</code></span>
            <span><em>Span</em><code>{tile.colSpan} × {tile.rowSpan}</code></span>
          </div>
        </Group>

        <Group>
          {tile.kind === 'color' && (
            <Swatches label="Colour" value={tile.content.color} palette={palette}
              onPick={(c) => updateContent(tile.id, { color: c })} />
          )}

          {tile.kind === 'gradient' && (
            <>
              <Swatches label="From" value={grad?.from} palette={palette}
                onPick={(c) => updateContent(tile.id, { gradient: { from: c, to: grad?.to ?? '#000', angle: grad?.angle ?? 45 } })} />
              <Swatches label="To" value={grad?.to} palette={palette}
                onPick={(c) => updateContent(tile.id, { gradient: { from: grad?.from ?? '#000', to: c, angle: grad?.angle ?? 45 } })} />
              <DsSlider label="Angle" value={grad?.angle ?? 45} min={0} max={360} step={1}
                format={(v) => `${v.toFixed(0)}°`}
                onChange={(v) => updateContent(tile.id, { gradient: { from: grad?.from ?? '#000', to: grad?.to ?? '#fff', angle: v } })} />
            </>
          )}

          {tile.kind === 'logo' && (
            <>
              <Labelled label="Variant">
                <DsSelect options={LOGO_VARIANTS} value={tile.content.logoVariant ?? 'full'}
                  onChange={(v) => updateContent(tile.id, { logoVariant: v as 'full' })} />
              </Labelled>
              <Swatches label="Background" value={tile.content.bg} palette={withNeutrals}
                onPick={(c) => updateContent(tile.id, { bg: c })} />
            </>
          )}

          {tile.kind === 'typography' && (
            <>
              <Labelled label="Font">
                <DsSelect options={fonts} value={tile.content.fontFamily ?? fonts[0]?.value}
                  onChange={(v) => updateContent(tile.id, { fontFamily: v })} />
              </Labelled>
              <DsInput label="Sample" value={tile.content.text ?? 'Aa'}
                onChange={(e) => updateContent(tile.id, { text: e.target.value })} />
            </>
          )}

          {(tile.kind === 'voice-quote' || tile.kind === 'text') && (
            <>
              <DsTextArea label="Text" rows={3} value={tile.content.text ?? ''}
                onChange={(e) => updateContent(tile.id, { text: e.target.value })} />
              <Labelled label="Font">
                <DsSelect options={fonts} value={tile.content.fontFamily ?? fonts[0]?.value}
                  onChange={(v) => updateContent(tile.id, { fontFamily: v })} />
              </Labelled>
              <Labelled label="Align">
                <DsSegmented
                  aria-label="Text alignment"
                  value={tile.content.align ?? 'left'}
                  onChange={(v) => updateContent(tile.id, { align: v as 'left' })}
                  options={[
                    { value: 'left', label: <AlignLeft size={14} aria-label="Left" /> },
                    { value: 'center', label: <AlignCenter size={14} aria-label="Centre" /> },
                    { value: 'right', label: <AlignRight size={14} aria-label="Right" /> },
                  ]}
                />
              </Labelled>
            </>
          )}

          {tile.kind === 'stat' && (
            <>
              <DsInput label="Value" value={tile.content.text ?? ''}
                onChange={(e) => updateContent(tile.id, { text: e.target.value })} />
              <DsInput label="Label" value={tile.content.label ?? ''}
                onChange={(e) => updateContent(tile.id, { label: e.target.value })} />
            </>
          )}

          {tile.kind === 'asset-image' && (
            <>
              <Labelled label="Brand assets">
                {images.length === 0 ? (
                  <p className="bento-hint">No image assets yet.</p>
                ) : (
                  <div className="bento-assetgrid">
                    {images.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className={`bento-assettile${tile.content.assetId === a.id ? ' is-on' : ''}`}
                        onClick={() => updateContent(tile.id, { assetId: a.id })}
                        title={a.name}
                      >
                        <img src={a.url} alt={a.name} />
                      </button>
                    ))}
                  </div>
                )}
              </Labelled>
              <DsButton tone="secondary" size="sm" className="bento-block" onClick={() => onOpenMedia(tile.id)}>
                <Images size={14} aria-hidden />
                Browse media
              </DsButton>
            </>
          )}

          {tile.kind === 'user-image' && (
            <>
              {tile.content.dataUrl && (
                <div className="bento-preview">
                  <img src={tile.content.dataUrl} alt="" />
                </div>
              )}
              <DsButton tone="secondary" size="sm" className="bento-block" onClick={() => onOpenMedia(tile.id)}>
                <Images size={14} aria-hidden />
                {tile.content.dataUrl ? 'Replace media' : 'Browse media'}
              </DsButton>
            </>
          )}

          {tile.kind === 'pattern' && (
            <>
              <Labelled label="Pattern">
                <DsSelect options={PATTERNS} value={tile.content.patternKind ?? 'dots'}
                  onChange={(v) => updateContent(tile.id, { patternKind: v as 'dots' })} />
              </Labelled>
              <Swatches label="Foreground" value={tile.content.fg} palette={palette}
                onPick={(c) => updateContent(tile.id, { fg: c })} />
              <Swatches label="Background" value={tile.content.bg} palette={withNeutrals}
                onPick={(c) => updateContent(tile.id, { bg: c })} />
            </>
          )}
        </Group>

        {isTextLike && (
          <Group label="Text">
            <DsSlider label="Font size" value={tile.content.fontSizePct ?? defaultFontSizePct(tile.kind)}
              min={4} max={60} step={0.5} format={pct}
              onChange={(v) => updateContent(tile.id, { fontSizePct: v })} />
            <DsSlider label="Weight" value={tile.content.fontWeight ?? 600} min={300} max={900} step={100} format={int}
              onChange={(v) => updateContent(tile.id, { fontWeight: v })} />
          </Group>
        )}

        {isImageLike && (
          <Group label="Image">
            <Labelled label="Fit">
              <DsSelect options={FITS} value={tile.content.fit ?? 'cover'}
                onChange={(v) => updateContent(tile.id, { fit: v as 'cover' })} />
            </Labelled>
            <DsSlider label="Zoom" value={tile.content.zoom ?? 1} min={1} max={3} step={0.05}
              format={(v) => `${v.toFixed(2)}×`}
              onChange={(v) => updateContent(tile.id, { zoom: v })} />
            <DsSlider label="X offset" value={tile.content.offsetX ?? 50} min={0} max={100} step={1} format={int}
              onChange={(v) => updateContent(tile.id, { offsetX: v })} />
            <DsSlider label="Y offset" value={tile.content.offsetY ?? 50} min={0} max={100} step={1} format={int}
              onChange={(v) => updateContent(tile.id, { offsetY: v })} />
          </Group>
        )}

        <Group label="Style">
          {/*
            -1 is the "auto" sentinel the store reads back as `undefined`, so
            the readout has to say "auto" rather than "-1.0%". Same contract as
            before the migration — only the control changed.
          */}
          <DsSlider label="Corner radius" value={style.radius ?? -1} min={-1} max={20} step={0.1}
            format={(v) => (v < 0 ? 'auto' : pct(v))}
            onChange={(v) => updateStyle(tile.id, { radius: v < 0 ? undefined : v })} />
          <DsSlider label="Opacity" value={(style.opacity ?? 1) * 100} min={10} max={100} step={1} format={int}
            onChange={(v) => updateStyle(tile.id, { opacity: v / 100 })} />
          <Labelled label="Shadow">
            <DsSegmented
              aria-label="Shadow"
              value={String(style.shadow ?? 0)}
              onChange={(v) => updateStyle(tile.id, { shadow: Number(v) as 0 })}
              options={[
                { value: '0', label: 'None' },
                { value: '1', label: 'S' },
                { value: '2', label: 'M' },
                { value: '3', label: 'L' },
              ]}
            />
          </Labelled>
          <DsSlider label="Border" value={style.borderWidth ?? 0} min={0} max={2} step={0.05} format={pct}
            onChange={(v) => updateStyle(tile.id, { borderWidth: v })} />
          {(style.borderWidth ?? 0) > 0 && (
            <Swatches label="Border colour" value={style.borderColor ?? '#0F172A'} palette={withNeutrals}
              onPick={(c) => updateStyle(tile.id, { borderColor: c })} />
          )}
        </Group>
      </div>
    </aside>
  );
}

function defaultFontSizePct(kind: TileKind): number {
  if (kind === 'stat') return 36;
  if (kind === 'typography') return 38;
  if (kind === 'voice-quote') return 14;
  return 12;
}

/** A titled block of controls, separated by a hairline. */
function Group({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <section className="bento-group">
      {label && <span className="ds-eyebrow">{label}</span>}
      {children}
    </section>
  );
}

/** A label over a control that has none of its own (DsSelect, DsSegmented). */
function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bento-labelled">
      <span className="bento-label">{label}</span>
      {children}
    </div>
  );
}

function Swatches({
  label, value, palette, onPick,
}: { label: string; value?: string; palette: string[]; onPick: (c: string) => void }) {
  return (
    <div className="bento-labelled">
      <span className="bento-label">{label}</span>
      <div className="bento-swatches" role="group" aria-label={label}>
        {palette.slice(0, 16).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onPick(c)}
            className={`bento-swatchchip${value?.toLowerCase() === c.toLowerCase() ? ' is-on' : ''}`}
            style={{ background: c }}
            title={c}
            aria-label={c}
            aria-pressed={value?.toLowerCase() === c.toLowerCase()}
          />
        ))}
      </div>
      <DsInput
        className="bento-hex"
        placeholder="#000000"
        value={value ?? ''}
        aria-label={`${label} hex`}
        onChange={(e) => onPick(e.target.value)}
      />
    </div>
  );
}

function buildPalette(brand: Brand | null | undefined): string[] {
  const out: string[] = [];
  if (brand?.primaryColor) out.push(brand.primaryColor);
  if (brand?.secondaryColor) out.push(brand.secondaryColor);
  brand?.guidelines?.colorPalette?.neutral?.forEach((n) => n?.hex && out.push(n.hex));
  const defaults = ['#0F172A', '#6366F1', '#EC4899', '#F97316', '#10B981', '#0EA5E9', '#EAB308', '#94A3B8'];
  defaults.forEach((d) => { if (!out.includes(d)) out.push(d); });
  return out.slice(0, 16);
}

function buildFonts(brand: Brand | null | undefined): string[] {
  const out: string[] = [];
  if (brand?.fonts?.primary) out.push(brand.fonts.primary);
  if (brand?.fonts?.secondary) out.push(brand.fonts.secondary);
  ['Inter', 'Helvetica', 'Georgia', 'Playfair Display', 'Space Grotesk', 'Courier'].forEach((f) => {
    if (!out.includes(f)) out.push(f);
  });
  return out;
}
