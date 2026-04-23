import { describe, it, expect } from 'vitest';
import { serializeFontSnippet } from '../fontSnippet';
import type { Typescale } from '@/shared/types/typescale';

function make(mono = false): Typescale {
  return {
    schemaVersion:1,
    fonts:{
      heading:{family:'Playfair Display',source:'google',weights:[400,700],italic:false,fallback:'serif'},
      body:   {family:'Inter',source:'google',weights:[400,500,700],italic:true,fallback:'system-ui'},
      ...(mono ? { mono:{family:'MyMono',source:'upload',weights:[400],italic:false,fallback:'monospace',
        files:[{weight:400,italic:false,url:'https://cdn/ex/mymono.woff2',format:'woff2'}]}} : {}),
    },
    surfaces:{} as any, activeSurface:'web', updatedAt:'2026-04-23T00:00:00.000Z',
  };
}

describe('serializeFontSnippet', () => {
  it('emits a Google <link> for every google font', () => {
    const out = serializeFontSnippet(make());
    expect(out).toContain('Playfair+Display');
    expect(out).toContain('fonts.googleapis.com');
  });
  it('emits @font-face for uploaded fonts', () => {
    const out = serializeFontSnippet(make(true));
    expect(out).toContain('@font-face');
    expect(out).toContain('MyMono');
  });
});
