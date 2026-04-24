/**
 * Mockup Studio — engine types.
 *
 * These types are the contract between the UI/data layers and the PixiJS
 * engine. The engine consumes a `MockupState` and paints it onto a canvas;
 * it does NOT know whether that state came from an anonymous upload, a
 * brand-kit auto-fill, or anything else.
 *
 * Keep this file free of PixiJS imports — it's the public surface of the
 * engine module.
 */

/** Per-template metadata — what the engine needs to composite a mockup. */
export interface TemplateMeta {
  id: string;
  name: string;
  category: 'apparel' | 'print' | 'device' | 'packaging' | 'signage' | 'other';
  canvas: { width: number; height: number };

  /** Asset URLs. When procedurally generated, these are resolved at runtime. */
  assets: {
    /** Opaque base photograph of the product. */
    base: string;
    /** Grayscale displacement map — brighter = more X offset, etc. */
    displacement?: string;
    /** Pre-multiplied lighting layer for the design surface. */
    lighting?: string;
    /** Alpha mask defining where the design appears. */
    mask?: string;
    /** Thumbnail (for the gallery). Defaults to `base` when omitted. */
    thumbnail?: string;
  };

  /** At least one zone per template (the printable surface). */
  zones: TemplateZone[];

  /** Optional tintable product surfaces (e.g. t-shirt color). */
  tintableRegions?: TintableRegion[];

  /** Whether the template's background can be swapped out. */
  backgroundReplaceable?: boolean;

  /** V1 extras — not used by the engine yet, shipped as stubs per spec §2.5. */
  props?: TemplateProp[];
  defaultTextSlots?: DefaultTextSlot[];
}

export interface TemplateZone {
  id: string;
  label: string;
  /** Alpha mask confining the design to this surface. */
  mask?: string;
  /** Displacement map overriding the template default for this zone. */
  displacement?: string;
  /** Lighting overlay for this zone. */
  lighting?: string;
  /** Pixel magnitude of displacement (0 = none). Small values look subtle. */
  displacementScale?: number;
  /** Default transform for a design dropped into this zone. */
  defaultTransform: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  };
  constraints?: {
    minScale?: number;
    maxScale?: number;
    lockAspect?: boolean;
  };
  /** Hints the brand-kit auto-fill layer reads. Engine ignores. */
  brandKitHints?: {
    preferredAsset?: 'logo_primary' | 'logo_iconmark' | 'logo_wordmark' | 'logo_secondary';
    fallbackAssets?: Array<'logo_primary' | 'logo_iconmark' | 'logo_wordmark' | 'logo_secondary'>;
    preferredColorRole?: ColorRole | null;
  };
}

export interface TintableRegion {
  id: string;
  label: string;
  mask: string;
  defaultColor: string;
  swatches?: string[];
  brandKitHints?: {
    preferredColorRole?: ColorRole;
  };
}

export interface TemplateProp {
  id: string;
  label: string;
  mask: string;
  defaultVisible?: boolean;
  tintable?: boolean;
}

export interface DefaultTextSlot {
  id: string;
  label: string;
  x: number;
  y: number;
  fontSize: number;
  align?: 'left' | 'center' | 'right';
  brandKitHints?: {
    preferredField?: 'brand_name' | 'tagline';
    preferredFontRole?: 'heading' | 'body';
  };
}

export type ColorRole =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'neutral_light'
  | 'neutral_dark';

/** The single source of truth for the renderer. */
export interface MockupState {
  templateId: string;
  canvasWidth: number;
  canvasHeight: number;

  background: {
    type: 'template' | 'solid' | 'gradient' | 'image';
    value: string;
  };

  zones: Record<string, ZoneState>;

  tints: Record<string, { color: string; visible: boolean }>;

  props: Record<string, { visible: boolean; tint?: string }>;

  textLayers: TextLayer[];
  elementLayers: ElementLayer[];

  effects: {
    lightingIntensity: number;
    shadowsEnabled: boolean;
  };
}

export interface ZoneState {
  designUrl: string | null;
  transform: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
  tint?: string;
  visible: boolean;
}

export interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: 'left' | 'center' | 'right';
  letterSpacing: number;
  rotation: number;
}

export type ElementLayer =
  | {
      id: string;
      type: 'rect';
      x: number;
      y: number;
      width: number;
      height: number;
      fill: string;
      stroke?: string;
      rotation: number;
    }
  | {
      id: string;
      type: 'circle';
      x: number;
      y: number;
      radius: number;
      fill: string;
      stroke?: string;
    }
  | {
      id: string;
      type: 'line';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stroke: string;
      strokeWidth: number;
    }
  | {
      id: string;
      type: 'image';
      x: number;
      y: number;
      width: number;
      height: number;
      url: string;
      rotation: number;
    };

/** Build an empty `MockupState` from a template's defaults. */
export function createInitialMockupState(template: TemplateMeta): MockupState {
  const zones: Record<string, ZoneState> = {};
  for (const zone of template.zones) {
    zones[zone.id] = {
      designUrl: null,
      transform: {
        x: zone.defaultTransform.x,
        y: zone.defaultTransform.y,
        scale: 1,
        rotation: zone.defaultTransform.rotation,
      },
      visible: true,
    };
  }

  const tints: MockupState['tints'] = {};
  for (const region of template.tintableRegions ?? []) {
    tints[region.id] = { color: region.defaultColor, visible: true };
  }

  const props: MockupState['props'] = {};
  for (const prop of template.props ?? []) {
    props[prop.id] = { visible: prop.defaultVisible !== false };
  }

  return {
    templateId: template.id,
    canvasWidth: template.canvas.width,
    canvasHeight: template.canvas.height,
    background: { type: 'template', value: 'template' },
    zones,
    tints,
    props,
    textLayers: [],
    elementLayers: [],
    effects: { lightingIntensity: 1, shadowsEnabled: true },
  };
}
