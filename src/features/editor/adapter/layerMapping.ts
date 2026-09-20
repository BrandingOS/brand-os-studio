// Layer ↔ Fabric object mapping.
//
// Convert a `Layer` (BrandOSDocument schema) into a Fabric object, and
// read mutated geometry back off a Fabric object onto a layer patch.
// Every Fabric object stores its layer id on a `brandosId` custom
// property so canvas events can map back to the document.
//
// Phase 1 scope:
//   • Text  → Textbox (width-based wrapping, RTL support)
//   • Shape → Rect, Ellipse, Line, Polygon
//   • Image → FabricImage (URL form only; assetId is Phase 3)
//   • Svg   → placeholder (full SVG parsing in Phase 2)
//   • Logo  → placeholder (brand resolution + pickLogoOnBackground in Phase 3)
//   • Group → Group of mapped children
//
// SlotRef values resolve to a placeholder color/family in Phase 1 — the
// real resolution lives in Phase 3 (`applyBrand.ts`). The adapter does
// NOT mutate slot refs into literals; it just renders something
// readable for now and trusts Phase 3 to flow real values through.

import {
  Canvas,
  Ellipse,
  FabricImage,
  Group,
  Line,
  Polygon,
  Rect,
  Shadow,
  Textbox,
  type FabricObject,
} from 'fabric';

import type {
  BrandOSDocument,
  GroupLayer,
  ImageLayer,
  Layer,
  LogoLayer,
  Page,
  ResolvedValue,
  ShapeLayer,
  SvgLayer,
  TextLayer,
  Transform,
} from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';
import { resolveBrandLogo } from '@/shared/hooks/useBrandLogo';
import type { LogoRole } from '@/shared/types/brandAssets';

/** Property name on every Fabric object pointing back to the document layer. */
export const BRANDOS_ID_KEY = 'brandosId' as const;

// Fabric's types reject arbitrary props; the cast below is justified by
// the runtime contract that every adapter-created Fabric object carries
// a `brandosId`.
type Tagged<T> = T & { [BRANDOS_ID_KEY]?: string };

/** Read the document layer id off a Fabric object, or null if untagged. */
export function getLayerId(obj: FabricObject): string | null {
  return (obj as Tagged<FabricObject>).brandosId ?? null;
}

/** Stamp a Fabric object with the document layer id. */
export function setLayerId(obj: FabricObject, id: string): void {
  (obj as Tagged<FabricObject>).brandosId = id;
}

// ─── Slot resolution placeholder ─────────────────────────────────────────

/**
 * Phase 1 slot stub: literals pass through; SlotRefs return a sensible
 * default. Phase 3 replaces this with real brand-engine resolution.
 */
function resolveResolvedValue(value: ResolvedValue, fallback: string): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  // SlotRef — Phase 3 resolves these. For now, pick a visible placeholder
  // so the editor renders something rather than going invisible.
  if (value.type.startsWith('brand.color')) return fallback;
  if (value.type === 'brand.font.heading' || value.type === 'brand.font.body') {
    return 'system-ui, -apple-system, Segoe UI, sans-serif';
  }
  return fallback;
}

const DEFAULT_FILL = '#cccccc';
const DEFAULT_TEXT_COLOR = '#111111';
const DEFAULT_FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';

// ─── Selection styling ──────────────────────────────────────────────────
// Fabric's defaults are a heavy royal blue with semi-transparent fills that
// can read like an overlay over text. We override with a softer brand-ish
// purple, outline-only (no fill), and white-stroked filled corner handles
// for clean Figma-like selection. Applied per-object via `baseProps` and
// canvas-wide in FabricAdapter.mount via `selectionColor`.
export const SELECTION_BORDER_COLOR = '#7c3aed';
export const SELECTION_HANDLE_COLOR = '#7c3aed';
export const SELECTION_HANDLE_STROKE = '#ffffff';
export const SELECTION_MARQUEE_FILL = 'rgba(124, 58, 237, 0.08)';

// ─── Layer → Fabric ──────────────────────────────────────────────────────

const baseProps = (layer: Layer) => {
  // Logo layers are exempt from `brandLocked` movement/scaling locks.
  // Locking them froze the canvas position when the user just wanted
  // to keep the variant in sync with the brand kit. Logos always move
  // / resize freely; only an explicit `locked: true` (the manual lock
  // affordance) restricts them.
  const isLogo = layer.kind === 'logo';
  const frozenByBrand = !isLogo && layer.brandLocked;
  return {
    left: layer.transform.x,
    top: layer.transform.y,
    angle: layer.transform.rotation,
    scaleX: layer.transform.scaleX,
    scaleY: layer.transform.scaleY,
    opacity: layer.opacity,
    visible: layer.visible,
    selectable: !layer.locked,
    evented: !layer.locked,
    lockMovementX: layer.locked || frozenByBrand,
    lockMovementY: layer.locked || frozenByBrand,
    lockScalingX: layer.locked || frozenByBrand,
    lockScalingY: layer.locked || frozenByBrand,
    lockRotation: layer.locked || frozenByBrand,
  // Outline-only selection styling (overrides Fabric's blue overlay defaults).
  borderColor: SELECTION_BORDER_COLOR,
  cornerColor: SELECTION_HANDLE_COLOR,
  cornerStrokeColor: SELECTION_HANDLE_STROKE,
  cornerStyle: 'circle' as const,
  transparentCorners: false,
  cornerSize: 12,
  padding: 0,
  borderScaleFactor: 1.5,
  };
};

function textLayerToFabric(layer: TextLayer): Textbox {
  const tb = new Textbox(layer.text, {
    ...baseProps(layer),
    width: layer.transform.width,
    fontFamily: resolveResolvedValue(layer.fontFamily, DEFAULT_FONT),
    fontSize: layer.fontSize,
    fontWeight: layer.fontWeight,
    // `?? 'normal'` is load-bearing: Fabric lower-cases this to build
    // its font-measurement cache key, so `undefined` throws inside the
    // Textbox constructor. Documents written before the field existed,
    // and layers built in code without going through zod, both arrive
    // without it.
    fontStyle: layer.fontStyle ?? 'normal',
    lineHeight: layer.lineHeight,
    // Fabric's charSpacing is in 1/1000 em — convert from our em-based letterSpacing.
    charSpacing: layer.letterSpacing * 1000,
    textAlign: layer.textAlign,
    fill: resolveResolvedValue(layer.color, DEFAULT_TEXT_COLOR),
    direction: layer.direction === 'rtl' ? 'rtl' : 'ltr',
  });
  setLayerId(tb, layer.id);
  return tb;
}

function shapeLayerToFabric(layer: ShapeLayer): FabricObject {
  const common = {
    ...baseProps(layer),
    width: layer.transform.width,
    height: layer.transform.height,
    fill: layer.fill ? resolveResolvedValue(layer.fill, DEFAULT_FILL) : null,
    stroke: layer.stroke ? resolveResolvedValue(layer.stroke, '#000000') : null,
    strokeWidth: layer.strokeWidth,
  };

  let obj: FabricObject;
  switch (layer.shape) {
    case 'rectangle':
      obj = new Rect({ ...common, rx: layer.cornerRadius, ry: layer.cornerRadius });
      break;
    case 'ellipse':
      obj = new Ellipse({
        ...common,
        rx: layer.transform.width / 2,
        ry: layer.transform.height / 2,
      });
      break;
    case 'line':
      obj = new Line(
        [
          0,
          0,
          layer.transform.width,
          layer.transform.height,
        ],
        { ...common, left: layer.transform.x, top: layer.transform.y },
      );
      break;
    case 'polygon':
      // Phase 1 stub: an isoceles triangle. Phase 2 adds editable points.
      obj = new Polygon(
        [
          { x: 0, y: 0 },
          { x: layer.transform.width, y: 0 },
          { x: layer.transform.width / 2, y: layer.transform.height },
        ],
        { ...common },
      );
      break;
  }
  setLayerId(obj, layer.id);
  return obj;
}

async function imageLayerToFabric(layer: ImageLayer): Promise<FabricObject> {
  // assetId form is Phase 3 — render a placeholder for now so the doc still loads.
  const url = typeof layer.src === 'string' ? layer.src : null;
  if (!url) return placeholderRect(layer, '#f3f4f6', '#9ca3af');

  try {
    const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
    img.set({ ...baseProps(layer), ...imageFitProps(layer, img) });
    setLayerId(img, layer.id);
    return img;
  } catch {
    // Network or CORS failure — render placeholder rather than crashing the load.
    return placeholderRect(layer, '#fef2f2', '#dc2626');
  }
}

/**
 * Honour `ImageLayer.fit`.
 *
 * The schema has offered `cover | contain | fill` since day one and the
 * toolbar has always exposed the control, but the renderer stretched
 * unconditionally — so picking a fit was a visual no-op and every photo
 * came out distorted.
 *
 *   fill    — stretch to the box (the old behaviour, now opt-in)
 *   contain — whole image, scaled down to sit inside the box
 *   cover   — fill the box, the overflow CROPPED away
 *
 * `cover` uses Fabric's `cropX`/`cropY` rather than a clipPath, and the
 * difference matters: with a clip the object's bounding box is still the
 * whole image, so the selection handles surround empty space and a drag
 * grabs pixels that are not on screen. Cropping narrows the source
 * region instead, so the box the user sees is the box they manipulate —
 * and it round-trips, because `fabricToTransform` then records the
 * cropped dimensions and the same maths reproduces them on reload.
 */
/**
 * The image's own pixel dimensions.
 *
 * `img.width` is NOT reliable here: a `cover` fit narrows it to the
 * cropped source region, so re-fitting an already-cropped image would
 * measure the crop rather than the picture. Fabric 6 exposes no typed
 * accessor for the backing element, hence the narrow cast — and the
 * fallbacks matter, because a test double has no element at all.
 */
function naturalSize(
  img: FabricImage,
  fallbackW: number,
  fallbackH: number,
): { width: number; height: number } {
  const el = (
    img as unknown as {
      _element?: { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number };
    }
  )._element;
  return {
    width: el?.naturalWidth || el?.width || img.width || fallbackW,
    height: el?.naturalHeight || el?.height || img.height || fallbackH,
  };
}

function imageFitProps(
  layer: ImageLayer,
  img: FabricImage,
): Record<string, unknown> {
  // The layer's box in display units. `scaleX/scaleY` are 1 on freshly
  // authored layers and carry the user's resize afterwards.
  const boxW = layer.transform.width * (layer.transform.scaleX || 1);
  const boxH = layer.transform.height * (layer.transform.scaleY || 1);
  const { width: natW, height: natH } = naturalSize(img, boxW, boxH);
  if (!boxW || !boxH || !natW || !natH) return {};

  if (layer.fit === 'fill') {
    return {
      cropX: 0,
      cropY: 0,
      width: natW,
      height: natH,
      scaleX: boxW / natW,
      scaleY: boxH / natH,
    };
  }

  if (layer.fit === 'contain') {
    const ratio = Math.min(boxW / natW, boxH / natH);
    return {
      cropX: 0,
      cropY: 0,
      width: natW,
      height: natH,
      scaleX: ratio,
      scaleY: ratio,
    };
  }

  // cover
  const ratio = Math.max(boxW / natW, boxH / natH);
  const srcW = Math.min(natW, boxW / ratio);
  const srcH = Math.min(natH, boxH / ratio);
  return {
    cropX: (natW - srcW) / 2,
    cropY: (natH - srcH) / 2,
    width: srcW,
    height: srcH,
    scaleX: ratio,
    scaleY: ratio,
  };
}

function svgLayerToFabric(layer: SvgLayer): FabricObject {
  // Phase 1 placeholder. Phase 2 adds proper SVG parsing via loadSVGFromString.
  return placeholderRect(layer, 'rgba(99,102,241,0.06)', '#6366f1');
}

/**
 * Map a logo `variant` to the brand-asset role we resolve through
 * `resolveBrandLogo`. `'auto'` previews `'primary'` for now — the real
 * `pickLogoOnBackground(brand, bgHex)` selection is layered on top of
 * this in a follow-up; the placeholder behavior is "show primary so
 * the user always sees something."
 */
function variantToRole(variant: LogoLayer['variant']): LogoRole {
  switch (variant) {
    case 'primary': return 'primary';
    case 'secondary': return 'secondary';
    case 'wordmark': return 'wordmark';
    case 'iconmark': return 'iconmark';
    case 'mono.black': return 'mono.black';
    case 'mono.white': return 'mono.white';
    case 'auto':
    default: return 'primary';
  }
}

async function logoLayerToFabric(
  layer: LogoLayer,
  brand?: Brand,
): Promise<FabricObject> {
  const resolved = brand
    ? resolveBrandLogo(brand, variantToRole(layer.variant))
    : undefined;

  if (!resolved?.url) {
    // No brand context yet, or this brand has no asset for this role —
    // render a light placeholder so the layer still has a visible
    // bounding box to select / move. The Editor calls `setBrand` on
    // the adapter once brand context is available, which re-creates
    // the logo objects via the variant-change recreate path.
    return placeholderRect(layer, 'rgba(0,0,0,0.04)', '#9ca3af');
  }

  try {
    const img = await FabricImage.fromURL(resolved.url, {
      crossOrigin: 'anonymous',
    });
    img.set({
      ...baseProps(layer),
      // Fit "contain": preserve aspect ratio inside the layer's box.
      // Logos look broken when stretched, unlike Image layers which
      // can legitimately be cropped/stretched per `fit`.
      scaleX: img.width
        ? Math.min(
            layer.transform.width / img.width,
            layer.transform.height / (img.height || 1),
          )
        : 1,
      scaleY: img.height
        ? Math.min(
            layer.transform.width / (img.width || 1),
            layer.transform.height / img.height,
          )
        : 1,
    });
    setLayerId(img, layer.id);
    return img;
  } catch {
    // Network / CORS failure — fall back to placeholder so the layer
    // is still visible and selectable.
    return placeholderRect(layer, 'rgba(220,38,38,0.06)', '#dc2626');
  }
}

async function groupLayerToFabric(
  layer: GroupLayer,
  brand?: Brand,
): Promise<Group> {
  const children = await Promise.all(
    layer.children.map((c) => layerToFabric(c, brand)),
  );
  const grp = new Group(children, { ...baseProps(layer) });
  setLayerId(grp, layer.id);
  return grp;
}

/**
 * The page sheet — viewport mode only. A non-interactive rect at the
 * document origin that gives the page a visible edge and a drop shadow
 * against the workspace, the job `canvas.backgroundColor` does when the
 * canvas is page-sized.
 *
 * It is `excludeFromExport` because `exportAs` restores page-sized,
 * page-coloured canvas geometry before rasterizing — the sheet would
 * otherwise paint its shadow into the exported artwork.
 */
export function pageSheet(width: number, height: number, fill: string): Rect {
  const rect = new Rect({
    left: 0,
    top: 0,
    width,
    height,
    fill,
    selectable: false,
    evented: false,
    excludeFromExport: true,
    hoverCursor: 'default',
    shadow: new Shadow({
      color: 'rgba(0,0,0,0.13)',
      blur: 18,
      offsetX: 0,
      offsetY: 3,
    }),
  });
  (rect as FabricObject & { isPageSheet?: boolean }).isPageSheet = true;
  return rect;
}

/**
 * The sheet added by `pageSheet`, if this canvas is in viewport mode.
 *
 * `excludeFromExport` covers `toObject`/`toSVG` but NOT `toDataURL`,
 * which is what raster export uses — so the export path has to hide
 * this object by hand, and needs to be able to find it.
 */
export function findPageSheet(canvas: Canvas): FabricObject | null {
  return (
    canvas
      .getObjects()
      .find((o) => (o as FabricObject & { isPageSheet?: boolean }).isPageSheet) ?? null
  );
}

function placeholderRect(layer: Layer, fill: string, stroke: string): Rect {
  const r = new Rect({
    ...baseProps(layer),
    width: layer.transform.width,
    height: layer.transform.height,
    fill,
    stroke,
    strokeWidth: 1,
    strokeDashArray: [4, 4],
  });
  setLayerId(r, layer.id);
  return r;
}

/**
 * Reconcile every relevant prop from a layer onto its existing Fabric
 * object. Use this after `updateLayer` mutates the document mirror so
 * the canvas reflects ALL changed fields, not just transform.
 *
 * Returns `needsRecreate: true` when the change requires the Fabric
 * object to be rebuilt (image/svg src change, kind change). The
 * adapter handles the recreate; we don't try to mutate the source URL
 * in place because Fabric's image/svg pipelines are construction-time.
 *
 * Selection styling lives in `baseProps` and is re-applied here on
 * every reconcile so toggles like `locked` correctly flip
 * `selectable`/`evented`.
 */
export function applyLayerToFabric(
  obj: FabricObject,
  prevLayer: Layer | null,
  nextLayer: Layer,
): { needsRecreate: boolean } {
  // Kind change → always recreate.
  if (prevLayer && prevLayer.kind !== nextLayer.kind) {
    return { needsRecreate: true };
  }

  // Logo layers are exempt from `brandLocked` movement/scaling locks
  // (mirrors the rule in `baseProps`).
  const isLogo = nextLayer.kind === 'logo';
  const frozenByBrand = !isLogo && nextLayer.brandLocked;

  // Common: transform, opacity, visibility, lock + selection styling.
  //
  // `width`/`height` are deliberately withheld from IMAGE layers. On a
  // FabricImage those two are the SOURCE REGION — the window into the
  // bitmap — not the box on the page, so writing the layer's box into
  // them silently re-crops the picture on every unrelated property
  // update. An image's geometry is owned by `imageFitProps` below,
  // which is the one place that knows the difference.
  const isImage = nextLayer.kind === 'image';
  obj.set({
    left: nextLayer.transform.x,
    top: nextLayer.transform.y,
    ...(isImage
      ? null
      : { width: nextLayer.transform.width, height: nextLayer.transform.height }),
    angle: nextLayer.transform.rotation,
    scaleX: nextLayer.transform.scaleX,
    scaleY: nextLayer.transform.scaleY,
    opacity: nextLayer.opacity,
    visible: nextLayer.visible,
    selectable: !nextLayer.locked,
    evented: !nextLayer.locked,
    lockMovementX: nextLayer.locked || frozenByBrand,
    lockMovementY: nextLayer.locked || frozenByBrand,
    lockScalingX: nextLayer.locked || frozenByBrand,
    lockScalingY: nextLayer.locked || frozenByBrand,
    lockRotation: nextLayer.locked || frozenByBrand,
    borderColor: SELECTION_BORDER_COLOR,
    cornerColor: SELECTION_HANDLE_COLOR,
    cornerStrokeColor: SELECTION_HANDLE_STROKE,
  });

  switch (nextLayer.kind) {
    case 'text': {
      if (!(obj instanceof Textbox)) return { needsRecreate: true };
      obj.set({
        text: nextLayer.text,
        fontFamily: resolveResolvedValue(nextLayer.fontFamily, DEFAULT_FONT),
        fontSize: nextLayer.fontSize,
        fontWeight: nextLayer.fontWeight,
        fontStyle: nextLayer.fontStyle ?? 'normal',
        lineHeight: nextLayer.lineHeight,
        // Fabric's charSpacing is 1/1000 em — convert from our em-based letterSpacing.
        charSpacing: nextLayer.letterSpacing * 1000,
        textAlign: nextLayer.textAlign,
        fill: resolveResolvedValue(nextLayer.color, DEFAULT_TEXT_COLOR),
        direction: nextLayer.direction === 'rtl' ? 'rtl' : 'ltr',
      });
      // Textbox-specific: editing-mode colors should match selection.
      const tb = obj as Textbox & {
        editingBorderColor?: string;
        cursorColor?: string;
      };
      tb.editingBorderColor = SELECTION_BORDER_COLOR;
      tb.cursorColor = SELECTION_BORDER_COLOR;
      return { needsRecreate: false };
    }
    case 'shape': {
      const fill = nextLayer.fill ? resolveResolvedValue(nextLayer.fill, DEFAULT_FILL) : null;
      const stroke = nextLayer.stroke
        ? resolveResolvedValue(nextLayer.stroke, '#000000')
        : null;
      obj.set({ fill, stroke, strokeWidth: nextLayer.strokeWidth });
      if (nextLayer.shape === 'rectangle' && obj instanceof Rect) {
        obj.set({ rx: nextLayer.cornerRadius, ry: nextLayer.cornerRadius });
      }
      return { needsRecreate: false };
    }
    case 'image': {
      // Image src is construction-time; if it changed, recreate.
      if (
        prevLayer &&
        prevLayer.kind === 'image' &&
        srcKey(prevLayer.src) !== srcKey(nextLayer.src)
      ) {
        return { needsRecreate: true };
      }
      // Re-fit in place when either the fit MODE or the layer's box
      // changed. Recreating would re-fetch the image just to change how
      // it is cropped, and the box changes whenever an AI reflow or a
      // dimension edit moves the layer.
      const boxChanged =
        !prevLayer ||
        prevLayer.transform.width * (prevLayer.transform.scaleX || 1) !==
          nextLayer.transform.width * (nextLayer.transform.scaleX || 1) ||
        prevLayer.transform.height * (prevLayer.transform.scaleY || 1) !==
          nextLayer.transform.height * (nextLayer.transform.scaleY || 1);
      const fitChanged =
        !!prevLayer && prevLayer.kind === 'image' && prevLayer.fit !== nextLayer.fit;
      if ((fitChanged || boxChanged) && obj instanceof FabricImage) {
        obj.set(imageFitProps(nextLayer, obj));
        obj.setCoords();
      }
      return { needsRecreate: false };
    }
    case 'svg': {
      if (
        prevLayer &&
        prevLayer.kind === 'svg' &&
        srcKey(prevLayer.src) !== srcKey(nextLayer.src)
      ) {
        return { needsRecreate: true };
      }
      return { needsRecreate: false };
    }
    case 'logo': {
      // Variant change resolves through `resolveBrandLogo` to a different
      // brand asset URL — the existing FabricImage was constructed from
      // the old URL, so we recreate the object via the variant-change
      // branch in FabricAdapter.updateLayer.
      if (
        prevLayer &&
        prevLayer.kind === 'logo' &&
        prevLayer.variant !== nextLayer.variant
      ) {
        return { needsRecreate: true };
      }
      return { needsRecreate: false };
    }
    case 'group':
      return { needsRecreate: false };
  }
}

function srcKey(src: unknown): string {
  if (typeof src === 'string') return `url:${src}`;
  if (src && typeof src === 'object' && 'assetId' in src) {
    return `asset:${(src as { assetId: string }).assetId}`;
  }
  return '';
}

/** Convert a layer to its Fabric representation. */
export async function layerToFabric(
  layer: Layer,
  brand?: Brand,
): Promise<FabricObject> {
  switch (layer.kind) {
    case 'text':
      return textLayerToFabric(layer);
    case 'shape':
      return shapeLayerToFabric(layer);
    case 'image':
      return imageLayerToFabric(layer);
    case 'svg':
      return svgLayerToFabric(layer);
    case 'logo':
      return logoLayerToFabric(layer, brand);
    case 'group':
      return groupLayerToFabric(layer, brand);
  }
}

// ─── Fabric → layer patch ────────────────────────────────────────────────

/**
 * Read a Fabric object's current geometry into a partial Layer suitable
 * for merging into the mirror document. Caller does not need to supply
 * `kind` — geometry only.
 */
export function fabricToTransform(obj: FabricObject): Transform {
  return {
    x: obj.left ?? 0,
    y: obj.top ?? 0,
    width: obj.width ?? 0,
    height: obj.height ?? 0,
    rotation: obj.angle ?? 0,
    scaleX: obj.scaleX ?? 1,
    scaleY: obj.scaleY ?? 1,
  };
}

export function applyTextEdits(textbox: Textbox): Pick<TextLayer, 'text'> {
  return { text: textbox.text ?? '' };
}

// ─── Page rendering ──────────────────────────────────────────────────────

/**
 * Wipe the canvas and render the active page. When the page references
 * a master and the editor is NOT in "Edit Master" mode, the master's
 * layers render first as a non-selectable, non-evented overlay at z=0;
 * the page's own layers stack on top.
 *
 * Returns a map of layerId → FabricObject for the page's OWN layers
 * only — master layers are read-only at this view and aren't tracked
 * here. The adapter routes events through this map; an event for a
 * master layer simply produces no `brandosId` match.
 */
export async function renderPage(
  canvas: Canvas,
  page: Page,
  doc: BrandOSDocument,
  options: {
    editingMaster: boolean;
    brand?: Brand;
    /**
     * Optional cancellation hook. Called after every async load so
     * the caller can short-circuit a concurrent stale render. When
     * it returns true the function leaves the canvas untouched and
     * returns an empty map. Without this, two concurrent renderPage
     * calls would both clear+add and produce duplicate objects.
     */
    isCancelled?: () => boolean;
    /**
     * Viewport mode. When supplied, the canvas is sized to the VISIBLE
     * REGION rather than to the page, and the page is drawn as a sheet
     * object inside it. That is what lets `canvas.viewportTransform`
     * own zoom and pan — Fabric then draws selection handles at a
     * constant screen size at any zoom, re-rasterizes text crisply
     * when you zoom in, and makes content outside the page reachable.
     *
     * Omitted (every pre-Studio call site) the canvas is sized to the
     * page exactly as before, so this field is purely additive.
     */
    viewport?: { width: number; height: number };
  } = { editingMaster: false },
): Promise<Map<string, FabricObject>> {
  // Phase 1: pre-load every Fabric object asynchronously. We don't
  // touch the canvas yet — that way a concurrent `renderPage` can't
  // observe an intermediate state where we've cleared the canvas
  // but haven't finished adding our new objects.
  const masterObjs: FabricObject[] = [];
  if (!options.editingMaster && page.masterPageId) {
    const master = doc.masterPages.find((m) => m.id === page.masterPageId);
    if (master) {
      for (const layer of master.layers) {
        const obj = await layerToFabric(layer, options.brand);
        if (options.isCancelled?.()) return new Map();
        // Master layers are decorative-from-this-view: locked from
        // any canvas-level interaction so the user has to enter
        // master mode to edit them.
        obj.set({
          selectable: false,
          evented: false,
          lockMovementX: true,
          lockMovementY: true,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true,
          hoverCursor: 'default',
        });
        masterObjs.push(obj);
      }
    }
  }

  const pageEntries: Array<{ layerId: string; obj: FabricObject }> = [];
  for (const layer of page.layers) {
    const obj = await layerToFabric(layer, options.brand);
    if (options.isCancelled?.()) return new Map();
    pageEntries.push({ layerId: layer.id, obj });
  }

  // Phase 2: now that all loads are done, apply atomically.
  if (options.isCancelled?.()) return new Map();
  canvas.clear();
  const bg = typeof page.background === 'string' ? page.background : DEFAULT_FILL;
  const pageFill = resolveResolvedValue(page.background, bg);
  if (options.viewport) {
    // Viewport mode — the canvas IS the workspace. The page becomes a
    // sheet drawn at document origin; `viewportTransform` positions it.
    canvas.setDimensions({
      width: options.viewport.width,
      height: options.viewport.height,
    });
    canvas.backgroundColor = 'transparent';
    canvas.add(pageSheet(page.width, page.height, pageFill));
    // Clip every object to the page. A design is a sheet, not an
    // infinite plane — content dragged past the edge must read as
    // "off the page", the way it will print and export. Controls live
    // on the upper canvas and are deliberately NOT clipped, so a
    // half-off object can still be grabbed and pulled back.
    canvas.clipPath = new Rect({
      left: 0,
      top: 0,
      width: page.width,
      height: page.height,
      absolutePositioned: true,
    });
  } else {
    canvas.setDimensions({ width: page.width, height: page.height });
    canvas.backgroundColor = pageFill;
    canvas.clipPath = undefined;
  }
  for (const obj of masterObjs) canvas.add(obj);

  const objsById = new Map<string, FabricObject>();
  for (const { layerId, obj } of pageEntries) {
    canvas.add(obj);
    objsById.set(layerId, obj);
  }
  canvas.requestRenderAll();
  return objsById;
}

/**
 * Walk a document and find a layer by id (recursive into groups).
 */
export function findLayer(doc: BrandOSDocument, layerId: string): { page: Page; layer: Layer } | null {
  for (const page of doc.pages) {
    const found = findLayerInPage(page, layerId);
    if (found) return { page, layer: found };
  }
  return null;
}

function findLayerInPage(page: Page, layerId: string): Layer | null {
  for (const layer of page.layers) {
    const found = findLayerInTree(layer, layerId);
    if (found) return found;
  }
  return null;
}

function findLayerInTree(layer: Layer, layerId: string): Layer | null {
  if (layer.id === layerId) return layer;
  if (layer.kind === 'group') {
    for (const child of layer.children) {
      const found = findLayerInTree(child, layerId);
      if (found) return found;
    }
  }
  return null;
}
