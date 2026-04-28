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

import { useMemo, useState, type ReactNode } from 'react';
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

const SELECTION_BLUE = '#2965f6';

export type ToolbarScope = 'page' | 'all';

interface Props {
  adapter: EditorAdapter;
  pageId: string;
  layer: Layer;
  scope: ToolbarScope;
  onScopeChange: (s: ToolbarScope) => void;
}

export function EditorFloatingToolbar({
  adapter,
  pageId,
  layer,
  scope,
  onScopeChange,
}: Props) {
  // Position computed from the layer's document-space transform.
  // Centered above the layer, clamped to a minimum 8px from the top
  // of the canvas wrap.
  const left = layer.transform.x + layer.transform.width / 2;
  const top = Math.max(8, layer.transform.y - 50);

  const update = (patch: Partial<Layer>) =>
    adapter.updateLayer(pageId, layer.id, patch);

  return (
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
          scope === 'all'
            ? `2px solid color-mix(in srgb, ${SELECTION_BLUE} 45%, transparent)`
            : 'none',
        outlineOffset: 2,
      }}
    >
      <ScopeToggle scope={scope} onChange={onScopeChange} />
      <Sep />

      <KindControls layer={layer} update={update} />

      <Sep />
      <MoreMenu layer={layer} update={update} />
    </div>
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

function KindControls({
  layer,
  update,
}: {
  layer: Layer;
  update: (patch: Partial<Layer>) => void;
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
        />
      );
    case 'shape':
      return (
        <ShapeControls
          layer={layer as unknown as ShapeLayer}
          update={update as unknown as (p: Partial<ShapeLayer>) => void}
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
}: {
  layer: TextLayer;
  update: (patch: Partial<TextLayer>) => void;
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

      {/* Size — not brand-bound, always editable */}
      <NumberPill
        value={Math.round(layer.fontSize)}
        min={6}
        max={400}
        onChange={(v) => update({ fontSize: v })}
        title="Font size"
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
}: {
  layer: ShapeLayer;
  update: (patch: Partial<ShapeLayer>) => void;
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
        />
      </LockedGate>
      <LockedGate locked={strokeLocked}>
        <ColorChip
          value={layer.stroke ?? '#000000'}
          slotBound={isSlot(layer.stroke)}
          onChange={(v) => update({ stroke: v })}
          title="Stroke"
          outline
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

function LogoControls({
  layer,
  update,
}: {
  layer: LogoLayer;
  update: (patch: Partial<LogoLayer>) => void;
}) {
  const opts: Array<{ label: string; value: LogoLayer['variant'] }> = [
    { label: 'Auto', value: 'auto' },
    { label: 'Primary', value: 'primary' },
    { label: 'Secondary', value: 'secondary' },
    { label: 'Wordmark', value: 'wordmark' },
    { label: 'Iconmark', value: 'iconmark' },
    { label: 'Mono · black', value: 'mono.black' },
    { label: 'Mono · white', value: 'mono.white' },
  ];
  const variantLocked = isBrandBound(layer, 'variant');
  return (
    <LockedGate locked={variantLocked}>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition-colors"
          data-control="variant"
          title="Logo variant"
        >
          {layer.variant}
          <ChevronDown className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className="z-50 rounded-lg p-1"
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {opts.map((o) => (
            <DropdownMenu.Item
              key={o.value}
              onSelect={() => update({ variant: o.value })}
              className="cursor-pointer rounded-md px-2 py-1 text-[12px] outline-none"
              style={{ color: 'var(--text-primary)' }}
            >
              {o.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
    </LockedGate>
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
          <DropdownMenu.Separator
            className="my-1 h-px"
            style={{ background: 'var(--border)' }}
          />
          <BrandManagedRow layer={layer} update={update} />
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
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  title: string;
}) {
  return (
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
        width: 48,
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
  outline,
}: {
  value: ResolvedValue | null;
  slotBound: boolean;
  onChange: (v: ResolvedValue) => void;
  title: string;
  outline?: boolean;
}) {
  // Slot-bound: chip + dropdown to "override" (swap to literal hex).
  if (slotBound && value && typeof value !== 'string' && typeof value !== 'number') {
    const slot = value as SlotRef;
    const placeholder = slotPlaceholderHex(slot);
    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            title={title}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
            data-control={title.toLowerCase()}
            data-slot-bound
          >
            <span
              className="h-3.5 w-3.5 rounded-full"
              style={{
                background: outline ? 'transparent' : placeholder,
                boxShadow: outline
                  ? `inset 0 0 0 2px ${placeholder}`
                  : '0 0 0 1px var(--border-strong)',
              }}
              aria-hidden
            />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={4}
            className="z-50 min-w-[180px] rounded-lg p-2 text-[11px]"
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <p style={{ color: 'var(--text-secondary)' }}>
              Bound to <strong>{slotShortLabel(slot)}</strong>
            </p>
            <button
              type="button"
              onClick={() => onChange(placeholder)}
              className="mt-2 w-full rounded-md px-2 py-1 text-left text-[12px]"
              style={{
                background: 'var(--surface-sunken)',
                color: 'var(--text-primary)',
              }}
            >
              Override with literal color
            </button>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    );
  }

  // Literal hex — color input.
  const hex =
    typeof value === 'string'
      ? value
      : typeof value === 'number'
      ? '#000000'
      : '#000000';
  return (
    <label
      title={title}
      data-control={title.toLowerCase()}
      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg transition-colors"
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
      <input
        type="color"
        value={hex.length === 7 ? hex : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
      />
    </label>
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
