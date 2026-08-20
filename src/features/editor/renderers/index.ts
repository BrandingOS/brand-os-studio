// The design renderer registry — how the shell learns which surface
// opens a document without naming any renderer itself.
//
// A content type declares its renderer (`ContentTypeConfig.renderer`,
// defaulting to 'fabric'); this module maps that id to the module that
// can paint it. `Editor.tsx` asks here and renders what it gets back.

import { getContentTypeConfig } from '@/features/editor/content-types';
import { fabricRenderer } from './fabric';
import { templateInstanceRenderer } from './template-instance';
import type { DesignRenderer } from './types';

export type {
  DesignRenderer,
  DesignCanvasProps,
  DesignPropertiesProps,
} from './types';

const RENDERERS: Record<string, DesignRenderer> = {
  fabric: fabricRenderer,
  'template-instance': templateInstanceRenderer,
};

/**
 * The renderer for a content type.
 *
 * Falls back to Fabric for a type nobody registered rather than throwing:
 * an unknown content type is a document we should still try to open, and
 * every type that predates pluggable renderers is a Fabric document.
 *
 * `getContentTypeConfig` THROWS on an unregistered id (every config is
 * meant to be intentional), so the lookup is guarded — a document whose
 * content type has been retired must still open, not crash the shell.
 * A registered type naming a renderer nobody has registered falls
 * through the same way — this was `invoice`'s own state until the
 * template-instance renderer registered below. `DesignRendererIdSchema`
 * is a closed two-value enum and both values are now registered, so
 * that branch has no live scenario left to pin in `registry.test.ts`;
 * it stays here as a safety net for a config that names a renderer id
 * nothing backs.
 */
export function getDesignRenderer(contentType: string): DesignRenderer {
  let rendererId: string | undefined;
  try {
    rendererId = getContentTypeConfig(contentType)?.renderer;
  } catch {
    rendererId = undefined;
  }
  return RENDERERS[rendererId ?? 'fabric'] ?? fabricRenderer;
}

/** Registration point. Called once per renderer module at import time. */
export function registerDesignRenderer(renderer: DesignRenderer): void {
  RENDERERS[renderer.id] = renderer;
}
