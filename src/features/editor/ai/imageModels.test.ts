// Pins the browser DISPLAY registry to the server model registry.
//
// Capabilities are no longer mirrored (the server ships them at runtime), so
// the only thing that can drift is the set of ids — which is exactly what this
// asserts, in both directions.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  IMAGE_MODEL_DISPLAY, LEGACY_MODEL_ALIASES,
  displayFor, resolveModelId, modelLabel, capsFrom, PENDING_CAPS, AUTO_MODEL_ID,
} from './imageModels';

function serverModelIds(): string[] {
  const src = readFileSync(
    resolve(process.cwd(), 'supabase/functions/_shared/imageModels.ts'), 'utf8',
  );
  const body = src.slice(src.indexOf('export const IMAGE_MODELS'));
  return [...body.matchAll(/^\s{4}id: '([^']+)',$/gm)].map((m) => m[1]);
}

describe('image model display registry', () => {
  const ids = serverModelIds();

  it('found the server registry', () => {
    expect(ids.length).toBeGreaterThan(5);
    expect(ids).toContain('google:nano-banana-pro');
  });

  it('every server model has a display entry', () => {
    for (const id of ids) expect(displayFor(id), `missing display for ${id}`).toBeDefined();
  });

  it('every display entry names a real server model', () => {
    for (const d of IMAGE_MODEL_DISPLAY) expect(ids, `stale display entry ${d.id}`).toContain(d.id);
  });

  it('short labels fit the toolbar', () => {
    for (const d of IMAGE_MODEL_DISPLAY) expect(d.short.length).toBeLessThanOrEqual(7);
  });

  it('legacy ids resolve to a live model', () => {
    for (const [legacy, target] of Object.entries(LEGACY_MODEL_ALIASES)) {
      expect(ids, `${legacy} → ${target}`).toContain(target);
      expect(resolveModelId(legacy)).toBe(target);
    }
  });

  it('labels auto with its resolved target', () => {
    expect(modelLabel(AUTO_MODEL_ID, 'google:nano-banana')).toBe('Auto · Nano Banana');
    expect(modelLabel(AUTO_MODEL_ID)).toBe('Auto');
    expect(modelLabel('openai:gpt-image')).toBe('GPT Image');
    expect(modelLabel('who:knows')).toBe('who:knows');
  });

  it('capsFrom falls back to the conservative set until the server answers', () => {
    expect(capsFrom(undefined, 'openai:gpt-image')).toBe(PENDING_CAPS);
    expect(capsFrom([], 'openai:gpt-image')).toBe(PENDING_CAPS);
    const models = [{ id: 'openai:gpt-image', caps: { ...PENDING_CAPS, maxReferenceImages: 8 } }] as never;
    expect(capsFrom(models, 'openai:gpt-image').maxReferenceImages).toBe(8);
    expect(capsFrom(models, AUTO_MODEL_ID, 'openai:gpt-image').maxReferenceImages).toBe(8);
    expect(capsFrom(models, 'unknown:model')).toBe(PENDING_CAPS);
  });

  it('PENDING_CAPS promises nothing optional', () => {
    expect(PENDING_CAPS.supportsReferenceImages).toBe(false);
    expect(PENDING_CAPS.maxReferenceImages).toBe(0);
    expect(PENDING_CAPS.supportedQualities).toEqual([]);
  });
});
