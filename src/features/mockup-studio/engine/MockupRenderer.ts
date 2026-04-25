/**
 * Mockup Studio — PixiJS renderer.
 *
 * Consumes a `MockupState` + `TemplateMeta` and paints the composited
 * mockup onto a WebGL canvas. This is the mode-agnostic engine: it does
 * not import from React components, Zustand stores, brand data, or any
 * UI code. It only knows PixiJS and the engine types.
 *
 * Pipeline per render:
 *   1. Background sprite (template base OR user-replaced solid/image).
 *   2. For each tintable region: tint-mask sprite tinted to user color,
 *      multiply-blended over the surface.
 *   3. For each design zone:
 *        a. The user's uploaded design sprite, scaled/positioned per state.
 *        b. Alpha-masked by the zone mask so it only appears on-surface.
 *        c. DisplacementFilter warps the design to the surface curvature.
 *        d. Lighting overlay multiplied on top to preserve highlights.
 *   4. Scene props — per-prop mask visibility + optional tint.
 *   5. Element layers — Graphics (rect/circle/line) + Sprite (image).
 *   6. Text layers — Pixi Text so exports bake typography into pixels.
 *   7. Present.
 */

import {
  Application,
  Assets,
  Container,
  DisplacementFilter,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  Texture,
} from 'pixi.js';

import type {
  ElementLayer,
  MockupState,
  TemplateMeta,
  TemplateZone,
  TextLayer,
} from './types';

interface ZoneObjects {
  /** Container for this zone's design + mask + lighting. */
  container: Container;
  /** The design sprite itself. Null until a design is set. */
  design: Sprite | null;
  /** The alpha mask sprite (assigned as container.mask). */
  mask: Sprite | null;
  /** Optional lighting overlay. */
  lighting: Sprite | null;
  /** Displacement sprite used by the filter. */
  displacement: Sprite | null;
  displacementFilter: DisplacementFilter | null;
  /** Cached design URL so we don't reload identical designs. */
  loadedDesignUrl: string | null;
}

interface TintObjects {
  sprite: Sprite | null;
  loadedColor: string | null;
}

interface PropObjects {
  sprite: Sprite | null;
  loadedTint: string | null;
}

interface ElementObjects {
  node: Graphics | Sprite;
  type: ElementLayer['type'];
  loadedUrl?: string;
}

export class MockupRenderer {
  readonly app: Application;

  private template: TemplateMeta | null = null;
  private state: MockupState | null = null;

  private backgroundSprite: Sprite | null = null;
  private solidBackground: Graphics | null = null;
  private backgroundLayer = new Container();
  private tintLayer = new Container();
  private zoneLayer = new Container();
  private propLayer = new Container();
  private elementLayer = new Container();
  private textLayer = new Container();

  private zoneObjects = new Map<string, ZoneObjects>();
  private tintObjects = new Map<string, TintObjects>();
  private propObjects = new Map<string, PropObjects>();
  private elementObjects = new Map<string, ElementObjects>();
  private textObjects = new Map<string, Text>();

  /** Displacement sprites live on the stage (Pixi requires filter-source
   *  sprites to be in the scene graph), but we set `renderable = false`
   *  so they don't paint. Tracked here for cleanup on template swap. */
  private displacementSprites: Sprite[] = [];

  /** URLs loaded through `Assets.load()` for the current template — cleared
   *  on template swap so the PIXI asset cache doesn't accumulate across
   *  sessions. */
  private loadedAssetUrls = new Set<string>();

  /** True once `init()` has completed. */
  private ready = false;

  /** Tracks whether we've started a destroy so concurrent re-inits are safe. */
  private destroyed = false;

  constructor() {
    this.app = new Application();
  }

  async init(canvas: HTMLCanvasElement, opts: { width: number; height: number }) {
    // Pixi v8 init is async.
    //
    // `autoDensity: true` would force the canvas's CSS width/height to the
    // logical resolution (e.g. 1600px). That overrides our `width:100%;
    // height:100%` rule and makes the canvas overflow its letterbox
    // wrapper. Keep autoDensity off — we size the canvas with CSS and let
    // the GPU render at the full device-pixel-ratio backing store.
    await this.app.init({
      canvas,
      width: opts.width,
      height: opts.height,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: false,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });

    // Guarantee our sizing rules: fill the wrapper, never overflow.
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';

    this.app.stage.addChild(this.backgroundLayer);
    this.app.stage.addChild(this.tintLayer);
    this.app.stage.addChild(this.zoneLayer);
    this.app.stage.addChild(this.propLayer);
    this.app.stage.addChild(this.elementLayer);
    this.app.stage.addChild(this.textLayer);
    this.ready = true;
  }

  resize(width: number, height: number) {
    if (!this.ready) return;
    this.app.renderer.resize(width, height);
  }

  /** Swap the whole template. Disposes per-template textures and rebuilds. */
  async setTemplate(template: TemplateMeta) {
    if (!this.ready) return;
    this.template = template;
    await this.rebuildForTemplate(template);
  }

  /** Update state and repaint. Idempotent — cheap to call on every mutation.
   *  Guarded against `destroy()` landing mid-flight: every async step checks
   *  `this.destroyed` after its await and bails before touching PIXI
   *  objects. */
  async applyState(state: MockupState) {
    if (!this.ready || !this.template || this.destroyed) return;
    this.state = state;
    await this.updateBackground(state);
    if (this.destroyed) return;
    await this.updateTints(state);
    if (this.destroyed) return;
    await this.updateZones(state);
    if (this.destroyed) return;
    await this.updateProps(state);
    if (this.destroyed) return;
    await this.updateElementLayers(state);
    if (this.destroyed) return;
    this.updateTextLayers(state);
    this.updateEffects(state);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    // Unload every texture we ever loaded for the last template so the
    // PIXI Assets cache doesn't grow across sessions.
    for (const url of this.loadedAssetUrls) {
      Assets.unload(url).catch(() => {});
    }
    this.loadedAssetUrls.clear();

    // Explicit filter cleanup — `app.destroy` doesn't walk filters.
    for (const rec of this.zoneObjects.values()) {
      rec.displacementFilter?.destroy();
    }

    this.zoneObjects.clear();
    this.tintObjects.clear();
    this.propObjects.clear();
    this.elementObjects.clear();
    this.textObjects.clear();
    this.displacementSprites = [];
    this.app.destroy(true, { children: true, texture: false });
  }

  // ─── private ────────────────────────────────────────────────────

  private async rebuildForTemplate(template: TemplateMeta) {
    // Dispose filters from the previous template before we orphan them.
    for (const rec of this.zoneObjects.values()) {
      rec.displacementFilter?.destroy();
    }

    // Clear previous zones / tints / bg.
    this.zoneLayer.removeChildren().forEach((c) => c.destroy());
    this.tintLayer.removeChildren().forEach((c) => c.destroy());
    this.backgroundLayer.removeChildren().forEach((c) => c.destroy());
    this.zoneObjects.clear();
    this.tintObjects.clear();
    this.backgroundSprite = null;
    this.solidBackground = null;

    // Detach and destroy any displacement sprites from the previous template.
    for (const sprite of this.displacementSprites) {
      sprite.parent?.removeChild(sprite);
      sprite.destroy();
    }
    this.displacementSprites = [];

    // Unload any textures from the previous template so the PIXI asset
    // cache doesn't grow unbounded across rapid template swaps.
    for (const url of this.loadedAssetUrls) {
      Assets.unload(url).catch(() => {});
    }
    this.loadedAssetUrls.clear();

    // Background base image.
    const baseTex = await this.safeLoadTexture(template.assets.base);
    if (baseTex) {
      this.backgroundSprite = new Sprite(baseTex);
      this.backgroundSprite.width = template.canvas.width;
      this.backgroundSprite.height = template.canvas.height;
      this.backgroundLayer.addChild(this.backgroundSprite);
    }

    // Per-zone scaffolding.
    for (const zone of template.zones) {
      const container = new Container();
      this.zoneLayer.addChild(container);

      const mask = zone.mask ? await this.makeMaskSprite(zone.mask, template) : null;
      if (mask) {
        container.addChild(mask);
        container.mask = mask;
        // Belt-and-braces: a mask should never render as a visible layer.
        mask.renderable = false;
      }

      // Displacement — loaded once per zone.
      let displacement: Sprite | null = null;
      let displacementFilter: DisplacementFilter | null = null;
      if (zone.displacement) {
        const dispTex = await this.safeLoadTexture(zone.displacement);
        if (dispTex) {
          displacement = new Sprite(dispTex);
          displacement.width = template.canvas.width;
          displacement.height = template.canvas.height;
          // The filter needs the sprite in the scene graph so Pixi renders
          // its texture, but we keep it invisible so it doesn't overlay the
          // composite (the displacement map is a grayscale bump map).
          displacement.renderable = false;
          this.app.stage.addChild(displacement);
          this.displacementSprites.push(displacement);
          displacementFilter = new DisplacementFilter({
            sprite: displacement,
            scale: zone.displacementScale ?? 10,
          });
        }
      }

      // Lighting overlay (rendered after design, multiply-blended).
      let lighting: Sprite | null = null;
      if (zone.lighting) {
        const lightTex = await this.safeLoadTexture(zone.lighting);
        if (lightTex) {
          lighting = new Sprite(lightTex);
          lighting.width = template.canvas.width;
          lighting.height = template.canvas.height;
          lighting.blendMode = 'multiply';
        }
      }

      this.zoneObjects.set(zone.id, {
        container,
        design: null,
        mask,
        lighting,
        displacement,
        displacementFilter,
        loadedDesignUrl: null,
      });
    }

    // Per-tint scaffolding.
    for (const region of template.tintableRegions ?? []) {
      this.tintObjects.set(region.id, { sprite: null, loadedColor: null });
    }

    // Per-prop scaffolding (loaded on demand in updateProps).
    this.propLayer.removeChildren().forEach((c) => c.destroy());
    this.propObjects.clear();
    for (const prop of template.props ?? []) {
      this.propObjects.set(prop.id, { sprite: null, loadedTint: null });
    }

    // Element + text layers are rebuilt every state tick, but clear on template swap.
    this.elementLayer.removeChildren().forEach((c) => c.destroy());
    this.elementObjects.clear();
    this.textLayer.removeChildren().forEach((c) => c.destroy());
    this.textObjects.clear();
  }

  private async makeMaskSprite(maskUrl: string, template: TemplateMeta): Promise<Sprite | null> {
    // PixiJS sprite masks use `red * alpha / 255` per pixel. We accept two
    // authoring conventions and normalize both to "white = visible, black =
    // clipped, all opaque":
    //   1. Procedural — white opaque inside zone, black opaque outside.
    //   2. Hand-authored Photoshop — transparent inside zone, opaque black
    //      outside (artists often paint everything *except* the design area).
    // The normalization formula `visible = max(r * a, 255 - a)` returns 255
    // for both white-opaque and any transparent pixel, and 0 for opaque
    // black — so both conventions render correctly.
    const normalized = await normalizeMaskUrl(maskUrl);
    if (!normalized) return null;
    const tex = await this.safeLoadTexture(normalized);
    if (!tex) return null;
    const sprite = new Sprite(tex);
    sprite.width = template.canvas.width;
    sprite.height = template.canvas.height;
    return sprite;
  }

  private async updateBackground(state: MockupState) {
    if (!this.template) return;

    // Remove any previous solid-color fill.
    if (this.solidBackground) {
      this.solidBackground.destroy();
      this.solidBackground = null;
    }

    if (state.background.type === 'template') {
      if (this.backgroundSprite) this.backgroundSprite.visible = true;
    } else if (state.background.type === 'solid') {
      if (this.backgroundSprite) this.backgroundSprite.visible = false;
      const g = new Graphics();
      g.rect(0, 0, this.template.canvas.width, this.template.canvas.height);
      g.fill(state.background.value || '#ffffff');
      this.backgroundLayer.addChildAt(g, 0);
      this.solidBackground = g;
    } else if (state.background.type === 'image') {
      if (this.backgroundSprite) this.backgroundSprite.visible = false;
      const tex = await this.safeLoadTexture(state.background.value);
      if (tex) {
        const g = new Graphics();
        g.rect(0, 0, this.template.canvas.width, this.template.canvas.height);
        g.fill({ texture: tex });
        this.backgroundLayer.addChildAt(g, 0);
        this.solidBackground = g;
      }
    }
    // Gradient: V1 placeholder — treated as solid using first hex.
  }

  private async updateTints(state: MockupState) {
    if (!this.template) return;
    for (const region of this.template.tintableRegions ?? []) {
      const tintState = state.tints[region.id];
      if (!tintState) continue;
      const record = this.tintObjects.get(region.id);
      if (!record) continue;

      if (!record.sprite) {
        const tex = await this.safeLoadTexture(region.mask);
        if (!tex) continue;
        const sprite = new Sprite(tex);
        sprite.width = this.template.canvas.width;
        sprite.height = this.template.canvas.height;
        // Normal blend: the tint mask's transparent regions leave the
        // background untouched; only the product surface is recolored
        // via the sprite's tint property.
        sprite.blendMode = 'normal';
        this.tintLayer.addChild(sprite);
        record.sprite = sprite;
      }

      // Convert the hex string to a number — Pixi v8's `Color` parser
      // accepts strings, but writing the numeric form is more robust
      // across Pixi releases and makes WebGL state changes detectable.
      record.sprite.tint = hexToNumber(tintState.color);
      record.sprite.visible = tintState.visible;
      record.loadedColor = tintState.color;
    }
  }

  private async updateZones(state: MockupState) {
    if (!this.template) return;

    for (const zone of this.template.zones) {
      const record = this.zoneObjects.get(zone.id);
      if (!record) continue;

      const zoneState = state.zones[zone.id];
      if (!zoneState) continue;

      // Design — (re)load when URL changes.
      if (zoneState.designUrl !== record.loadedDesignUrl) {
        if (record.design) {
          record.design.destroy();
          record.design = null;
        }
        if (zoneState.designUrl) {
          const tex = await this.safeLoadTexture(zoneState.designUrl);
          if (tex) {
            const sprite = new Sprite(tex);
            sprite.anchor.set(0.5, 0.5);
            record.container.addChild(sprite);
            record.design = sprite;
            // Make sure lighting stays on top.
            if (record.lighting && record.lighting.parent !== record.container) {
              record.container.addChild(record.lighting);
            }
          }
        }
        record.loadedDesignUrl = zoneState.designUrl;
      }

      // Transform + visibility update.
      if (record.design) {
        applyZoneTransform(record.design, zone, zoneState);
        record.design.visible = zoneState.visible;

        // Displacement filter applies to the design only.
        if (record.displacementFilter) {
          record.design.filters = [record.displacementFilter];
        }
      }

      // Lighting follows the design: visible + topmost only when there's a
      // design to light. Without a design, a multiply-blended lighting sprite
      // over an empty container produces a muddy rectangle; we suppress it.
      if (record.lighting) {
        const hasDesign = !!record.design;
        if (hasDesign) {
          if (record.lighting.parent !== record.container) {
            record.container.addChild(record.lighting);
          } else {
            record.container.setChildIndex(
              record.lighting,
              record.container.children.length - 1,
            );
          }
          record.lighting.visible = true;
        } else {
          record.lighting.visible = false;
        }
      }
    }
  }

  private async updateProps(state: MockupState) {
    if (!this.template) return;
    for (const prop of this.template.props ?? []) {
      const propState = state.props[prop.id] ?? { visible: prop.defaultVisible !== false };
      let record = this.propObjects.get(prop.id);
      if (!record) {
        record = { sprite: null, loadedTint: null };
        this.propObjects.set(prop.id, record);
      }

      if (!record.sprite) {
        const tex = await this.safeLoadTexture(prop.mask);
        if (!tex) continue;
        const sprite = new Sprite(tex);
        sprite.width = this.template.canvas.width;
        sprite.height = this.template.canvas.height;
        this.propLayer.addChild(sprite);
        record.sprite = sprite;
      }

      if (!record.sprite) continue;
      record.sprite.visible = propState.visible;
      if (propState.tint) {
        record.sprite.tint = hexToNumber(propState.tint);
        record.sprite.blendMode = 'multiply';
        record.loadedTint = propState.tint;
      } else {
        // Prop shown as a "cover" that hides the default base underneath.
        record.sprite.tint = 0xffffff;
        record.sprite.blendMode = 'normal';
        record.loadedTint = null;
      }
    }
  }

  private async updateElementLayers(state: MockupState) {
    const seen = new Set<string>();
    for (const layer of state.elementLayers) {
      seen.add(layer.id);
      let rec = this.elementObjects.get(layer.id);
      // Swap node if element type changed.
      if (rec && rec.type !== layer.type) {
        rec.node.destroy();
        this.elementObjects.delete(layer.id);
        rec = undefined;
      }
      if (!rec) {
        if (layer.type === 'image') {
          const tex = await this.safeLoadTexture(layer.url);
          if (!tex) continue;
          const sprite = new Sprite(tex);
          sprite.anchor.set(0.5, 0.5);
          this.elementLayer.addChild(sprite);
          rec = { node: sprite, type: 'image', loadedUrl: layer.url };
        } else {
          const g = new Graphics();
          this.elementLayer.addChild(g);
          rec = { node: g, type: layer.type };
        }
        this.elementObjects.set(layer.id, rec);
      }

      if (layer.type === 'image') {
        const sprite = rec.node as Sprite;
        if (rec.loadedUrl !== layer.url) {
          const tex = await this.safeLoadTexture(layer.url);
          if (tex) sprite.texture = tex;
          rec.loadedUrl = layer.url;
        }
        sprite.width = layer.width;
        sprite.height = layer.height;
        sprite.position.set(layer.x, layer.y);
        sprite.rotation = (layer.rotation * Math.PI) / 180;
      } else if (layer.type === 'rect') {
        const g = rec.node as Graphics;
        g.clear();
        g.rect(-layer.width / 2, -layer.height / 2, layer.width, layer.height);
        g.fill(layer.fill);
        if (layer.stroke) g.stroke({ color: layer.stroke, width: 2 });
        g.position.set(layer.x, layer.y);
        g.rotation = (layer.rotation * Math.PI) / 180;
      } else if (layer.type === 'circle') {
        const g = rec.node as Graphics;
        g.clear();
        g.circle(0, 0, layer.radius);
        g.fill(layer.fill);
        if (layer.stroke) g.stroke({ color: layer.stroke, width: 2 });
        g.position.set(layer.x, layer.y);
      } else if (layer.type === 'line') {
        const g = rec.node as Graphics;
        g.clear();
        g.moveTo(layer.x1, layer.y1);
        g.lineTo(layer.x2, layer.y2);
        g.stroke({ color: layer.stroke, width: layer.strokeWidth });
      }
    }

    // Destroy layers removed from state.
    for (const [id, rec] of this.elementObjects.entries()) {
      if (!seen.has(id)) {
        rec.node.destroy();
        this.elementObjects.delete(id);
      }
    }
  }

  private updateTextLayers(state: MockupState) {
    const seen = new Set<string>();
    for (const layer of state.textLayers) {
      seen.add(layer.id);
      let text = this.textObjects.get(layer.id);
      if (!text) {
        text = new Text({ text: layer.text });
        text.anchor.set(alignAnchor(layer.align), 0.5);
        this.textLayer.addChild(text);
        this.textObjects.set(layer.id, text);
      }
      applyTextStyle(text, layer);
    }
    for (const [id, t] of this.textObjects.entries()) {
      if (!seen.has(id)) {
        t.destroy();
        this.textObjects.delete(id);
      }
    }
  }

  private async safeLoadTexture(url: string | undefined): Promise<Texture | null> {
    if (!url) return null;
    try {
      // We bypass `Assets.load()` for two reasons:
      //   1. Real product photos come from Unsplash with query-string URLs
      //      and no file extension — Pixi's parser registry can't pick a
      //      loader for them and warns "we don't know how to parse it".
      //   2. Loading via a plain Image lets us set `crossOrigin = "anonymous"`
      //      so the resulting texture is exportable (toBlob).
      const img = await loadImageElement(url);
      const tex = Texture.from(img);
      this.loadedAssetUrls.add(url);
      return tex;
    } catch (err) {
      console.warn('[MockupRenderer] texture load failed', url, err);
      return null;
    }
  }

  private updateEffects(state: MockupState) {
    if (!this.template) return;
    const intensity = Math.max(0, Math.min(1, state.effects.lightingIntensity));
    // Disabling shadows softens the lighting layer by half.
    const shadowMult = state.effects.shadowsEnabled ? 1 : 0.5;
    for (const zone of this.template.zones) {
      const record = this.zoneObjects.get(zone.id);
      if (record?.lighting) {
        record.lighting.alpha = intensity * shadowMult;
      }
    }
  }
}

/** Cache for normalized mask data URLs — keyed by source URL. Mask
 *  normalization is pure for a given source, so we never need to re-run it. */
const maskNormalizeCache = new Map<string, string>();

/**
 * Normalize a mask image to PixiJS's expected format ("white opaque =
 * visible, black opaque = clipped, all alpha=255"). Accepts either
 * white-on-black-opaque or transparent-on-black-opaque source masks and
 * collapses both to the canonical form. Returns the source URL untouched
 * on failure so the renderer can degrade gracefully.
 */
async function normalizeMaskUrl(url: string): Promise<string | null> {
  if (!url) return null;
  const cached = maskNormalizeCache.get(url);
  if (cached) return cached;
  try {
    const img = await loadImageElement(url);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return url;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i];
      const a = px[i + 3];
      // visible if either: (a) opaque white-ish, or (b) transparent
      const visible = Math.max((r * a) / 255, 255 - a);
      const v = visible >= 128 ? 255 : 0;
      px[i] = px[i + 1] = px[i + 2] = v;
      px[i + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
    const out = canvas.toDataURL('image/png');
    maskNormalizeCache.set(url, out);
    return out;
  } catch (err) {
    console.warn('[MockupRenderer] mask normalize failed', url, err);
    return url;
  }
}

/** Load a URL into an HTMLImageElement so we can pass it to Texture.from.
 *  Sets `crossOrigin = "anonymous"` so cross-origin photos are usable as
 *  textures AND survive a `toBlob()` export without tainting the canvas. */
function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Don't set crossOrigin on data URLs — it's a no-op and some browsers
    // fail-fast when crossOrigin is set on `data:`/`blob:` URLs that are
    // already same-origin.
    if (!url.startsWith('data:') && !url.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

/** Parse "#RRGGBB" or "RRGGBB" into a uint24 number. Returns 0xffffff
 *  for unparseable input — that's a safe identity tint. */
function hexToNumber(hex: string): number {
  if (!hex) return 0xffffff;
  const stripped = hex.startsWith('#') ? hex.slice(1) : hex;
  const n = parseInt(stripped.length === 3
    ? stripped.split('').map((c) => c + c).join('')
    : stripped, 16);
  return Number.isNaN(n) ? 0xffffff : n;
}

function alignAnchor(align: TextLayer['align']): number {
  if (align === 'left') return 0;
  if (align === 'right') return 1;
  return 0.5;
}

function applyTextStyle(text: Text, layer: TextLayer) {
  text.text = layer.text;
  // Mutate the existing TextStyle in place rather than replacing it — a
  // fresh `new TextStyle()` per update leaks the old style's internal event
  // emitters (Pixi v8 does not auto-destroy replaced styles).
  const style = text.style as TextStyle;
  style.fontFamily = layer.fontFamily;
  style.fontSize = layer.fontSize;
  style.fontWeight = String(layer.fontWeight) as TextStyle['fontWeight'];
  style.fill = layer.color;
  style.letterSpacing = layer.letterSpacing;
  style.align = layer.align;
  text.anchor.set(alignAnchor(layer.align), 0.5);
  text.position.set(layer.x, layer.y);
  text.rotation = (layer.rotation * Math.PI) / 180;
}

function applyZoneTransform(
  sprite: Sprite,
  zone: TemplateZone,
  zoneState: { transform: { x: number; y: number; scale: number; rotation: number } },
) {
  const targetW = zone.defaultTransform.width * zoneState.transform.scale;
  const targetH = zone.defaultTransform.height * zoneState.transform.scale;
  const scaleX = sprite.texture.width ? targetW / sprite.texture.width : 1;
  const scaleY = sprite.texture.height ? targetH / sprite.texture.height : 1;

  // Lock aspect if constrained — use the smaller scale so design fits.
  const lockAspect = zone.constraints?.lockAspect !== false;
  if (lockAspect) {
    const s = Math.min(scaleX, scaleY);
    sprite.scale.set(s);
  } else {
    sprite.scale.set(scaleX, scaleY);
  }

  sprite.position.set(zoneState.transform.x, zoneState.transform.y);
  sprite.rotation = (zoneState.transform.rotation * Math.PI) / 180;
}

