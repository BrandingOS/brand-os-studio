// Unit tests for convertToTemplate — Phase 4.2.

import { describe, expect, it } from 'vitest';
import { convertToTemplate } from './convertToTemplate';
import type { BrandOSDocument, Layer } from '@/features/editor/schema';
import type { BrandKit } from '@/features/editor/brand/BrandKit';

function fixtureKit(): BrandKit {
  return {
    id: 'k', name: 'K',
    colors: {
      primary: { hex: '#1A1A2E', name: 'Navy' },
      secondary: { hex: '#16A34A', name: 'Green' },
      accent: { hex: '#F59E0B', name: 'Amber' },
      neutrals: ['#FAFAFA', '#E5E5E5', '#A3A3A3', '#737373', '#404040', '#1A1A1A'],
    },
    typography: {
      heading: { family: 'DM Sans' },
      body: { family: 'Roboto' },
    },
    logos: { mono: {} },
    spacing: { unit: 8, cornerRadius: 8 },
    _diagnostics: { warnings: [] },
  };
}

function docWithLayers(layers: Layer[], background: string | object = '#ffffff'): BrandOSDocument {
  return {
    schemaVersion: 1,
    id: '00000000-0000-0000-0000-000000000aa1',
    contentType: 'social-post',
    brandId: null,
    masterPages: [],
    pages: [{
      id: '00000000-0000-0000-0000-000000000bb1',
      name: 'Page 1', width: 1080, height: 1080,
      background: background as never, masterPageId: null, layers,
    }],
    metadata: {},
  };
}

function textLayer(color: string, fontFamily: string): Layer {
  return {
    id: '00000000-0000-0000-0000-000000000cc1',
    kind: 'text', name: 'T', text: 'hi',
    fontFamily, fontSize: 24, fontWeight: 400,
    lineHeight: 1.2, letterSpacing: 0, textAlign: 'left', direction: 'ltr',
    color,
    transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
    opacity: 1, visible: true, locked: false, brandLocked: false,
  };
}

describe('convertToTemplate', () => {
  it('replaces text color literal that matches kit primary → SlotRef brand.color.primary', () => {
    const doc = docWithLayers([textLayer('#1A1A2E', 'Roboto')]);
    const out = convertToTemplate(doc, fixtureKit());
    const layer = out.pages[0].layers[0] as { color: unknown };
    expect(layer.color).toEqual({ type: 'brand.color.primary' });
  });

  it('replaces text color matching kit accent (case-insensitive)', () => {
    const doc = docWithLayers([textLayer('#f59e0b', 'Roboto')]); // lowercase
    const out = convertToTemplate(doc, fixtureKit());
    const layer = out.pages[0].layers[0] as { color: unknown };
    expect(layer.color).toEqual({ type: 'brand.color.accent' });
  });

  it('replaces text color matching a neutral with the right neutralIndex', () => {
    const doc = docWithLayers([textLayer('#737373', 'Roboto')]); // index 3
    const out = convertToTemplate(doc, fixtureKit());
    const layer = out.pages[0].layers[0] as { color: unknown };
    expect(layer.color).toEqual({ type: 'brand.color.neutral', neutralIndex: 3 });
  });

  it('keeps a literal color that does NOT match any kit value', () => {
    const doc = docWithLayers([textLayer('#deadbeef'.slice(0, 7), 'Roboto')]);
    const out = convertToTemplate(doc, fixtureKit());
    const layer = out.pages[0].layers[0] as { color: unknown };
    expect(layer.color).toBe('#deadbe');
  });

  it('replaces fontFamily matching kit heading → SlotRef brand.font.heading', () => {
    const doc = docWithLayers([textLayer('#000000', 'DM Sans')]);
    const out = convertToTemplate(doc, fixtureKit());
    const layer = out.pages[0].layers[0] as { fontFamily: unknown };
    expect(layer.fontFamily).toEqual({ type: 'brand.font.heading' });
  });

  it('matches font on the FIRST family in a stack', () => {
    const doc = docWithLayers([textLayer('#000000', 'Roboto, sans-serif')]);
    const out = convertToTemplate(doc, fixtureKit());
    const layer = out.pages[0].layers[0] as { fontFamily: unknown };
    expect(layer.fontFamily).toEqual({ type: 'brand.font.body' });
  });

  it('preserves existing SlotRefs unchanged', () => {
    const slot = { type: 'brand.color.primary' } as const;
    const doc = docWithLayers([{
      id: '00000000-0000-0000-0000-000000000cc2',
      kind: 'text', name: 'T', text: 'hi',
      fontFamily: { type: 'brand.font.heading' } as const,
      fontSize: 24, fontWeight: 400,
      lineHeight: 1.2, letterSpacing: 0, textAlign: 'left', direction: 'ltr',
      color: slot,
      transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1, visible: true, locked: false, brandLocked: false,
    } as Layer]);
    const out = convertToTemplate(doc, fixtureKit());
    const layer = out.pages[0].layers[0] as { color: unknown; fontFamily: unknown };
    expect(layer.color).toEqual(slot);
    expect(layer.fontFamily).toEqual({ type: 'brand.font.heading' });
  });

  it('replaces shape fill + stroke matching the kit', () => {
    const shape: Layer = {
      id: '00000000-0000-0000-0000-000000000cc3',
      kind: 'shape', shape: 'rectangle', name: 'R',
      fill: '#16A34A', stroke: '#1A1A2E', strokeWidth: 2, cornerRadius: 4,
      transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1, visible: true, locked: false, brandLocked: false,
    };
    const out = convertToTemplate(docWithLayers([shape]), fixtureKit());
    const r = out.pages[0].layers[0] as { fill: unknown; stroke: unknown };
    expect(r.fill).toEqual({ type: 'brand.color.secondary' });
    expect(r.stroke).toEqual({ type: 'brand.color.primary' });
  });

  it('handles null shape fill / stroke', () => {
    const shape: Layer = {
      id: '00000000-0000-0000-0000-000000000cc4',
      kind: 'shape', shape: 'rectangle', name: 'R',
      fill: null, stroke: null, strokeWidth: 0, cornerRadius: 0,
      transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1, visible: true, locked: false, brandLocked: false,
    };
    const out = convertToTemplate(docWithLayers([shape]), fixtureKit());
    const r = out.pages[0].layers[0] as { fill: unknown; stroke: unknown };
    expect(r.fill).toBe(null);
    expect(r.stroke).toBe(null);
  });

  it('replaces page background literal matching kit', () => {
    const doc = docWithLayers([], '#1A1A2E');
    const out = convertToTemplate(doc, fixtureKit());
    expect(out.pages[0].background).toEqual({ type: 'brand.color.primary' });
  });

  it('recurses into group children', () => {
    const inner: Layer = textLayer('#1A1A2E', 'DM Sans');
    const group: Layer = {
      id: '00000000-0000-0000-0000-000000000cc5',
      kind: 'group', name: 'G',
      children: [inner],
      transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1, visible: true, locked: false, brandLocked: false,
    };
    const out = convertToTemplate(docWithLayers([group]), fixtureKit());
    const child = (out.pages[0].layers[0] as { children: Layer[] }).children[0] as { color: unknown; fontFamily: unknown };
    expect(child.color).toEqual({ type: 'brand.color.primary' });
    expect(child.fontFamily).toEqual({ type: 'brand.font.heading' });
  });
});
