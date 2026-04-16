import { Canvas, Rect, Circle, Line, Textbox, util, type FabricObject } from 'fabric';

export const CANVAS_SIZE = 800;

export const DEFAULT_OBJECT_STYLES: Partial<FabricObject> = {
  borderColor: '#378ADD',
  cornerColor: '#378ADD',
  cornerStrokeColor: '#ffffff',
  cornerSize: 10,
  cornerStyle: 'circle',
  transparentCorners: false,
  padding: 4,
};

export function createCanvas(el: HTMLCanvasElement): Canvas {
  const canvas = new Canvas(el, {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    selection: true,
    fireRightClick: true,
    stopContextMenu: true,
  });
  return canvas;
}

export function centerOf(canvas: Canvas) {
  return { x: canvas.getWidth() / 2, y: canvas.getHeight() / 2 };
}

export function addRect(canvas: Canvas, fill = '#378ADD') {
  const c = centerOf(canvas);
  const r = new Rect({
    left: c.x - 60,
    top: c.y - 40,
    width: 120,
    height: 80,
    fill,
    ...DEFAULT_OBJECT_STYLES,
  });
  canvas.add(r);
  canvas.setActiveObject(r);
  canvas.requestRenderAll();
  return r;
}

export function addCircle(canvas: Canvas, fill = '#378ADD') {
  const c = centerOf(canvas);
  const circle = new Circle({
    left: c.x - 50,
    top: c.y - 50,
    radius: 50,
    fill,
    ...DEFAULT_OBJECT_STYLES,
  });
  canvas.add(circle);
  canvas.setActiveObject(circle);
  canvas.requestRenderAll();
  return circle;
}

export function addLine(canvas: Canvas, stroke = '#111111') {
  const c = centerOf(canvas);
  const line = new Line([c.x - 80, c.y, c.x + 80, c.y], {
    stroke,
    strokeWidth: 4,
    ...DEFAULT_OBJECT_STYLES,
  });
  canvas.add(line);
  canvas.setActiveObject(line);
  canvas.requestRenderAll();
  return line;
}

export function addText(canvas: Canvas, text = 'Your brand', opts?: Partial<Textbox>) {
  const c = centerOf(canvas);
  const tb = new Textbox(text, {
    left: c.x - 150,
    top: c.y - 24,
    width: 300,
    fontSize: 48,
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    textAlign: 'center',
    fill: '#111111',
    ...DEFAULT_OBJECT_STYLES,
    ...opts,
  });
  canvas.add(tb);
  canvas.setActiveObject(tb);
  canvas.requestRenderAll();
  return tb;
}

export function deleteSelected(canvas: Canvas) {
  const active = canvas.getActiveObjects();
  if (active.length === 0) return;
  active.forEach((obj) => canvas.remove(obj));
  canvas.discardActiveObject();
  canvas.requestRenderAll();
}

export function duplicateSelected(canvas: Canvas) {
  const active = canvas.getActiveObject();
  if (!active) return;
  active.clone().then((clone: FabricObject) => {
    clone.set({
      left: (active.left ?? 0) + 20,
      top: (active.top ?? 0) + 20,
      ...DEFAULT_OBJECT_STYLES,
    });
    canvas.add(clone);
    canvas.setActiveObject(clone);
    canvas.requestRenderAll();
  });
}

export function bringForward(canvas: Canvas) {
  const active = canvas.getActiveObject();
  if (active) canvas.bringObjectForward(active);
  canvas.requestRenderAll();
}

export function sendBackward(canvas: Canvas) {
  const active = canvas.getActiveObject();
  if (active) canvas.sendObjectBackwards(active);
  canvas.requestRenderAll();
}

export function loadSVGIntoCanvas(canvas: Canvas, svg: string): Promise<void> {
  return util.loadSVGFromString(svg).then(({ objects, options }) => {
    canvas.clear();
    if (options?.background) canvas.backgroundColor = String(options.background);
    const valid = (objects ?? []).filter((o): o is FabricObject => !!o);
    const group = util.groupSVGElements(valid, options);
    group.set({
      left: (canvas.getWidth() - (group.width ?? 0)) / 2,
      top: (canvas.getHeight() - (group.height ?? 0)) / 2,
      ...DEFAULT_OBJECT_STYLES,
    });
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.requestRenderAll();
  });
}
