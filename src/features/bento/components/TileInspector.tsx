import type { Brand } from '@/shared/types/brand';
import type { BentoTile, TileKind } from '../types';
import { useBentoStore } from '../store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

  if (!tile) {
    return (
      <aside className="w-[280px] shrink-0 border-l bg-muted/10 p-5 text-sm text-muted-foreground">
        <div className="font-semibold text-foreground mb-1.5">Nothing selected</div>
        Click a tile on the canvas to edit it, or drag an image onto a tile.
      </aside>
    );
  }

  const palette = buildPalette(brand);
  const fonts = buildFonts(brand);
  const images = (brand?.assets ?? []).filter((a) => a.type === 'image');

  return (
    <aside className="w-[280px] shrink-0 border-l bg-muted/10 overflow-y-auto">
      <div className="p-4 border-b">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tile</div>
        <Select value={tile.kind} onValueChange={(v) => setKind(tile.id, v as TileKind, brand)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KIND_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="p-4 space-y-4">
        {tile.kind === 'color' && (
          <Swatches label="Color" value={tile.content.color} palette={palette} onPick={(c) => updateContent(tile.id, { color: c })} />
        )}

        {tile.kind === 'gradient' && (
          <>
            <Swatches label="From" value={tile.content.gradient?.from} palette={palette}
              onPick={(c) => updateContent(tile.id, { gradient: { from: c, to: tile.content.gradient?.to ?? '#000', angle: tile.content.gradient?.angle ?? 45 } })} />
            <Swatches label="To" value={tile.content.gradient?.to} palette={palette}
              onPick={(c) => updateContent(tile.id, { gradient: { from: tile.content.gradient?.from ?? '#000', to: c, angle: tile.content.gradient?.angle ?? 45 } })} />
            <Field label="Angle">
              <Input type="number" value={tile.content.gradient?.angle ?? 45} min={0} max={360}
                onChange={(e) => updateContent(tile.id, { gradient: { from: tile.content.gradient?.from ?? '#000', to: tile.content.gradient?.to ?? '#fff', angle: Number(e.target.value) } })} />
            </Field>
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
                <SelectContent>
                  {fonts.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
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
                <SelectContent>
                  {fonts.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
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
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Brand assets</div>
            {images.length === 0 ? (
              <div className="text-sm text-muted-foreground">No image assets in this brand yet. Upload to a tile instead.</div>
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
            <Swatches label="Foreground" value={tile.content.fg} palette={palette}
              onPick={(c) => updateContent(tile.id, { fg: c })} />
            <Swatches label="Background" value={tile.content.bg} palette={[...palette, '#FFFFFF', '#000000']}
              onPick={(c) => updateContent(tile.id, { bg: c })} />
          </>
        )}
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function Swatches({ label, value, palette, onPick }: { label: string; value?: string; palette: string[]; onPick: (c: string) => void }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      <div className="grid grid-cols-8 gap-1.5 mb-2">
        {palette.map((c) => (
          <button key={c} type="button" onClick={() => onPick(c)}
            className={cn('aspect-square rounded border-2 transition-all',
              value?.toLowerCase() === c.toLowerCase() ? 'border-primary scale-110' : 'border-transparent hover:border-muted-foreground/30')}
            style={{ background: c }} />
        ))}
      </div>
      <Input type="text" placeholder="#000000" value={value ?? ''} onChange={(e) => onPick(e.target.value)} className="h-8 text-xs font-mono" />
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
