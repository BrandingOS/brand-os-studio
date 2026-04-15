import type { Brand } from '@/shared/types/brand';
import type { BentoTile, TileKind } from '../types';
import { useBentoStore } from '../store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Copy, Trash2, Plus, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

const KIND_OPTIONS: Array<{ value: TileKind; label: string }> = [
  { value: 'logo', label: 'Logo' },
  { value: 'color', label: 'Color' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'typography', label: 'Typography' },
  { value: 'voice-quote', label: 'Voice / Quote' },
  { value: 'asset-image', label: 'Brand Asset' },
  { value: 'user-image', label: 'Uploaded Image' },
  { value: 'text', label: 'Text' },
  { value: 'pattern', label: 'Pattern' },
  { value: 'stat', label: 'Stat' },
];

interface Props {
  tile: BentoTile | null;
  brand: Brand | null | undefined;
  onUploadClick: (tileId: string) => void;
}

export function TileInspector({ tile, brand, onUploadClick }: Props) {
  const setKind = useBentoStore((s) => s.setTileKind);
  const updateContent = useBentoStore((s) => s.updateTileContent);
  const updateStyle = useBentoStore((s) => s.updateTileStyle);
  const deleteTile = useBentoStore((s) => s.deleteTile);
  const duplicateTile = useBentoStore((s) => s.duplicateTile);
  const addTile = useBentoStore((s) => s.addTile);

  if (!tile) {
    return (
      <aside className="w-[300px] shrink-0 border-l bg-background flex flex-col">
        <div className="p-4 border-b">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Inspector</div>
        </div>
        <div className="p-4 space-y-4">
          <div className="text-sm text-muted-foreground">
            Click a tile to edit it, or drag an image onto a tile to add a photo.
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Add tile</div>
            <div className="grid grid-cols-2 gap-1.5">
              {KIND_OPTIONS.slice(0, 8).map((o) => (
                <Button key={o.value} variant="outline" size="sm" className="h-8 text-xs justify-start"
                  onClick={() => addTile(o.value, brand)}>
                  <Plus className="h-3 w-3 mr-1.5" />
                  {o.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const palette = buildPalette(brand);
  const fonts = buildFonts(brand);
  const images = (brand?.assets ?? []).filter((a) => a.type === 'image');
  const style = tile.style ?? {};
  const isTextLike = tile.kind === 'voice-quote' || tile.kind === 'text' || tile.kind === 'stat' || tile.kind === 'typography';
  const isImageLike = tile.kind === 'asset-image' || tile.kind === 'user-image' || tile.kind === 'logo';

  return (
    <aside className="w-[300px] shrink-0 border-l bg-background flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Inspector</div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateTile(tile.id, brand)} title="Duplicate">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteTile(tile.id)} title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 border-b space-y-3">
          <Field label="Type">
            <Select value={tile.kind} onValueChange={(v) => setKind(tile.id, v as TileKind, brand)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded bg-muted/50 px-2 py-1.5">
              <div className="text-[10px] text-muted-foreground uppercase">Position</div>
              <div className="font-mono">r{tile.row} · c{tile.col}</div>
            </div>
            <div className="rounded bg-muted/50 px-2 py-1.5">
              <div className="text-[10px] text-muted-foreground uppercase">Span</div>
              <div className="font-mono">{tile.colSpan} × {tile.rowSpan}</div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 border-b">
          {tile.kind === 'color' && (
            <Swatches label="Color" value={tile.content.color} palette={palette} onPick={(c) => updateContent(tile.id, { color: c })} />
          )}

          {tile.kind === 'gradient' && (
            <>
              <Swatches label="From" value={tile.content.gradient?.from} palette={palette}
                onPick={(c) => updateContent(tile.id, { gradient: { from: c, to: tile.content.gradient?.to ?? '#000', angle: tile.content.gradient?.angle ?? 45 } })} />
              <Swatches label="To" value={tile.content.gradient?.to} palette={palette}
                onPick={(c) => updateContent(tile.id, { gradient: { from: tile.content.gradient?.from ?? '#000', to: c, angle: tile.content.gradient?.angle ?? 45 } })} />
              <SliderRow label="Angle" value={tile.content.gradient?.angle ?? 45} min={0} max={360} step={1} unit="°"
                onChange={(v) => updateContent(tile.id, { gradient: { from: tile.content.gradient?.from ?? '#000', to: tile.content.gradient?.to ?? '#fff', angle: v } })} />
            </>
          )}

          {tile.kind === 'logo' && (
            <>
              <Field label="Variant">
                <Select value={tile.content.logoVariant ?? 'full'} onValueChange={(v) => updateContent(tile.id, { logoVariant: v as 'full' })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full</SelectItem>
                    <SelectItem value="icon">Icon</SelectItem>
                    <SelectItem value="wordmark">Wordmark</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Swatches label="Background" value={tile.content.bg} palette={[...palette, '#FFFFFF', '#000000']}
                onPick={(c) => updateContent(tile.id, { bg: c })} />
            </>
          )}

          {tile.kind === 'typography' && (
            <>
              <Field label="Font">
                <Select value={tile.content.fontFamily ?? fonts[0]} onValueChange={(v) => updateContent(tile.id, { fontFamily: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{fonts.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Sample">
                <Input value={tile.content.text ?? 'Aa'} onChange={(e) => updateContent(tile.id, { text: e.target.value })} />
              </Field>
            </>
          )}

          {(tile.kind === 'voice-quote' || tile.kind === 'text') && (
            <>
              <Field label="Text">
                <Textarea rows={3} value={tile.content.text ?? ''} onChange={(e) => updateContent(tile.id, { text: e.target.value })} />
              </Field>
              <Field label="Font">
                <Select value={tile.content.fontFamily ?? fonts[0]} onValueChange={(v) => updateContent(tile.id, { fontFamily: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{fonts.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <AlignToggle value={tile.content.align ?? 'left'} onChange={(v) => updateContent(tile.id, { align: v })} />
            </>
          )}

          {tile.kind === 'stat' && (
            <>
              <Field label="Value"><Input value={tile.content.text ?? ''} onChange={(e) => updateContent(tile.id, { text: e.target.value })} /></Field>
              <Field label="Label"><Input value={tile.content.label ?? ''} onChange={(e) => updateContent(tile.id, { label: e.target.value })} /></Field>
            </>
          )}

          {tile.kind === 'asset-image' && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Brand assets</div>
              {images.length === 0 ? (
                <div className="text-xs text-muted-foreground">No image assets yet.</div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {images.map((a) => (
                    <button key={a.id} type="button"
                      onClick={() => updateContent(tile.id, { assetId: a.id })}
                      className={cn('aspect-square rounded overflow-hidden border-2',
                        tile.content.assetId === a.id ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30')}>
                      <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {tile.kind === 'user-image' && (
            <>
              {tile.content.dataUrl && (
                <div className="rounded overflow-hidden border aspect-video">
                  <img src={tile.content.dataUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <Button variant="outline" size="sm" className="w-full" onClick={() => onUploadClick(tile.id)}>
                {tile.content.dataUrl ? 'Replace image' : 'Upload image'}
              </Button>
            </>
          )}

          {tile.kind === 'pattern' && (
            <>
              <Field label="Pattern">
                <Select value={tile.content.patternKind ?? 'dots'} onValueChange={(v) => updateContent(tile.id, { patternKind: v as 'dots' })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dots">Dots</SelectItem>
                    <SelectItem value="stripes">Stripes</SelectItem>
                    <SelectItem value="checker">Checker</SelectItem>
                    <SelectItem value="circles">Circles</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Swatches label="Foreground" value={tile.content.fg} palette={palette} onPick={(c) => updateContent(tile.id, { fg: c })} />
              <Swatches label="Background" value={tile.content.bg} palette={[...palette, '#FFFFFF', '#000000']} onPick={(c) => updateContent(tile.id, { bg: c })} />
            </>
          )}
        </div>

        {/* Text-like → font size / weight */}
        {isTextLike && (
          <div className="p-4 space-y-3 border-b">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Text</div>
            <SliderRow label="Font size" value={tile.content.fontSizePct ?? defaultFontSizePct(tile.kind)} min={4} max={60} step={0.5} unit="%"
              onChange={(v) => updateContent(tile.id, { fontSizePct: v })} />
            <SliderRow label="Weight" value={tile.content.fontWeight ?? 600} min={300} max={900} step={100} unit=""
              onChange={(v) => updateContent(tile.id, { fontWeight: v })} />
          </div>
        )}

        {/* Image-like → fit / zoom / offset */}
        {isImageLike && (
          <div className="p-4 space-y-3 border-b">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Image</div>
            <Field label="Fit">
              <Select value={tile.content.fit ?? 'cover'} onValueChange={(v) => updateContent(tile.id, { fit: v as 'cover' })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Cover</SelectItem>
                  <SelectItem value="contain">Contain</SelectItem>
                  <SelectItem value="fill">Fill</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <SliderRow label="Zoom" value={tile.content.zoom ?? 1} min={1} max={3} step={0.05} unit="×"
              onChange={(v) => updateContent(tile.id, { zoom: v })} />
            <div className="grid grid-cols-2 gap-2">
              <SliderRow label="X offset" value={tile.content.offsetX ?? 50} min={0} max={100} step={1} unit="%"
                onChange={(v) => updateContent(tile.id, { offsetX: v })} />
              <SliderRow label="Y offset" value={tile.content.offsetY ?? 50} min={0} max={100} step={1} unit="%"
                onChange={(v) => updateContent(tile.id, { offsetY: v })} />
            </div>
          </div>
        )}

        {/* Universal style */}
        <div className="p-4 space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Style</div>
          <SliderRow label="Corner radius" value={style.radius ?? -1} min={-1} max={20} step={0.1} unit={style.radius === undefined ? ' (auto)' : '%'}
            onChange={(v) => updateStyle(tile.id, { radius: v < 0 ? undefined : v })} />
          <SliderRow label="Opacity" value={(style.opacity ?? 1) * 100} min={10} max={100} step={1} unit="%"
            onChange={(v) => updateStyle(tile.id, { opacity: v / 100 })} />
          <Field label="Shadow">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((lvl) => (
                <button key={lvl} type="button" onClick={() => updateStyle(tile.id, { shadow: lvl as 0 })}
                  className={cn('flex-1 h-8 text-xs rounded border',
                    (style.shadow ?? 0) === lvl ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border hover:bg-muted/50')}>
                  {lvl === 0 ? 'None' : ['S', 'M', 'L'][lvl - 1]}
                </button>
              ))}
            </div>
          </Field>
          <SliderRow label="Border" value={style.borderWidth ?? 0} min={0} max={2} step={0.05} unit="%"
            onChange={(v) => updateStyle(tile.id, { borderWidth: v })} />
          {(style.borderWidth ?? 0) > 0 && (
            <Swatches label="Border color" value={style.borderColor ?? '#0F172A'} palette={[...palette, '#FFFFFF', '#000000']}
              onPick={(c) => updateStyle(tile.id, { borderColor: c })} />
          )}
        </div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function SliderRow({
  label, value, min, max, step, unit, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void;
}) {
  const displayValue = value < 0 ? 'auto' : value.toFixed(step < 1 ? 1 : 0);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {typeof displayValue === 'string' && displayValue === 'auto' ? 'auto' : `${displayValue}${unit}`}
        </span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

function AlignToggle({ value, onChange }: { value: 'left' | 'center' | 'right'; onChange: (v: 'left' | 'center' | 'right') => void }) {
  const btn = (key: 'left' | 'center' | 'right', Icon: typeof AlignLeft) => (
    <button
      type="button"
      onClick={() => onChange(key)}
      className={cn('flex-1 h-8 flex items-center justify-center rounded border',
        value === key ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted/50 text-muted-foreground')}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Align</div>
      <div className="flex gap-1">
        {btn('left', AlignLeft)}
        {btn('center', AlignCenter)}
        {btn('right', AlignRight)}
      </div>
    </div>
  );
}

function Swatches({ label, value, palette, onPick }: { label: string; value?: string; palette: string[]; onPick: (c: string) => void }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      <div className="grid grid-cols-8 gap-1 mb-1.5">
        {palette.slice(0, 16).map((c) => (
          <button key={c} type="button" onClick={() => onPick(c)}
            className={cn('aspect-square rounded border transition-all',
              value?.toLowerCase() === c.toLowerCase() ? 'border-primary scale-110 shadow-sm' : 'border-border hover:border-muted-foreground/50')}
            style={{ background: c }} />
        ))}
      </div>
      <Input type="text" placeholder="#000000" value={value ?? ''} onChange={(e) => onPick(e.target.value)} className="h-7 text-xs font-mono" />
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
