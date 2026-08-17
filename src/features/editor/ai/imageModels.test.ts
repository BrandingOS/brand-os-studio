// Pins the browser model registry to the server one.
// The server file is a pure TS module (no Deno imports), so we read it
// as text and evaluate the exported array — no runtime coupling, but a
// drift in ids or caps fails CI.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  IMAGE_MODEL_INFOS,
  LEGACY_MODEL_ALIASES,
  capsFor,
  findImageModelInfo,
  AUTO_CAPS,
} from './imageModels';

interface ServerDef {
  id: string;
  vendor: string;
  tier: string;
  keyEnv?: string;
  caps: { maxRefs: number; text: string; aspect: string; nMax: number; img2img: boolean };
}

function loadServerRegistry(): { models: ServerDef[]; aliases: Record<string, string> } {
  const file = resolve(process.cwd(), 'supabase/functions/_shared/imageModels.ts');
  const src = readFileSync(file, 'utf8');
  // Strip type-only syntax the runtime can't evaluate; keep object literals.
  const body = src
    .replace(/^export type [\s\S]*?;$/gm, '')
    .replace(/^export interface [\s\S]*?^}$/gm, '')
    .replace(/export const IMAGE_MODELS: ImageModelDef\[\] =/, 'const IMAGE_MODELS =')
    .replace(/export const LEGACY_MODEL_ALIASES: Record<string, string> =/, 'const LEGACY_MODEL_ALIASES =')
    .replace(/export const AUTO_ORDER: string\[\] =/, 'const AUTO_ORDER =')
    .replace(/^export function [\s\S]*?^}$/gm, '');
  const fn = new Function(`${body}\nreturn { models: IMAGE_MODELS, aliases: LEGACY_MODEL_ALIASES };`);
  return fn() as { models: ServerDef[]; aliases: Record<string, string> };
}

describe('image model registry — client mirrors server', () => {
  const server = loadServerRegistry();

  it('every client id exists on the server with identical vendor / tier / keyEnv / caps', () => {
    for (const info of IMAGE_MODEL_INFOS) {
      const s = server.models.find((m) => m.id === info.id);
      expect(s, `server missing ${info.id}`).toBeDefined();
      expect(s!.vendor).toBe(info.vendor);
      expect(s!.tier).toBe(info.tier);
      expect(s!.keyEnv).toBe(info.keyEnv);
      expect(s!.caps).toEqual(info.caps);
    }
  });

  it('every server id has a client display entry', () => {
    for (const s of server.models) {
      expect(findImageModelInfo(s.id), `client missing ${s.id}`).toBeDefined();
    }
  });

  it('legacy aliases agree', () => {
    expect(LEGACY_MODEL_ALIASES).toEqual(server.aliases);
    expect(findImageModelInfo('flux')?.id).toBe('pollinations:flux');
  });

  it('capsFor: auto and unknown ids get the permissive AUTO_CAPS', () => {
    expect(capsFor('auto')).toEqual(AUTO_CAPS);
    expect(capsFor('nope:model')).toEqual(AUTO_CAPS);
    expect(capsFor('pollinations:turbo').maxRefs).toBe(0);
  });

  it('short labels fit the toolbar trigger', () => {
    for (const info of IMAGE_MODEL_INFOS) expect(info.short.length).toBeLessThanOrEqual(7);
  });
});
