/**
 * Fabric Renderer — converts a ResolvedTemplate into Fabric.js canvas objects.
 *
 * Used for the canvas editor and high-res PNG/SVG/PDF export.
 * Each TemplateElement maps to a Fabric.js class:
 *   text → Textbox, shape.rect → Rect, shape.circle → Circle, logo/image → FabricImage
 */
import { Canvas, Rect, Circle, Textbox, FabricImage, type FabricObject } from 'fabric';
import type {
  ResolvedTemplate,
  TemplatePage,
  TemplateElement,
  TextElement,
  ShapeElement,
  ImageElement,
  LogoElement,
  DividerElement,
} from '../types';

interface RenderOptions {
  /** The target Fabric canvas */
  canvas: Canvas;
  /** Which page to render (default 0) */
  pageIndex?: number;
}

/**
 * Render a resolved template page onto a Fabric.js canvas.
 * Clears existing objects and replaces with new ones.
 */
export async function renderToFabric(
  template: ResolvedTemplate,
  options: RenderOptions,
): Promise<void> {
  const { canvas, pageIndex = 0 } = options;
  const page = template.pages[pageIndex];
  if (!page) return;

  const w = canvas.getWidth();
  const h = canvas.getHeight();

  // Clear existing objects
  canvas.clear();

  // Set background
  applyBackground(canvas, page, w, h);

  // Create Fabric objects for each element
  for (const el of page.elements) {
    const obj = await createFabricObject(el, w, h);
    if (obj) {
      // Store element ID for tracking
      (obj as any).templateElementId = el.id;
      canvas.add(obj);
    }
  }

  canvas.renderAll();
}

function applyBackground(canvas: Canvas, page: TemplatePage, w: number, h: number): void {
  const bg = page.background;
  if (bg.type === 'solid') {
    canvas.backgroundColor = bg.value;
  } else if (bg.type === 'gradient') {
    // Fabric gradient requires a rect
    const bgRect = new Rect({
      left: 0, top: 0, width: w, height: h,
      selectable: false, evented: false,
    });
    bgRect.set('fill', bg.value); // Simplified — full gradient needs fabric.Gradient
    canvas.add(bgRect);
    canvas.sendObjectToBack(bgRect);
  } else {
    canvas.backgroundColor = '#ffffff';
  }
}

async function createFabricObject(
  el: TemplateElement,
  canvasW: number,
  canvasH: number,
): Promise<FabricObject | null> {
  // Convert percentage positions to absolute pixels
  const left = (el.position.x / 100) * canvasW;
  const top = (el.position.y / 100) * canvasH;
  const width = (el.size.width / 100) * canvasW;
  const height = (el.size.height / 100) * canvasH;

  switch (el.type) {
    case 'text':
      return createText(el, left, top, width, height);
    case 'shape':
      return createShape(el, left, top, width, height);
    case 'image':
    case 'logo':
      return createImage(el, left, top, width, height);
    case 'divider':
      return createDivider(el, left, top, width);
    default:
      return null;
  }
}

function createText(el: TextElement, left: number, top: number, width: number, height: number): FabricObject {
  return new Textbox(el.content || '', {
    left, top, width,
    fontSize: el.style.fontSize || 16,
    fontFamily: el.style.fontFamily || 'Inter',
    fontWeight: String(el.style.fontWeight || '400'),
    fill: el.style.color || '#333333',
    textAlign: el.style.textAlign || 'left',
    lineHeight: el.style.lineHeight || 1.3,
    charSpacing: (el.style.letterSpacing || 0) * 10, // Fabric uses 1/1000 em
    opacity: el.opacity ?? 1,
    angle: el.rotation || 0,
    name: el.id,
  });
}

function createShape(el: ShapeElement, left: number, top: number, width: number, height: number): FabricObject {
  if (el.shape === 'circle') {
    const radius = Math.min(width, height) / 2;
    return new Circle({
      left, top, radius,
      fill: el.style.fill || '#000000',
      stroke: el.style.stroke,
      strokeWidth: el.style.strokeWidth || 0,
      opacity: el.style.opacity ?? (el.opacity ?? 1),
      angle: el.rotation || 0,
      name: el.id,
    });
  }

  // rect or line
  return new Rect({
    left, top, width, height,
    fill: el.style.fill || '#000000',
    stroke: el.style.stroke,
    strokeWidth: el.style.strokeWidth || 0,
    rx: el.style.borderRadius || 0,
    ry: el.style.borderRadius || 0,
    opacity: el.style.opacity ?? (el.opacity ?? 1),
    angle: el.rotation || 0,
    name: el.id,
  });
}

async function createImage(
  el: ImageElement | LogoElement,
  left: number, top: number, width: number, height: number,
): Promise<FabricObject | null> {
  const src = el.type === 'logo' ? (el as LogoElement).src : (el as ImageElement).src;
  if (!src) {
    // Placeholder rect for missing images
    return new Rect({
      left, top, width, height,
      fill: '#f0f0f0',
      stroke: '#ddd',
      strokeWidth: 1,
      name: el.id,
    });
  }

  try {
    const img = await FabricImage.fromURL(src, { crossOrigin: 'anonymous' });
    img.set({
      left, top,
      scaleX: width / (img.width || width),
      scaleY: height / (img.height || height),
      opacity: el.opacity ?? 1,
      angle: el.rotation || 0,
      name: el.id,
    });
    return img;
  } catch {
    // Image load failed — return placeholder
    return new Rect({
      left, top, width, height,
      fill: '#f0f0f0',
      name: el.id,
    });
  }
}

function createDivider(el: DividerElement, left: number, top: number, width: number): FabricObject {
  return new Rect({
    left, top, width,
    height: el.style.thickness || 1,
    fill: el.style.color || '#cccccc',
    opacity: el.opacity ?? 1,
    name: el.id,
    selectable: true,
  });
}

/**
 * Extract a TemplateDefinition-compatible element array from a Fabric canvas.
 * Useful for round-tripping: user edits on canvas → save back to template JSON.
 */
export function extractFromFabric(canvas: Canvas, canvasW: number, canvasH: number): TemplateElement[] {
  const elements: TemplateElement[] = [];

  for (const obj of canvas.getObjects()) {
    const id = (obj as any).templateElementId || obj.name || `el-${elements.length}`;
    const left = obj.left || 0;
    const top = obj.top || 0;
    const w = (obj.width || 0) * (obj.scaleX || 1);
    const h = (obj.height || 0) * (obj.scaleY || 1);

    const position = { x: (left / canvasW) * 100, y: (top / canvasH) * 100 };
    const size = { width: (w / canvasW) * 100, height: (h / canvasH) * 100 };

    if (obj instanceof Textbox) {
      elements.push({
        id, type: 'text', position, size,
        content: obj.text || '',
        style: {
          fontFamily: obj.fontFamily || 'Inter',
          fontSize: obj.fontSize || 16,
          fontWeight: obj.fontWeight || '400',
          color: (obj.fill as string) || '#333',
          textAlign: (obj.textAlign as 'left' | 'center' | 'right') || 'left',
        },
      });
    } else if (obj instanceof Circle) {
      elements.push({
        id, type: 'shape', position, size,
        shape: 'circle',
        style: { fill: (obj.fill as string) || '#000', borderRadius: 0 },
      });
    } else if (obj instanceof Rect) {
      elements.push({
        id, type: 'shape', position, size,
        shape: 'rect',
        style: {
          fill: (obj.fill as string) || '#000',
          borderRadius: obj.rx || 0,
          stroke: obj.stroke as string | undefined,
          strokeWidth: obj.strokeWidth || 0,
        },
      });
    }
  }

  return elements;
}
