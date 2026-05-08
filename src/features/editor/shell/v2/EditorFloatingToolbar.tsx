// EditorFloatingToolbar — context-sensitive toolbar above the selected
// layer. Replaces the legacy right-side Properties panel.
//
// Layer-specific controls live here (font/size for text, fill/stroke
// for shape, source/fit for image, etc.). Document-level controls
// (page dimensions, background) live in the Brand secondary panel
// instead. The "Layers" reorder + visibility list is DEFERRED — a
// disabled affordance in the More menu flags the gap; Phase 4.5 will
// ship a compact Layers overlay accessible from the same button.
//
// Positioning: the toolbar lives inside the canvas main area, absolute
// positioned. For 5a we place it relative to the selected layer's
// document-space transform (treating the canvas as 1:1). True
// viewport-space tracking — accounting for canvas scale and pan —
// lands in Phase 4.5 alongside the zoom controls.

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Brand } from '@/shared/types/brand';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Eye,
  EyeOff,
  Globe2,
  Italic,
  Lock,
  LockOpen,
  MoreHorizontal,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Switch from '@radix-ui/react-switch';
import * as Tooltip from '@radix-ui/react-tooltip';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type {
  GroupLayer,
  ImageLayer,
  Layer,
  LogoLayer,
  ResolvedValue,
  ShapeLayer,
  SlotRef,
  SvgLayer,
  TextLayer,
} from '@/features/editor/schema';
import { isBrandBound } from './brandBound';
import { resolveBrandLogo } from '@/shared/hooks/useBrandLogo';

const SELECTION_BLUE = '#2965f6';

/**
 * Font-size presets shown in the size dropdown next to the type-in
 * input. Covers typical body → display range. The input itself
 * remains free-form (any integer in [6, 400] still typeable), so
 * this is a quick-pick affordance, not a constraint.
 */
const FONT_SIZE_PRESETS: ReadonlyArray<number> = [
  6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96,
  128, 160, 192, 256, 320, 384,
];

export type ToolbarScope = 'page' | 'all';

interface Props {
  adapter: EditorAdapter;
  pageId: string;
  layer: Layer;
  scope: ToolbarScope;
  onScopeChange: (s: ToolbarScope) => void;
  /**
   * Layer-update callback. The Editor wraps adapter.updateLayer to
   * also fire the Step 6 cross-page consistency prompt. Falling back
   * to adapter.updateLayer when omitted keeps the toolbar usable in
   * isolation (tests, Storybook).
   */
  onUpdateLayer?: (
    pageId: string,
    layerId: string,
    patch: Partial<Layer>,
  ) => void;
  /**
   * Current canvas zoom (CSS scale of the canvas wrap). The toolbar
   * lives OUTSIDE the scaled wrap so its chrome stays screen-size
   * regardless of zoom. Layer coords are document-space, so we
   * multiply by zoom to land at the right screen pixel. Defaults to
   * 1 so isolated test renders (no Editor) still position correctly.
   */
  zoom?: number;
  /**
   * Active brand. Optional. When present, the color picker
   * surfaces the brand palette (primary / secondary / accent /
   * neutrals) as one-click swatches alongside the hex input.
   */
  brand?: Brand;
  /**
   * Number of pages in the current document. When <= 1 the
   * "This page / All pages" scope toggle is hidden — there's no
   * "all pages" to talk about on a single-page design (business
   * card, social post, banner). Defaults to 2 so isolated test
   * renders that don't pass it keep the legacy behavior.
   */
  pageCount?: number;
}

export function EditorFloatingToolbar({
  adapter,
  pageId,
  layer,
  scope,
  onScopeChange,
  onUpdateLayer,
  zoom = 1,
  brand,
  pageCount = 2,
}: Props) {
  // Position in OVERLAY pixels (= document coords × zoom). The 50px
  // breathing room above the layer is in SCREEN pixels — applied
  // after the zoom multiply, so the toolbar sits the same visual
  // distance from the layer's top edge at any zoom.
  const left = (layer.transform.x + layer.transform.width / 2) * zoom;
  const top = Math.max(8, layer.transform.y * zoom - 50);

  const update = (patch: Partial<Layer>) => {
    if (onUpdateLayer) onUpdateLayer(pageId, layer.id, patch);
    else adapter.updateLayer(pageId, layer.id, patch);
  };

  // Color picker — managed at the toolbar level so the picker bar
  // can render as a SIBLING above the toolbar (no Radix Popover, no
  // collision-flipping). The toolbar tracks which color slot is
  // open ('color' | 'fill' | 'stroke') and what callback to invoke
  // when the user picks a value.
  const [pickerField, setPickerField] = useState<string | null>(null);
  const pickerCallbackRef = useRef<((hex: string) => void) | null>(null);
  const pickerCurrentRef = useRef<string>('#000000');
  const openPicker = (field: string, value: string, onPick: (hex: string) => void) => {
    pickerCallbackRef.current = onPick;
    pickerCurrentRef.current = value;
    setPickerField(field);
  };
  const closePicker = () => setPickerField(null);
  // Close the picker if the selection switches to a different layer
  // (the open field would no longer correspond to the right slot).
  useEffect(() => {
    setPickerField(null);
  }, [layer.id]);

  return (
    <>
      {pickerField ? (
        <ColorPickerBar
          // Stack just above the toolbar — same horizontal anchor,
          // a hair of vertical breathing room. No flipping, no
          // off-screen drift.
          left={left}
          top={Math.max(8, top - 8)}
          translateY="calc(-100% - 0px)"
          value={pickerCurrentRef.current}
          brand={brand}
          onPick={(hex) => {
            pickerCallbackRef.current?.(hex);
            // Stay open so the user can adjust further; clicking the
            // same chip again or anywhere outside the picker closes.
            pickerCurrentRef.current = hex;
          }}
          onClose={closePicker}
        />
      ) : null}

      <div
        data-floating-toolbar
        data-layer-id={layer.id}
        data-layer-kind={layer.kind}
        className="absolute z-20 flex items-center gap-0.5 px-1 py-1"
        style={{
          top,
          left,
          transform: 'translateX(-50%)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-md)',
          outline:
            scope === 'all' && pageCount > 1
              ? `2px solid color-mix(in srgb, ${SELECTION_BLUE} 45%, transparent)`
              : 'none',
          outlineOffset: 2,
        }}
      >
        {pageCount > 1 ? (
          <>
            <ScopeToggle scope={scope} onChange={onScopeChange} />
            <Sep />
          </>
        ) : null}

        <KindControls
          layer={layer}
          update={update}
          brand={brand}
          openColorPicker={openPicker}
          openColorPickerField={pickerField}
        />

        <Sep />
        <MoreMenu layer={layer} update={update} />
      </div>
    </>
  );
}

// ─── Always-visible bits ───────────────────────────────────────────────

function ScopeToggle({
  scope,
  onChange,
}: {
  scope: ToolbarScope;
  onChange: (s: ToolbarScope) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(scope === 'page' ? 'all' : 'page')}
      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition-colors"
      style={{
        background: scope === 'all' ? SELECTION_BLUE : 'var(--surface-sunken)',
        color: scope === 'all' ? '#fff' : 'var(--text-secondary)',
      }}
      title="Toggle whole-document scope"
      data-scope-toggle
    >
      <Globe2 className="h-3 w-3" />
      {scope === 'all' ? 'All pages' : 'This page'}
    </button>
  );
}

function Sep() {
  return (
    <span
      className="mx-0.5 h-4 w-px"
      style={{ background: 'var(--border)' }}
    />
  );
}

// ─── Per-kind dispatch ────────────────────────────────────────────────

type OpenColorPickerFn = (
  field: string,
  value: string,
  onPick: (hex: string) => void,
) => void;

function KindControls({
  layer,
  update,
  brand,
  openColorPicker,
  openColorPickerField,
}: {
  layer: Layer;
  update: (patch: Partial<Layer>) => void;
  brand?: Brand;
  openColorPicker: OpenColorPickerFn;
  openColorPickerField: string | null;
}) {
  // The schema's discriminated union loses TS narrowing across this
  // switch (z.lazy + GroupLayer breaks the discriminator at the type
  // level — the same issue surfaces in adapter/layerMapping.ts and
  // brand/applyBrandToDocument.ts). Cast through `unknown` so the
  // per-kind components get the right shape at runtime; the runtime
  // discriminator on `layer.kind` keeps the dispatch correct.
  switch (layer.kind) {
    case 'text':
      return (
        <TextControls
          layer={layer as unknown as TextLayer}
          update={update as unknown as (p: Partial<TextLayer>) => void}
          brand={brand}
          openColorPicker={openColorPicker}
          openColorPickerField={openColorPickerField}
        />
      );
    case 'shape':
      return (
        <ShapeControls
          layer={layer as unknown as ShapeLayer}
          update={update as unknown as (p: Partial<ShapeLayer>) => void}
          brand={brand}
          openColorPicker={openColorPicker}
          openColorPickerField={openColorPickerField}
        />
      );
    case 'image':
      return (
        <ImageControls
          layer={layer as unknown as ImageLayer}
          update={update as unknown as (p: Partial<ImageLayer>) => void}
        />
      );
    case 'svg':
      return (
        <SvgControls
          layer={layer as unknown as SvgLayer}
          update={update as unknown as (p: Partial<SvgLayer>) => void}
        />
      );
    case 'logo':
      return (
        <LogoControls
          layer={layer as unknown as LogoLayer}
          update={update as unknown as (p: Partial<LogoLayer>) => void}
          brand={brand}
        />
      );
    case 'group':
      return <GroupControls layer={layer as unknown as GroupLayer} />;
  }
}

// ─── Text ──────────────────────────────────────────────────────────────

const FONT_OPTIONS = [
  { label: 'System UI', value: 'system-ui, sans-serif' },
  { label: 'Inter', value: '"Inter", sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times', value: '"Times New Roman", Times, serif' },
  { label: 'Roboto', value: '"Roboto", sans-serif' },
  { label: 'Courier', value: '"Courier New", Courier, monospace' },
];

function TextControls({
  layer,
  update,
  brand,
  openColorPicker,
  openColorPickerField,
}: {
  layer: TextLayer;
  update: (patch: Partial<TextLayer>) => void;
  brand?: Brand;
  openColorPicker: OpenColorPickerFn;
  openColorPickerField: string | null;
}) {
  const isSlotFont = isSlot(layer.fontFamily);
  const isSlotColor = isSlot(layer.color);
  const fontLocked = isBrandBound(layer, 'fontFamily');
  const colorLocked = isBrandBound(layer, 'color');

  const fontLabel = useMemo(() => {
    if (isSlotFont) return slotShortLabel(layer.fontFamily as SlotRef);
    const v = String(layer.fontFamily);
    const matched = FONT_OPTIONS.find((o) => o.value === v);
    return matched?.label ?? truncateFamily(v);
  }, [layer.fontFamily, isSlotFont]);

  return (
    <>
      {/* Font picker — when slot-bound, click chip to open picker; when
          the layer is brandLocked the LockedGate freezes it read-only. */}
      <LockedGate locked={fontLocked}>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition-colors"
              data-control="font"
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'var(--surface-hover)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
              title={isSlotFont ? 'Brand-bound font (click to override)' : 'Font'}
            >
              <span
                className="max-w-[100px] truncate"
                style={isSlotFont ? { color: 'var(--text-secondary)' } : undefined}
              >
                {fontLabel}
              </span>
              <ChevronDown className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              data-workspace
              align="start"
              sideOffset={4}
              className="z-50 min-w-[180px] rounded-lg p-1"
              style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              {FONT_OPTIONS.map((o) => (
                <DropdownMenu.Item
                  key={o.value}
                  onSelect={() => update({ fontFamily: o.value })}
                  className="cursor-pointer rounded-md px-2 py-1 text-[12px] outline-none"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'var(--surface-hover)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <span style={{ fontFamily: o.value }}>{o.label}</span>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </LockedGate>

      {/* Size — not brand-bound, always editable.
          Presets cover typical print/canvas range; the input itself
          stays free-form so any value in [6, 400] is still typeable. */}
      <NumberPill
        value={Math.round(layer.fontSize)}
        min={6}
        max={400}
        onChange={(v) => update({ fontSize: v })}
        title="Font size"
        presets={FONT_SIZE_PRESETS}
      />

      {/* Weight toggle (just bold/normal) — not brand-bound */}
      <IconBtn
        title="Bold"
        active={layer.fontWeight >= 600}
        onClick={() =>
          update({ fontWeight: layer.fontWeight >= 600 ? 400 : 700 })
        }
      >
        <Bold className="h-3.5 w-3.5" />
      </IconBtn>

      {/* Italic — schema doesn't have a fontStyle field; leave as
          a no-op for the visual pass. Phase 4.5 will add fontStyle. */}
      <IconBtn title="Italic (deferred)" active={false} disabled onClick={() => {}}>
        <Italic className="h-3.5 w-3.5" />
      </IconBtn>

      {/* Align — not brand-bound */}
      <AlignToggle layer={layer} update={update} />

      {/* Color — gated when brand-bound */}
      <LockedGate locked={colorLocked}>
        <ColorChip
          value={layer.color}
          slotBound={isSlotColor}
          onChange={(v) => update({ color: v })}
          title={isSlotColor ? 'Brand color (click to override)' : 'Color'}
          controlId="color"
          brand={brand}
          openColorPicker={openColorPicker}
          isOpen={openColorPickerField === 'color'}
        />
      </LockedGate>
    </>
  );
}

function AlignToggle({
  layer,
  update,
}: {
  layer: TextLayer;
  update: (patch: Partial<TextLayer>) => void;
}) {
  const next: TextLayer['textAlign'] =
    layer.textAlign === 'left'
      ? 'center'
      : layer.textAlign === 'center'
      ? 'right'
      : 'left';
  const Icon =
    layer.textAlign === 'left'
      ? AlignLeft
      : layer.textAlign === 'center'
      ? AlignCenter
      : AlignRight;
  return (
    <IconBtn title={`Align: ${layer.textAlign}`} onClick={() => update({ textAlign: next })}>
      <Icon className="h-3.5 w-3.5" />
    </IconBtn>
  );
}

// ─── Shape ────────────────────────────────────────────────────────────

function ShapeControls({
  layer,
  update,
  brand,
  openColorPicker,
  openColorPickerField,
}: {
  layer: ShapeLayer;
  update: (patch: Partial<ShapeLayer>) => void;
  brand?: Brand;
  openColorPicker: OpenColorPickerFn;
  openColorPickerField: string | null;
}) {
  const fillLocked = isBrandBound(layer, 'fill');
  const strokeLocked = isBrandBound(layer, 'stroke');
  return (
    <>
      <LockedGate locked={fillLocked}>
        <ColorChip
          value={layer.fill ?? '#000000'}
          slotBound={isSlot(layer.fill)}
          onChange={(v) => update({ fill: v })}
          title="Fill"
          controlId="fill"
          brand={brand}
          openColorPicker={openColorPicker}
          isOpen={openColorPickerField === 'fill'}
        />
      </LockedGate>
      <LockedGate locked={strokeLocked}>
        <ColorChip
          value={layer.stroke ?? '#000000'}
          slotBound={isSlot(layer.stroke)}
          onChange={(v) => update({ stroke: v })}
          title="Stroke"
          controlId="stroke"
          outline
          brand={brand}
          openColorPicker={openColorPicker}
          isOpen={openColorPickerField === 'stroke'}
        />
      </LockedGate>
      <NumberPill
        value={Math.round(layer.strokeWidth)}
        min={0}
        max={50}
        onChange={(v) => update({ strokeWidth: v })}
        title="Stroke width"
      />
      {layer.shape === 'rectangle' ? (
        <NumberPill
          value={Math.round(layer.cornerRadius)}
          min={0}
          max={Math.max(layer.transform.width, layer.transform.height) / 2}
          onChange={(v) => update({ cornerRadius: v })}
          title="Corner radius"
        />
      ) : null}
    </>
  );
}

// ─── Image ────────────────────────────────────────────────────────────

function ImageControls({
  layer,
  update,
}: {
  layer: ImageLayer;
  update: (patch: Partial<ImageLayer>) => void;
}) {
  const fitOptions: Array<{ label: string; value: ImageLayer['fit'] }> = [
    { label: 'Cover', value: 'cover' },
    { label: 'Contain', value: 'contain' },
    { label: 'Fill', value: 'fill' },
  ];
  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition-colors"
            data-control="fit"
            title="Fit"
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'var(--surface-hover)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'transparent')
            }
          >
            Fit: {layer.fit}
            <ChevronDown className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            data-workspace
            align="start"
            sideOffset={4}
            className="z-50 rounded-lg p-1"
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {fitOptions.map((o) => (
              <DropdownMenu.Item
                key={o.value}
                onSelect={() => update({ fit: o.value })}
                className="cursor-pointer rounded-md px-2 py-1 text-[12px] outline-none"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--surface-hover)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                {o.label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <SourcePill
        value={typeof layer.src === 'string' ? layer.src : ''}
        onChange={(v) => update({ src: v })}
        placeholder="Image URL"
      />
    </>
  );
}

// ─── SVG ──────────────────────────────────────────────────────────────

function SvgControls({
  layer,
  update,
}: {
  layer: SvgLayer;
  update: (patch: Partial<SvgLayer>) => void;
}) {
  return (
    <SourcePill
      value={typeof layer.src === 'string' ? layer.src : ''}
      onChange={(v) => update({ src: v })}
      placeholder="SVG URL"
    />
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────

const LOGO_VARIANT_OPTIONS: ReadonlyArray<{
  label: string;
  value: LogoLayer['variant'];
  /** Logo role to resolve for the thumbnail. `auto` previews `primary`. */
  resolveRole: 'primary' | 'secondary' | 'wordmark' | 'iconmark' | 'mono.black' | 'mono.white';
  /** Tile background — mono variants need an explicit contrast bg so
   *  white-on-white / black-on-black thumbnails stay visible. */
  tileBg: 'light' | 'dark' | 'auto';
}> = [
  { label: 'Auto',       value: 'auto',       resolveRole: 'primary',    tileBg: 'auto'  },
  { label: 'Primary',    value: 'primary',    resolveRole: 'primary',    tileBg: 'auto'  },
  { label: 'Secondary',  value: 'secondary',  resolveRole: 'secondary',  tileBg: 'auto'  },
  { label: 'Wordmark',   value: 'wordmark',   resolveRole: 'wordmark',   tileBg: 'auto'  },
  { label: 'Iconmark',   value: 'iconmark',   resolveRole: 'iconmark',   tileBg: 'auto'  },
  { label: 'Mono Black', value: 'mono.black', resolveRole: 'mono.black', tileBg: 'light' },
  { label: 'Mono White', value: 'mono.white', resolveRole: 'mono.white', tileBg: 'dark'  },
];

function LogoControls({
  layer,
  update,
  brand,
}: {
  layer: LogoLayer;
  update: (patch: Partial<LogoLayer>) => void;
  brand?: Brand;
}) {
  // Variant is intentionally NOT gated by `isBrandBound` / `LockedGate`.
  // The user's contract: logos are never locked — clicking the logo
  // always opens the variant picker, the same way clicking a text
  // layer opens the font picker.
  const currentOpt =
    LOGO_VARIANT_OPTIONS.find((o) => o.value === layer.variant) ??
    LOGO_VARIANT_OPTIONS[0];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] transition-colors"
          data-control="variant"
          title="Logo variant"
        >
          <LogoVariantThumb
            brand={brand}
            role={currentOpt.resolveRole}
            tileBg={currentOpt.tileBg}
            size={20}
          />
          <span>{currentOpt.label}</span>
          <ChevronDown className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          data-workspace
          data-control-popover="logo-variant"
          align="start"
          sideOffset={6}
          className="z-50 rounded-xl p-2"
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            width: 232,
          }}
        >
          <div
            className="px-1.5 pb-1.5 text-[10px] font-medium uppercase"
            style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
          >
            Logo variants
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {LOGO_VARIANT_OPTIONS.map((o) => (
              <DropdownMenu.Item
                key={o.value}
                data-logo-variant-option={o.value}
                onSelect={() => update({ variant: o.value })}
                className="flex cursor-pointer flex-col items-center gap-1 rounded-lg p-1.5 text-[10px] outline-none"
                style={{
                  color: 'var(--text-primary)',
                  border:
                    layer.variant === o.value
                      ? '1.5px solid var(--accent)'
                      : '1px solid var(--border)',
                  background:
                    layer.variant === o.value
                      ? 'var(--accent-muted)'
                      : 'var(--surface)',
                }}
              >
                <LogoVariantThumb
                  brand={brand}
                  role={o.resolveRole}
                  tileBg={o.tileBg}
                  size={48}
                />
                <span className="text-center leading-tight">{o.label}</span>
              </DropdownMenu.Item>
            ))}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function LogoVariantThumb({
  brand,
  role,
  tileBg,
  size,
}: {
  brand?: Brand;
  role: 'primary' | 'secondary' | 'wordmark' | 'iconmark' | 'mono.black' | 'mono.white';
  tileBg: 'light' | 'dark' | 'auto';
  size: number;
}) {
  const resolved = useMemo(
    () => (brand ? resolveBrandLogo(brand, role) : undefined),
    [brand, role],
  );

  const bg =
    tileBg === 'dark'
      ? '#0d0d0d'
      : tileBg === 'light'
        ? '#ffffff'
        : 'var(--surface-sunken, #f4f4f3)';

  return (
    <span
      data-logo-variant-thumb={role}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: 6,
        background: bg,
        border: '1px solid var(--border)',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {resolved?.url ? (
        <img
          src={resolved.url}
          alt=""
          style={{
            maxWidth: '85%',
            maxHeight: '85%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      ) : (
        <span
          style={{
            fontSize: Math.max(8, size * 0.32),
            color: 'var(--text-muted)',
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}
        >
          {role.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}

// ─── Group (read-only info) ───────────────────────────────────────────

function GroupControls({ layer }: { layer: GroupLayer }) {
  return (
    <span
      className="px-2 py-1 text-[11px]"
      style={{ color: 'var(--text-muted)' }}
    >
      Group · {layer.children.length} {layer.children.length === 1 ? 'layer' : 'layers'}
    </span>
  );
}

// ─── More menu (universal: opacity, visibility, lock, layers stub) ───

function MoreMenu({
  layer,
  update,
}: {
  layer: Layer;
  update: (patch: Partial<Layer>) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
          data-control="more"
          aria-label="More"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          data-workspace
          align="end"
          sideOffset={6}
          className="z-50 min-w-[200px] rounded-lg p-1.5"
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {/* Opacity slider */}
          <div className="px-2 py-1">
            <label
              className="mb-1 block text-[10px] uppercase"
              style={{
                color: 'var(--text-muted)',
                letterSpacing: '0.14em',
              }}
            >
              Opacity {(layer.opacity * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={layer.opacity}
              onChange={(e) => update({ opacity: Number(e.target.value) })}
              className="w-full"
            />
          </div>
          <DropdownMenu.Separator
            className="my-1 h-px"
            style={{ background: 'var(--border)' }}
          />
          <DropdownMenu.Item
            onSelect={() => update({ visible: !layer.visible })}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-[12px] outline-none"
          >
            {layer.visible ? (
              <Eye className="h-3 w-3" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
            {layer.visible ? 'Hide layer' : 'Show layer'}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => update({ locked: !layer.locked })}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-[12px] outline-none"
          >
            {layer.locked ? (
              <LockOpen className="h-3 w-3" />
            ) : (
              <Lock className="h-3 w-3" />
            )}
            {layer.locked ? 'Unlock' : 'Lock'}
          </DropdownMenu.Item>
          {/* Brand-managed toggle is hidden for logo layers — logos
              are never locked at the layer level; the variant picker
              keeps them in sync with the brand kit, the lock would
              only freeze position/size pointlessly. */}
          {layer.kind !== 'logo' ? (
            <>
              <DropdownMenu.Separator
                className="my-1 h-px"
                style={{ background: 'var(--border)' }}
              />
              <BrandManagedRow layer={layer} update={update} />
            </>
          ) : null}
          <DropdownMenu.Separator
            className="my-1 h-px"
            style={{ background: 'var(--border)' }}
          />
          <DropdownMenu.Item
            disabled
            className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-1 text-[12px] outline-none"
            style={{ color: 'var(--text-muted)' }}
          >
            Layers… <span className="ml-auto text-[10px]">soon</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/**
 * "Brand-managed" switch — Step 5c. Toggles `layer.brandLocked`. When
 * on, brand-bound properties (color/font/fill/stroke/variant) become
 * read-only in the toolbar and a small lock badge appears on the
 * layer's selection box. Off restores edit access.
 *
 * Lives inside the More menu (not a top-level toolbar control) per
 * spec: brandLocked is a metadata flag, not a styling property —
 * surfacing it inline competes with frequently-used controls.
 */
function BrandManagedRow({
  layer,
  update,
}: {
  layer: Layer;
  update: (patch: Partial<Layer>) => void;
}) {
  // DropdownMenu.Item swallows clicks to dismiss the menu — wrap the
  // switch in an Item-as-div so the click toggles the switch without
  // closing the menu.
  return (
    <div
      data-control="brand-managed"
      className="flex items-center gap-2 rounded-md px-2 py-1 text-[12px]"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Lock className="h-3 w-3" />
      <Tooltip.Provider delayDuration={300} disableHoverableContent>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <span style={{ flex: 1 }}>Brand-managed</span>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              data-workspace
              side="left"
              sideOffset={8}
              className="z-50 max-w-[220px] rounded-lg px-2 py-1.5 text-[11px]"
              style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-md)',
                color: 'var(--text-primary)',
              }}
            >
              When on, this layer’s brand-bound properties stay synced with the
              brand kit. Toggle off to override.
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
      <Switch.Root
        checked={layer.brandLocked}
        onCheckedChange={(next) => update({ brandLocked: next })}
        data-control="brand-managed-switch"
        aria-label="Brand-managed"
        style={{
          width: 28,
          height: 16,
          borderRadius: 999,
          background: layer.brandLocked
            ? SELECTION_BLUE
            : 'var(--surface-sunken)',
          position: 'relative',
          border: '1px solid var(--border)',
          transition: 'background 180ms var(--ease)',
          flexShrink: 0,
        }}
      >
        <Switch.Thumb
          style={{
            display: 'block',
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.18)',
            transform: layer.brandLocked
              ? 'translateX(14px)'
              : 'translateX(2px)',
            transition: 'transform 180ms var(--ease)',
            willChange: 'transform',
          }}
        />
      </Switch.Root>
    </div>
  );
}

// ─── Lock gate ────────────────────────────────────────────────────────
//
// Wraps a brand-bound control when `layer.brandLocked === true`.
// Mutes the visual, blocks pointer interaction, and surfaces a
// tooltip explaining how to unlock. Resolved values still render —
// designers need to SEE what the brand kit produced even when they
// can't edit. Consumers always pass a `locked` prop computed from
// `isBrandBound(layer, prop)`; when false, the gate is a no-op
// passthrough.

function LockedGate({
  locked,
  children,
}: {
  locked: boolean;
  children: ReactNode;
}) {
  if (!locked) return <>{children}</>;
  return (
    <Tooltip.Provider delayDuration={250} disableHoverableContent>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            data-locked-gate
            // Display: inline-flex so the inner control's bounding
            // box still maps 1:1 to the gate (the toolbar lays things
            // out horizontally with gaps).
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              opacity: 0.5,
              cursor: 'not-allowed',
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <span style={{ pointerEvents: 'none' }}>{children}</span>
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            data-workspace
            side="bottom"
            sideOffset={8}
            className="z-50 inline-flex max-w-[260px] items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px]"
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
              color: 'var(--text-primary)',
            }}
            data-locked-tooltip
          >
            <Lock className="h-3 w-3" />
            Managed by brand kit. Toggle ‘Brand-managed’ off to edit.
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────

function NumberPill({
  value,
  min,
  max,
  onChange,
  title,
  presets,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  title: string;
  /**
   * Optional preset values. When provided, a small chevron renders
   * next to the input and opens a Radix dropdown of click-to-pick
   * values. The free-form input remains usable. Max-height + scroll
   * are inherited from the cosmos `[role="menu"]` cap in
   * workspace.css — no per-site styling needed.
   */
  presets?: ReadonlyArray<number>;
}) {
  const input = (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (Number.isFinite(v)) onChange(v);
      }}
      title={title}
      className="rounded-lg px-2 py-1 text-[11px] outline-none"
      style={{
        background: 'transparent',
        border: '1px solid transparent',
        color: 'var(--text-primary)',
        width: presets ? 40 : 48,
      }}
      onFocus={(e) => {
        e.currentTarget.style.background = 'var(--surface-sunken)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = 'transparent';
      }}
    />
  );

  if (!presets) return input;

  return (
    <div className="flex items-center" data-control={`numberpill-${title}`}>
      {input}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="flex h-7 w-5 items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            aria-label={`${title} presets`}
            data-control={`numberpill-presets-${title}`}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'var(--surface-hover)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'transparent')
            }
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            data-workspace
            align="start"
            sideOffset={6}
            className="z-50 min-w-[80px] rounded-lg p-1"
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {presets.map((p) => (
              <DropdownMenu.Item
                key={p}
                onSelect={() => onChange(p)}
                className="cursor-pointer rounded px-2 py-1 text-[11px] outline-none"
                style={{
                  color: 'var(--text-primary)',
                  background: p === value ? 'var(--surface-hover)' : 'transparent',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--surface-hover)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background =
                    p === value ? 'var(--surface-hover)' : 'transparent')
                }
              >
                {p}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

function IconBtn({
  children,
  title,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={!!active}
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
      style={{
        background: active ? 'var(--accent-muted)' : 'transparent',
        color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!active && !disabled)
          e.currentTarget.style.background = 'var(--surface-hover)';
      }}
      onMouseLeave={(e) => {
        if (!active && !disabled)
          e.currentTarget.style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

function ColorChip({
  value,
  slotBound,
  onChange,
  title,
  controlId,
  outline,
  brand: _brand,
  openColorPicker,
  isOpen,
}: {
  value: ResolvedValue | null;
  slotBound: boolean;
  onChange: (v: ResolvedValue) => void;
  title: string;
  /** Stable selector id for tests. Defaults to a normalized form of
   *  `title` but callers should pass an explicit id (e.g. 'color',
   *  'fill', 'stroke') so the test selector doesn't depend on the
   *  visible label, which differs between slot-bound and literal
   *  modes ("Color" vs "Brand color (click to override)"). */
  controlId?: string;
  outline?: boolean;
  /** Optional brand context. The toolbar already passes brand into
   *  the picker bar; this prop stays for API symmetry but isn't
   *  read here directly. */
  brand?: Brand;
  /** Hand-off to the toolbar's picker manager. Called when this
   *  chip is clicked; the toolbar then mounts the picker bar with
   *  the supplied value + onPick callback. */
  openColorPicker: OpenColorPickerFn;
  /** True when this chip is the one whose picker is currently open
   *  (so we can render an "active" affordance + toggle off on
   *  re-click). */
  isOpen: boolean;
}) {
  const dataControl = controlId ?? title.toLowerCase();
  // Both slot-bound and literal values flow through the same
  // picker bar. For slot-bound values the SlotRef resolves to a
  // placeholder hex so the chip + picker show a real colour;
  // picking a new value commits it as a literal hex (this is the
  // same effect the old "Override with literal color" button had,
  // but inline). The "Bound to brand" intermediate dropdown is
  // gone per user request — going to colors directly.
  const hex =
    slotBound && value && typeof value !== 'string' && typeof value !== 'number'
      ? slotPlaceholderHex(value as SlotRef)
      : toCssColor(value);
  return (
    <button
      type="button"
      title={title}
      data-control={dataControl}
      data-color-chip-open={isOpen ? 'true' : 'false'}
      data-slot-bound={slotBound ? '' : undefined}
      onClick={() =>
        openColorPicker(dataControl, hex, (next) => onChange(next))
      }
      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg transition-colors"
      style={{
        background: isOpen ? 'var(--surface-sunken)' : 'transparent',
        border: 'none',
      }}
    >
      <span
        className="h-3.5 w-3.5 rounded-full"
        style={{
          background: outline ? 'transparent' : hex,
          boxShadow: outline
            ? `inset 0 0 0 2px ${hex}`
            : '0 0 0 1px var(--border-strong)',
        }}
        aria-hidden
      />
    </button>
  );
}

// ─── Color-picker bar — sibling above the toolbar, no popover ──────────

interface BrandSwatch {
  label: string;
  hex: string;
}

/** Convert any ResolvedValue (string, number, SlotRef) to a CSS color
 *  string suitable for the chip preview. Defaults to black on
 *  unknown shapes. */
function toCssColor(value: ResolvedValue | null): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number')
    return '#' + value.toString(16).padStart(6, '0');
  return '#000000';
}

function brandSwatches(brand?: Brand): BrandSwatch[] {
  if (!brand) return [];
  const out: BrandSwatch[] = [];
  const seen = new Set<string>();
  const push = (label: string, hex?: string | null) => {
    if (!hex) return;
    const norm = hex.toLowerCase();
    if (seen.has(norm)) return;
    seen.add(norm);
    out.push({ label, hex });
  };
  // Canonical color system first.
  const cs = brand.colorSystem;
  if (cs) {
    push('Primary', cs.primary?.hex);
    push('Secondary', cs.secondary?.hex);
    push('Accent', cs.accent?.hex);
    cs.neutrals?.forEach((n, i) =>
      push(n?.name ?? `Neutral ${i + 1}`, n?.hex),
    );
  }
  // Legacy fields as fallback.
  push('Primary', brand.primaryColor);
  push('Secondary', brand.secondaryColor);
  push('Accent', brand.accentColor);
  return out;
}

/**
 * Validates and normalizes a hex string. Accepts 3- or 6-digit hex
 * with or without the leading '#'. Returns the canonical 7-char
 * "#rrggbb" form on success, null on failure.
 */
function normalizeHex(raw: string): string | null {
  const cleaned = raw.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(cleaned)) {
    return (
      '#' +
      cleaned
        .split('')
        .map((c) => c + c)
        .join('')
    );
  }
  if (/^[0-9a-f]{6}$/.test(cleaned)) return '#' + cleaned;
  return null;
}

// ─── HSL ↔ hex helpers (kept tiny, no extra deps) ──────────────────────

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === rf) h = ((gf - bf) / d) % 6;
    else if (max === gf) h = (bf - rf) / d + 2;
    else h = (rf - gf) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return [h, s, v];
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = v - c;
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/**
 * Try to coerce any CSS color string the layer might hold (hex,
 * rgb(...), hsl(...)) into a 7-char "#rrggbb". Falls back to '#000000'
 * if parsing fails. Used so the bar can edit non-hex starting values
 * (the schema's `color` is a freeform ResolvedValue).
 */
function anyColorToHex(value: string): string {
  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    const c = trimmed.slice(1);
    return ('#' + c[0] + c[0] + c[1] + c[1] + c[2] + c[2]).toLowerCase();
  }
  // Defer to the browser for rgb()/hsl()/named colors. Render to a
  // canvas and read back the pixel; this works in any modern DOM but
  // is wrapped in try/catch for jsdom (which lacks Canvas2D).
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#000000';
    ctx.fillStyle = '#000';
    ctx.fillStyle = trimmed;
    ctx.fillRect(0, 0, 1, 1);
    const data = ctx.getImageData(0, 0, 1, 1).data;
    return rgbToHex(data[0], data[1], data[2]);
  } catch {
    return '#000000';
  }
}

function ColorPickerBar({
  left,
  top,
  translateY,
  value,
  brand,
  onPick,
  onClose,
}: {
  /** Horizontal anchor in overlay pixels (matches the toolbar). */
  left: number;
  /** Vertical anchor in overlay pixels (the toolbar's top minus a gap). */
  top: number;
  /** Extra translate so the bar sits ABOVE its top anchor (-100%). */
  translateY: string;
  /** Current color — accepts hex, rgb(), hsl(), or named colors. */
  value: string;
  /** Optional brand for the swatch row. */
  brand?: Brand;
  /** Fired on every commit (swatch click, wheel drag, valid hex). */
  onPick: (hex: string) => void;
  /** Click-outside / Escape closes the bar. */
  onClose: () => void;
}) {
  const swatches = useMemo(() => brandSwatches(brand), [brand]);
  const startHex = useMemo(() => anyColorToHex(value), [value]);
  // HSV is the working representation — easier to drive a hue strip
  // and a saturation/value square than HSL. Hue 0-360, sat 0-1, val 0-1.
  const [rgb] = useState(() => hexToRgb(startHex));
  const [h, setH] = useState<number>(() => rgbToHsv(...rgb)[0]);
  const [s, setS] = useState<number>(() => rgbToHsv(...rgb)[1]);
  const [v, setV] = useState<number>(() => rgbToHsv(...rgb)[2]);
  // Local hex draft so the user can type freely; only valid hex
  // commits to the layer.
  const [draft, setDraft] = useState(startHex.replace(/^#/, ''));

  // Sync local HSV + draft whenever the parent value changes (e.g.
  // user clicked a brand swatch — the new hex flows back in).
  useEffect(() => {
    const incomingHex = anyColorToHex(value);
    setDraft(incomingHex.replace(/^#/, ''));
    const [nr, ng, nb] = hexToRgb(incomingHex);
    const [nh, ns, nv] = rgbToHsv(nr, ng, nb);
    setH(nh);
    setS(ns);
    setV(nv);
  }, [value]);

  const commit = (nh: number, ns: number, nv: number) => {
    const [r, g, b] = hsvToRgb(nh, ns, nv);
    const hex = rgbToHex(r, g, b);
    setH(nh);
    setS(ns);
    setV(nv);
    setDraft(hex.replace(/^#/, ''));
    onPick(hex);
  };

  // Click-outside + Escape to close. Listener on document so a click
  // anywhere outside the bar dismisses it.
  const barRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const node = barRef.current;
      if (!node) return;
      if (e.target instanceof Node && node.contains(e.target)) return;
      // Don't close when clicking a chip — it would re-open immediately.
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-control="color"], [data-control="fill"], [data-control="stroke"]'))
        return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Defer to next tick so the click that opened us doesn't fire close.
    const id = window.setTimeout(() => {
      document.addEventListener('mousedown', onDown);
      document.addEventListener('keydown', onKey);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // SV-square drag: pointer events, capture-from-down so dragging
  // outside the square keeps tracking until release.
  const svRef = useRef<HTMLDivElement | null>(null);
  const handleSvPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = svRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    const update = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      const ns = clamp((clientX - rect.left) / rect.width, 0, 1);
      const nv = 1 - clamp((clientY - rect.top) / rect.height, 0, 1);
      commit(h, ns, nv);
    };
    update(e.clientX, e.clientY);
    const onMove = (ev: PointerEvent) => update(ev.clientX, ev.clientY);
    const onUp = (ev: PointerEvent) => {
      el.releasePointerCapture(ev.pointerId);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
  };

  // Hue-strip drag.
  const hueRef = useRef<HTMLDivElement | null>(null);
  const handleHuePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = hueRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    const update = (clientX: number) => {
      const rect = el.getBoundingClientRect();
      const nh = clamp((clientX - rect.left) / rect.width, 0, 1) * 360;
      commit(nh, s, v);
    };
    update(e.clientX);
    const onMove = (ev: PointerEvent) => update(ev.clientX);
    const onUp = (ev: PointerEvent) => {
      el.releasePointerCapture(ev.pointerId);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
  };

  // Square + strip dimensions (kept compact — the bar is meant to
  // sit above the toolbar without crowding the canvas).
  const SV_W = 200;
  const SV_H = 96;
  const HUE_H = 12;
  const currentNorm = ('#' + draft).toLowerCase();

  return (
    <div
      ref={barRef}
      data-color-picker
      data-color-picker-bar
      className="absolute z-30"
      style={{
        top,
        left,
        transform: `translateX(-50%) translateY(${translateY})`,
        background: 'var(--surface-elevated, #ffffff)',
        border: '1px solid var(--border, rgba(13,13,13,0.12))',
        borderRadius: 12,
        boxShadow: 'var(--shadow-md, 0 6px 18px rgba(0,0,0,0.10))',
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minWidth: SV_W + 20,
      }}
    >
      {/* Brand swatches row — clicking commits immediately. */}
      {swatches.length > 0 ? (
        <div
          data-color-picker-swatches
          style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}
        >
          {swatches.map((sw) => {
            const isCurrent = sw.hex.toLowerCase() === currentNorm;
            return (
              <button
                key={sw.hex}
                type="button"
                title={`${sw.label} — ${sw.hex}`}
                data-color-swatch={sw.label.toLowerCase()}
                onClick={() => onPick(sw.hex)}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  background: sw.hex,
                  cursor: 'pointer',
                  border: isCurrent
                    ? '2px solid var(--accent, #6366f1)'
                    : '1px solid var(--border-strong, rgba(13,13,13,0.18))',
                  padding: 0,
                }}
              />
            );
          })}
        </div>
      ) : null}

      {/* Saturation × Value square — for the current hue. Click /
          drag picks a colour. The marker ring shows the current
          (s, v) coordinate. */}
      <div
        ref={svRef}
        data-color-picker-sv
        onPointerDown={handleSvPointer}
        style={{
          position: 'relative',
          width: SV_W,
          height: SV_H,
          borderRadius: 6,
          cursor: 'crosshair',
          touchAction: 'none',
          background: `
            linear-gradient(to top, #000, transparent),
            linear-gradient(to right, #fff, hsl(${h}, 100%, 50%))
          `,
          border: '1px solid var(--border, rgba(13,13,13,0.12))',
        }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: `${s * 100}%`,
            top: `${(1 - v) * 100}%`,
            width: 12,
            height: 12,
            borderRadius: '50%',
            border: '2px solid #fff',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Hue strip. */}
      <div
        ref={hueRef}
        data-color-picker-hue
        onPointerDown={handleHuePointer}
        style={{
          position: 'relative',
          width: SV_W,
          height: HUE_H,
          borderRadius: HUE_H / 2,
          cursor: 'pointer',
          touchAction: 'none',
          background:
            'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
          border: '1px solid var(--border, rgba(13,13,13,0.12))',
        }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: `${(h / 360) * 100}%`,
            top: '50%',
            width: HUE_H + 2,
            height: HUE_H + 2,
            borderRadius: '50%',
            background: `hsl(${h}, 100%, 50%)`,
            border: '2px solid #fff',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Hex input — accepts 3- or 6-digit, with or without '#'. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span
          aria-hidden
          style={{ fontSize: 11, color: 'var(--text-muted, #888685)' }}
        >
          #
        </span>
        <input
          type="text"
          data-color-hex
          value={draft}
          maxLength={7}
          spellCheck={false}
          placeholder="000000"
          onChange={(e) => {
            const next = e.target.value.replace(/[^0-9a-fA-F]/g, '');
            setDraft(next);
            const norm = normalizeHex(next);
            if (norm) onPick(norm);
          }}
          style={{
            flex: 1,
            minWidth: 80,
            fontSize: 11,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
            padding: '4px 6px',
            borderRadius: 6,
            background: 'var(--surface, #ffffff)',
            border: '1px solid var(--border, rgba(13,13,13,0.12))',
            outline: 'none',
            color: 'var(--text-primary, #0d0d0d)',
          }}
        />
      </div>
    </div>
  );
}

function SourcePill({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      data-control="src"
      className="rounded-lg px-2 py-1 font-mono text-[10px] outline-none"
      style={{
        background: 'var(--surface-sunken)',
        border: '1px solid transparent',
        color: 'var(--text-primary)',
        width: 200,
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
      onBlur={(e) => (e.currentTarget.style.borderColor = 'transparent')}
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

function isSlot(v: ResolvedValue | null | undefined): boolean {
  return !!v && typeof v !== 'string' && typeof v !== 'number';
}

function slotShortLabel(slot: SlotRef): string {
  switch (slot.type) {
    case 'brand.color.primary':
      return 'Brand primary';
    case 'brand.color.secondary':
      return 'Brand secondary';
    case 'brand.color.accent':
      return 'Brand accent';
    case 'brand.color.neutral':
      return `Brand neutral${slot.neutralIndex !== undefined ? ` ${slot.neutralIndex}` : ''}`;
    case 'brand.font.heading':
      return 'Brand heading';
    case 'brand.font.body':
      return 'Brand body';
    default:
      return slot.type;
  }
}

function slotPlaceholderHex(slot: SlotRef): string {
  // Same deterministic hash as Phase 1 — keeps swatch chips stable.
  const seed = slot.type + (slot.neutralIndex ?? '');
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 35%, 55%)`;
}

function truncateFamily(fam: string): string {
  // "system-ui, -apple-system, ..." → "system-ui"
  return fam.split(',')[0].replace(/^"|"$/g, '');
}
