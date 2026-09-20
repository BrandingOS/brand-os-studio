// The contextual toolbar.
//
// Docked under the top bar rather than floating above the selection.
// The floating bar it replaces had three structural problems: it
// occluded the design it was describing, it moved every time the
// selection moved, and it was built around ONE layer — so a
// multi-selection showed nothing at all, which is precisely when align,
// distribute and group are the controls you want.
//
// What it shows is decided by the selection, and only by the selection:
// no control appears for a property the selected kind does not have.

import { useMemo } from 'react';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  Bold,
  ChevronsLeftRight,
  ChevronsUpDown,
  Copy,
  Eye,
  EyeOff,
  Group as GroupIcon,
  Italic,
  Layers as LayersIcon,
  Lock,
  MoveDown,
  MoveUp,
  Trash2,
  Ungroup,
  Unlock,
} from 'lucide-react';
import { DsSegmented, DsSelect, DsSlider } from '@/shared/ds';
import type {
  GroupLayer,
  ImageLayer,
  Layer,
  LogoLayer,
  Page,
  ShapeLayer,
  TextLayer,
} from '@/features/editor/schema';
import type { LayerEditingAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { BrandKit } from '@/features/editor/brand/BrandKit';
import { GOOGLE_FONTS } from '@/shared/design-system/googleFonts';
import { IconButton, NumberField, Swatch } from '../components/chrome';
import { StudioPopover, usePopoverAnchor } from '../components/StudioPopover';
import { ColorField } from '../components/ColorField';
import { useSelectedLayers, useStudioStore } from '../state/studioStore';
import {
  alignLayers,
  deleteLayers,
  distributeLayers,
  duplicateLayers,
  groupLayers,
  orderLayers,
  toggleFlag,
  ungroupLayers,
  type AlignMode,
} from '../ops/layerOps';

const ICON = { size: 15, strokeWidth: 1.8 } as const;

interface Props {
  adapter: LayerEditingAdapter | null;
  page: Page | null;
  brandKit: BrandKit | null;
  readOnly: boolean;
  updateLayer: (pageId: string, layerId: string, patch: Partial<Layer>) => void;
  onOpenLayers: () => void;
}

export function StudioContextBar({
  adapter,
  page,
  brandKit,
  readOnly,
  updateLayer,
  onOpenLayers,
}: Props) {
  const selected = useSelectedLayers();
  const selectionCount = useStudioStore((s) => s.selection.length);

  // The bar keeps its height whatever is selected. A toolbar that
  // appears and disappears makes the canvas jump by 46px every time you
  // click something, which is worse than an empty bar.
  if (!adapter || !page) {
    return <div className="st-contextbar" data-studio-contextbar />;
  }

  const ids = selected.map((l) => l.id);
  const single = selected.length === 1 ? selected[0] : null;
  const many = selected.length > 1;
  const disabled = readOnly;

  return (
    <div className="st-contextbar" data-studio-contextbar data-selection={selectionCount}>
      {selected.length === 0 ? (
        <span className="st-contextbar-hint">
          Select something on the canvas to edit it
        </span>
      ) : (
        <>
          {many ? (
            <span className="st-contextbar-hint" style={{ paddingRight: 4 }}>
              {selected.length} selected
            </span>
          ) : null}

          {single?.kind === 'text' ? (
            <TextControls
              layer={single as TextLayer}
              pageId={page.id}
              brandKit={brandKit}
              disabled={disabled}
              updateLayer={updateLayer}
            />
          ) : null}

          {single?.kind === 'shape' ? (
            <ShapeControls
              layer={single as ShapeLayer}
              pageId={page.id}
              brandKit={brandKit}
              disabled={disabled}
              updateLayer={updateLayer}
            />
          ) : null}

          {single?.kind === 'image' ? (
            <ImageControls
              layer={single as ImageLayer}
              pageId={page.id}
              disabled={disabled}
              updateLayer={updateLayer}
            />
          ) : null}

          {single?.kind === 'logo' ? (
            <LogoControls
              layer={single as LogoLayer}
              pageId={page.id}
              disabled={disabled}
              updateLayer={updateLayer}
            />
          ) : null}

          <span className="st-divider" aria-hidden />

          <AlignGroup
            disabled={disabled}
            many={many}
            onAlign={(mode) => adapter && alignLayers(adapter, page, ids, mode)}
            onDistribute={(axis) => adapter && distributeLayers(adapter, page, ids, axis)}
            canDistribute={selected.length >= 3}
          />

          <span className="st-divider" aria-hidden />

          <IconButton
            icon={<MoveUp {...ICON} />}
            label="Bring forward"
            shortcut="⌘]"
            disabled={disabled}
            onClick={() => orderLayers(adapter, page.id, ids, 'forward')}
          />
          <IconButton
            icon={<MoveDown {...ICON} />}
            label="Send backward"
            shortcut="⌘["
            disabled={disabled}
            onClick={() => orderLayers(adapter, page.id, ids, 'backward')}
          />

          {many ? (
            <IconButton
              icon={<GroupIcon {...ICON} />}
              label="Group"
              shortcut="⌘G"
              disabled={disabled}
              onClick={() => groupLayers(adapter, page.id, ids)}
            />
          ) : null}
          {single?.kind === 'group' ? (
            <IconButton
              icon={<Ungroup {...ICON} />}
              label="Ungroup"
              shortcut="⌘⇧G"
              disabled={disabled}
              onClick={() => ungroupLayers(adapter, page.id, ids)}
            />
          ) : null}

          <span className="st-divider" aria-hidden />

          <OpacityControl
            layers={selected}
            pageId={page.id}
            disabled={disabled}
            updateLayer={updateLayer}
          />

          <IconButton
            icon={selected.every((l) => l.locked) ? <Lock {...ICON} /> : <Unlock {...ICON} />}
            label={selected.every((l) => l.locked) ? 'Unlock' : 'Lock'}
            shortcut="⌘L"
            active={selected.every((l) => l.locked)}
            disabled={disabled}
            onClick={() => toggleFlag(adapter, page, ids, 'locked')}
          />
          <IconButton
            icon={selected.every((l) => l.visible) ? <Eye {...ICON} /> : <EyeOff {...ICON} />}
            label={selected.every((l) => l.visible) ? 'Hide' : 'Show'}
            disabled={disabled}
            onClick={() => toggleFlag(adapter, page, ids, 'visible')}
          />
          <IconButton
            icon={<Copy {...ICON} />}
            label="Duplicate"
            shortcut="⌘D"
            disabled={disabled}
            onClick={() => duplicateLayers(adapter, page.id, ids)}
          />
          <IconButton
            icon={<Trash2 {...ICON} />}
            label="Delete"
            shortcut="⌫"
            disabled={disabled}
            onClick={() => deleteLayers(adapter, page.id, ids)}
          />
        </>
      )}

      <span style={{ flex: '1 1 auto' }} />
      <IconButton icon={<LayersIcon {...ICON} />} label="Layers" onClick={onOpenLayers} />
    </div>
  );
}

// ─── Text ──────────────────────────────────────────────────────────────

/**
 * The brand's own typefaces come first, named as what they are.
 *
 * The toolbar this replaces offered seven hard-coded families and none
 * of them were the brand's — in an editor whose whole claim is that it
 * knows the brand.
 */
function fontOptions(kit: BrandKit | null) {
  const brandFonts = [
    kit?.typography.heading.family
      ? { value: kit.typography.heading.family, label: `${kit.typography.heading.family} · Heading` }
      : null,
    kit?.typography.body.family && kit.typography.body.family !== kit.typography.heading.family
      ? { value: kit.typography.body.family, label: `${kit.typography.body.family} · Body` }
      : null,
  ].filter(Boolean) as { value: string; label: string }[];
  const seen = new Set(brandFonts.map((f) => f.value));
  const rest = GOOGLE_FONTS.filter((f) => !seen.has(f)).map((f) => ({ value: f, label: f }));
  return [...brandFonts, ...rest];
}

function TextControls({
  layer,
  pageId,
  brandKit,
  disabled,
  updateLayer,
}: {
  layer: TextLayer;
  pageId: string;
  brandKit: BrandKit | null;
  disabled: boolean;
  updateLayer: (pageId: string, layerId: string, patch: Partial<Layer>) => void;
}) {
  const options = useMemo(() => fontOptions(brandKit), [brandKit]);
  const spacing = usePopoverAnchor();
  const family = typeof layer.fontFamily === 'string' ? layer.fontFamily : '';
  const patch = (p: Partial<TextLayer>) =>
    updateLayer(pageId, layer.id, p as Partial<Layer>);

  return (
    <>
      <div style={{ width: 168, flex: '0 0 auto' }}>
        <DsSelect
          options={options}
          value={family}
          onChange={(value) => patch({ fontFamily: value })}
          aria-label="Font"
        />
      </div>
      <NumberField
        label="Size"
        value={layer.fontSize}
        min={4}
        max={800}
        disabled={disabled}
        onChange={(fontSize) => patch({ fontSize })}
      />
      <IconButton
        icon={<Bold {...ICON} />}
        label="Bold"
        active={layer.fontWeight >= 600}
        disabled={disabled}
        onClick={() => patch({ fontWeight: layer.fontWeight >= 600 ? 400 : 700 })}
      />
      <IconButton
        icon={<Italic {...ICON} />}
        label="Italic"
        active={layer.fontStyle === 'italic'}
        disabled={disabled}
        onClick={() =>
          patch({ fontStyle: layer.fontStyle === 'italic' ? 'normal' : 'italic' })
        }
      />
      <DsSegmented
        aria-label="Text alignment"
        value={layer.textAlign}
        onChange={(v) => patch({ textAlign: v as TextLayer['textAlign'] })}
        options={[
          { value: 'left', label: <AlignStartVertical {...ICON} aria-label="Left" /> },
          { value: 'center', label: <AlignCenterVertical {...ICON} aria-label="Centre" /> },
          { value: 'right', label: <AlignEndVertical {...ICON} aria-label="Right" /> },
        ]}
      />
      <ColorField
        label="Text colour"
        value={typeof layer.color === 'string' ? layer.color : '#000000'}
        brandKit={brandKit}
        disabled={disabled}
        onChange={(color) => patch({ color })}
      />
      {/* Line height and letter spacing have been in the schema since
          day one with no UI at all. They live behind a disclosure
          because they are typographic refinements, not primary
          controls — but they are two clicks away, not absent. */}
      <IconButton
        icon={<ChevronsUpDown {...ICON} />}
        label="Spacing"
        disabled={disabled}
        active={spacing.open}
        {...spacing.triggerProps}
      />
      <StudioPopover
        open={spacing.open}
        onClose={spacing.close}
        anchor={spacing.anchor}
        label="Text spacing"
        width={228}
      >
        <DsSlider
          label="Line height"
          min={0.7}
          max={3}
          step={0.05}
          value={layer.lineHeight}
          format={(v) => v.toFixed(2)}
          onChange={(lineHeight) => patch({ lineHeight })}
        />
        <div style={{ height: 10 }} />
        <DsSlider
          label="Letter spacing"
          min={-0.1}
          max={0.5}
          step={0.005}
          value={layer.letterSpacing}
          format={(v) => `${v.toFixed(3)}em`}
          onChange={(letterSpacing) => patch({ letterSpacing })}
        />
      </StudioPopover>
    </>
  );
}

// ─── Shape ─────────────────────────────────────────────────────────────

function ShapeControls({
  layer,
  pageId,
  brandKit,
  disabled,
  updateLayer,
}: {
  layer: ShapeLayer;
  pageId: string;
  brandKit: BrandKit | null;
  disabled: boolean;
  updateLayer: (pageId: string, layerId: string, patch: Partial<Layer>) => void;
}) {
  const patch = (p: Partial<ShapeLayer>) => updateLayer(pageId, layer.id, p as Partial<Layer>);
  return (
    <>
      <ColorField
        label="Fill"
        value={typeof layer.fill === 'string' ? layer.fill : null}
        brandKit={brandKit}
        allowNone
        disabled={disabled}
        onChange={(fill) => patch({ fill })}
      />
      <ColorField
        label="Border"
        value={typeof layer.stroke === 'string' ? layer.stroke : null}
        brandKit={brandKit}
        allowNone
        disabled={disabled}
        onChange={(stroke) =>
          patch({ stroke, strokeWidth: stroke && layer.strokeWidth === 0 ? 2 : layer.strokeWidth })
        }
      />
      {layer.stroke ? (
        <NumberField
          label="W"
          value={layer.strokeWidth}
          min={0}
          max={200}
          disabled={disabled}
          onChange={(strokeWidth) => patch({ strokeWidth })}
        />
      ) : null}
      {layer.shape === 'rectangle' ? (
        <NumberField
          label="Radius"
          value={layer.cornerRadius}
          min={0}
          max={999}
          disabled={disabled}
          onChange={(cornerRadius) => patch({ cornerRadius })}
        />
      ) : null}
    </>
  );
}

// ─── Image ─────────────────────────────────────────────────────────────

function ImageControls({
  layer,
  pageId,
  disabled,
  updateLayer,
}: {
  layer: ImageLayer;
  pageId: string;
  disabled: boolean;
  updateLayer: (pageId: string, layerId: string, patch: Partial<Layer>) => void;
}) {
  return (
    <DsSegmented
      aria-label="Image fit"
      value={layer.fit}
      onChange={(fit) =>
        updateLayer(pageId, layer.id, { fit } as unknown as Partial<Layer>)
      }
      options={[
        { value: 'cover', label: 'Crop' },
        { value: 'contain', label: 'Fit' },
        { value: 'fill', label: 'Stretch' },
      ]}
    />
  );
}

// ─── Logo ──────────────────────────────────────────────────────────────

const LOGO_VARIANTS = [
  { value: 'auto', label: 'Auto' },
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'wordmark', label: 'Wordmark' },
  { value: 'iconmark', label: 'Brand icon' },
  { value: 'mono.black', label: 'Black' },
  { value: 'mono.white', label: 'White' },
];

function LogoControls({
  layer,
  pageId,
  disabled,
  updateLayer,
}: {
  layer: LogoLayer;
  pageId: string;
  disabled: boolean;
  updateLayer: (pageId: string, layerId: string, patch: Partial<Layer>) => void;
}) {
  return (
    <div style={{ width: 150, flex: '0 0 auto' }}>
      <DsSelect
        aria-label="Logo variant"
        options={LOGO_VARIANTS}
        value={layer.variant}
        onChange={(variant) =>
          updateLayer(pageId, layer.id, { variant } as unknown as Partial<Layer>)
        }
      />
    </div>
  );
}

// ─── Align ─────────────────────────────────────────────────────────────

const ALIGNS: ReadonlyArray<{ mode: AlignMode; label: string; icon: React.ReactNode }> = [
  { mode: 'left', label: 'Align left', icon: <AlignStartVertical {...ICON} /> },
  { mode: 'center-x', label: 'Align centre', icon: <AlignCenterVertical {...ICON} /> },
  { mode: 'right', label: 'Align right', icon: <AlignEndVertical {...ICON} /> },
  { mode: 'top', label: 'Align top', icon: <AlignStartHorizontal {...ICON} /> },
  { mode: 'center-y', label: 'Align middle', icon: <AlignCenterHorizontal {...ICON} /> },
  { mode: 'bottom', label: 'Align bottom', icon: <AlignEndHorizontal {...ICON} /> },
];

function AlignGroup({
  disabled,
  many,
  canDistribute,
  onAlign,
  onDistribute,
}: {
  disabled: boolean;
  many: boolean;
  canDistribute: boolean;
  onAlign: (mode: AlignMode) => void;
  onDistribute: (axis: 'horizontal' | 'vertical') => void;
}) {
  return (
    <>
      {ALIGNS.map((a) => (
        <IconButton
          key={a.mode}
          icon={a.icon}
          // Single selection aligns to the PAGE, several align to each
          // other — so the tooltip says which, rather than leaving the
          // user to discover it by undoing.
          label={many ? a.label : `${a.label} on page`}
          disabled={disabled}
          onClick={() => onAlign(a.mode)}
        />
      ))}
      {canDistribute ? (
        <>
          <IconButton
            icon={<ChevronsLeftRight {...ICON} />}
            label="Space evenly across"
            disabled={disabled}
            onClick={() => onDistribute('horizontal')}
          />
          <IconButton
            icon={<ChevronsUpDown {...ICON} />}
            label="Space evenly down"
            disabled={disabled}
            onClick={() => onDistribute('vertical')}
          />
        </>
      ) : null}
    </>
  );
}

// ─── Opacity ───────────────────────────────────────────────────────────

function OpacityControl({
  layers,
  pageId,
  disabled,
  updateLayer,
}: {
  layers: Layer[];
  pageId: string;
  disabled: boolean;
  updateLayer: (pageId: string, layerId: string, patch: Partial<Layer>) => void;
}) {
  const pop = usePopoverAnchor();
  const value = layers[0]?.opacity ?? 1;
  return (
    <>
      <IconButton label="Opacity" showLabel active={pop.open} disabled={disabled} {...pop.triggerProps} />
      <StudioPopover
        open={pop.open}
        onClose={pop.close}
        anchor={pop.anchor}
        label="Opacity"
        width={220}
      >
        <DsSlider
          label="Opacity"
          min={0}
          max={100}
          value={Math.round(value * 100)}
          format={(v) => `${v}%`}
          onChange={(v) => {
            for (const layer of layers) {
              updateLayer(pageId, layer.id, { opacity: v / 100 } as Partial<Layer>);
            }
          }}
        />
      </StudioPopover>
    </>
  );
}
