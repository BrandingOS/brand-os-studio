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

  /** True once `init()` has completed. */
  private ready = false;

  /** Tracks whether we've started a destroy so concurrent re-inits are safe. */
  private destroyed = false;

  constructor() {
    this.app = new Application();
  }

  async init(canvas: HTMLCanvasElement, opts: { width: number; height: number }) {
    // Pixi v8 init is async.
    await this.app.init({
      canvas,
      width: opts.width,
      height: opts.height,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });

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

  /** Update state and repaint. Idempotent — cheap to call on every mutation. */
  async applyState(state: MockupState) {
    if (!this.ready || !this.template) return;
    this.state = state;
    await this.updateBackground(state);
    await this.updateTints(state);
    await this.updateZones(state);
    await this.updateProps(state);
    await this.updateElementLayers(state);
    this.updateTextLayers(state);
    this.updateEffects(state);
  }

  destroy() {
    this.destroyed = true;
    this.zoneObjects.clear();
    this.tintObjects.clear();
    this.propObjects.clear();
    this.elementObjects.clear();
    this.textObjects.clear();
    this.app.destroy(true, { children: true, texture: false });
  }

  // ─── private ────────────────────────────────────────────────────

  private async rebuildForTemplate(template: TemplateMeta) {
    // Clear previous zones / tints / bg.
    this.zoneLayer.removeChildren().forEach((c) => c.destroy());
    this.tintLayer.removeChildren().forEach((c) => c.destroy());
    this.backgroundLayer.removeChildren().forEach((c) => c.destroy());
    this.zoneObjects.clear();
    this.tintObjects.clear();
    this.backgroundSprite = null;
    this.solidBackground = null;

    // Background base image.
    const baseTex = await safeLoadTexture(template.assets.base);
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
      }

      // Displacement — loaded once per zone.
      let displacement: Sprite | null = null;
      let displacementFilter: DisplacementFilter | null = null;
      if (zone.displacement) {
        const dispTex = await safeLoadTexture(zone.displacement);
        if (dispTex) {
          displacement = new Sprite(dispTex);
          displacement.width = template.canvas.width;
          displacement.height = template.canvas.height;
          this.app.stage.addChild(displacement); // filter source must be on stage
          displacementFilter = new DisplacementFilter({
            sprite: displacement,
            scale: zone.displacementScale ?? 10,
          });
        }
      }

      // Lighting overlay (rendered after design, multiply-blended).
      let lighting: Sprite | null = null;
      if (zone.lighting) {
        const lightTex = await safeLoadTexture(zone.lighting);
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
    const tex = await safeLoadTexture(maskUrl);
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
      const tex = await safeLoadTexture(state.background.value);
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

      const needsLoad =
        !record.sprite || record.loadedColor !== tintState.color;

      if (needsLoad) {
        if (record.sprite) {
          record.sprite.destroy();
        }
        const tex = await safeLoadTexture(region.mask);
        if (!tex) continue;
        const sprite = new Sprite(tex);
        sprite.width = this.template.canvas.width;
        sprite.height = this.template.canvas.height;
        sprite.tint = tintState.color;
        sprite.blendMode = 'multiply';
        this.tintLayer.addChild(sprite);
        record.sprite = sprite;
        record.loadedColor = tintState.color;
      } else if (record.sprite) {
        record.sprite.tint = tintState.color;
      }

      if (record.sprite) record.sprite.visible = tintState.visible;
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
          const tex = await safeLoadTexture(zoneState.designUrl);
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

      // Ensure lighting is the last child of the container (drawn on top of design).
      if (record.lighting && record.lighting.parent !== record.container) {
        record.container.addChild(record.lighting);
      } else if (record.lighting && record.lighting.parent === record.container) {
        record.container.setChildIndex(record.lighting, record.container.children.length - 1);
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
        const tex = await safeLoadTexture(prop.mask);
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
        record.sprite.tint = propState.tint;
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
          const tex = await safeLoadTexture(layer.url);
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
          const tex = await safeLoadTexture(layer.url);
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

function alignAnchor(align: TextLayer['align']): number {
  if (align === 'left') return 0;
  if (align === 'right') return 1;
  return 0.5;
}

function applyTextStyle(text: Text, layer: TextLayer) {
  text.text = layer.text;
  text.style = new TextStyle({
    fontFamily: layer.fontFamily,
    fontSize: layer.fontSize,
    fontWeight: String(layer.fontWeight) as TextStyle['fontWeight'],
    fill: layer.color,
    letterSpacing: layer.letterSpacing,
    align: layer.align,
  });
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

async function safeLoadTexture(url: string | undefined): Promise<Texture | null> {
  if (!url) return null;
  try {
    return (await Assets.load(url)) as Texture;
  } catch (err) {
    console.warn('[MockupRenderer] texture load failed', url, err);
    return null;
  }
}
