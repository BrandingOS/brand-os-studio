// One vocabulary for "put this on the canvas".
//
// Every insertion path — a panel click, a drag from a panel, a file
// dropped on the workspace, the empty state's buttons — produces an
// `InsertRequest` and hands it here. That is what lets a panel tile be
// draggable for free: the drag payload is this object as JSON, and the
// drop handler is the same function the click handler calls.

import type { Layer, Page } from '@/features/editor/schema';
import type { BrandKit } from '@/features/editor/brand/BrandKit';
import type { LayerEditingAdapter } from '@/features/editor/adapter/EditorAdapter';
import {
  makeImage,
  makeLogo,
  makeShape,
  makeSvg,
  makeText,
  type ShapeKind,
  type TextStyleId,
} from './insert';

export type InsertRequest =
  | { kind: 'shape'; shape: ShapeKind }
  | { kind: 'text'; style: TextStyleId; text?: string }
  | { kind: 'image'; src: string; natural?: { width: number; height: number } }
  | { kind: 'svg'; src: string; name?: string }
  | {
      kind: 'logo';
      variant:
        | 'primary'
        | 'secondary'
        | 'wordmark'
        | 'iconmark'
        | 'mono.black'
        | 'mono.white'
        | 'auto';
    };

export function buildLayer(
  request: InsertRequest,
  kit: BrandKit | null,
  page: Page,
  centre: { x: number; y: number },
): Layer {
  const opts = { centre, page };
  switch (request.kind) {
    case 'shape':
      return makeShape(request.shape, kit, opts);
    case 'text':
      return makeText(request.style, kit, opts, request.text);
    case 'image':
      return makeImage(request.src, opts, request.natural);
    case 'svg':
      return makeSvg(request.src, opts, request.name);
    case 'logo':
      return makeLogo(request.variant, opts);
  }
}

/**
 * Insert and select.
 *
 * Selecting the new layer is not a nicety: it is what makes the context
 * bar appear with the controls for the thing you just made, so the next
 * action is one click rather than one click plus finding it again.
 */
export function insertLayer({
  adapter,
  page,
  kit,
  request,
  centre,
}: {
  adapter: LayerEditingAdapter;
  page: Page;
  kit: BrandKit | null;
  request: InsertRequest;
  centre: { x: number; y: number };
}): string {
  const layer = buildLayer(request, kit, page, centre);
  adapter.addLayer(page.id, layer);
  adapter.setSelection([layer.id]);
  return layer.id;
}
