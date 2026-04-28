// Unit tests for the Step 5c isBrandBound helper.

import { describe, expect, it } from 'vitest';
import { isBrandBound } from './brandBound';
import type { Layer, ShapeLayer, TextLayer, LogoLayer } from '@/features/editor/schema';

const TRANSFORM = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
};

function textLayer(overrides: Partial<TextLayer> = {}): TextLayer {
  return {
    id: 't1',
    kind: 'text',
    name: 'text',
    text: 'hi',
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.2,
    letterSpacing: 0,
    textAlign: 'left',
    direction: 'auto',
    color: '#111111',
    transform: TRANSFORM,
    opacity: 1,
    visible: true,
    locked: false,
    brandLocked: false,
    ...overrides,
  } as TextLayer;
}

function shapeLayer(overrides: Partial<ShapeLayer> = {}): ShapeLayer {
  return {
    id: 's1',
    kind: 'shape',
    name: 'shape',
    shape: 'rectangle',
    fill: '#ff0000',
    stroke: null,
    strokeWidth: 0,
    cornerRadius: 0,
    transform: TRANSFORM,
    opacity: 1,
    visible: true,
    locked: false,
    brandLocked: false,
    ...overrides,
  } as ShapeLayer;
}

function logoLayer(overrides: Partial<LogoLayer> = {}): LogoLayer {
  return {
    id: 'l1',
    kind: 'logo',
    name: 'logo',
    variant: 'auto',
    transform: TRANSFORM,
    opacity: 1,
    visible: true,
    locked: false,
    brandLocked: false,
    ...overrides,
  } as LogoLayer;
}

describe('isBrandBound — gating is conditional on brandLocked', () => {
  it('returns false for ALL props when brandLocked is off, even with a SlotRef value', () => {
    const layer = textLayer({
      brandLocked: false,
      color: { type: 'brand.color.primary' },
      fontFamily: { type: 'brand.font.heading' },
    } as Partial<TextLayer>);
    expect(isBrandBound(layer, 'color')).toBe(false);
    expect(isBrandBound(layer, 'fontFamily')).toBe(false);
  });
});

describe('isBrandBound — text layers', () => {
  const baseLocked: Partial<TextLayer> = { brandLocked: true };

  it('color: SlotRef value → bound', () => {
    const layer = textLayer({
      ...baseLocked,
      color: { type: 'brand.color.primary' },
    } as Partial<TextLayer>);
    expect(isBrandBound(layer, 'color')).toBe(true);
  });

  it('color: literal hex → not bound', () => {
    const layer = textLayer({ ...baseLocked, color: '#000000' });
    expect(isBrandBound(layer, 'color')).toBe(false);
  });

  it('color: literal hex BUT _lockedBindings.color present → bound (4c.2 recovery)', () => {
    const layer = textLayer({
      ...baseLocked,
      color: '#000000',
      _lockedBindings: { color: { type: 'brand.color.primary' } },
    } as Partial<TextLayer>);
    expect(isBrandBound(layer, 'color')).toBe(true);
  });

  it('fontFamily: SlotRef value → bound', () => {
    const layer = textLayer({
      ...baseLocked,
      fontFamily: { type: 'brand.font.heading' },
    } as Partial<TextLayer>);
    expect(isBrandBound(layer, 'fontFamily')).toBe(true);
  });

  it('fontFamily: literal → not bound', () => {
    const layer = textLayer({ ...baseLocked, fontFamily: 'Inter' });
    expect(isBrandBound(layer, 'fontFamily')).toBe(false);
  });
});

describe('isBrandBound — shape layers', () => {
  const baseLocked: Partial<ShapeLayer> = { brandLocked: true };

  it('fill: SlotRef value → bound', () => {
    const layer = shapeLayer({
      ...baseLocked,
      fill: { type: 'brand.color.accent' },
    } as Partial<ShapeLayer>);
    expect(isBrandBound(layer, 'fill')).toBe(true);
  });

  it('fill: null → not bound', () => {
    const layer = shapeLayer({ ...baseLocked, fill: null });
    expect(isBrandBound(layer, 'fill')).toBe(false);
  });

  it('stroke: SlotRef value → bound', () => {
    const layer = shapeLayer({
      ...baseLocked,
      stroke: { type: 'brand.color.primary' },
    } as Partial<ShapeLayer>);
    expect(isBrandBound(layer, 'stroke')).toBe(true);
  });

  it('stroke: literal hex → not bound', () => {
    const layer = shapeLayer({ ...baseLocked, stroke: '#222' });
    expect(isBrandBound(layer, 'stroke')).toBe(false);
  });
});

describe('isBrandBound — logo variant is always brand-bound when locked', () => {
  it('variant: brandLocked + auto → bound', () => {
    const layer = logoLayer({ brandLocked: true, variant: 'auto' });
    expect(isBrandBound(layer, 'variant')).toBe(true);
  });

  it('variant: brandLocked + explicit primary → still bound (logo concept is brand-derived)', () => {
    const layer = logoLayer({ brandLocked: true, variant: 'primary' });
    expect(isBrandBound(layer, 'variant')).toBe(true);
  });

  it('variant: NOT locked → not bound', () => {
    const layer = logoLayer({ brandLocked: false, variant: 'auto' });
    expect(isBrandBound(layer, 'variant')).toBe(false);
  });
});

describe('isBrandBound — wrong-kind queries are safely false', () => {
  it('asking about color on a shape returns false', () => {
    const layer = shapeLayer({
      brandLocked: true,
      fill: { type: 'brand.color.primary' },
    } as Partial<ShapeLayer>);
    expect(isBrandBound(layer as Layer, 'color')).toBe(false);
  });

  it('asking about fill on a text layer returns false', () => {
    const layer = textLayer({ brandLocked: true });
    expect(isBrandBound(layer as Layer, 'fill')).toBe(false);
  });

  it('asking about variant on a non-logo layer returns false', () => {
    const layer = textLayer({ brandLocked: true });
    expect(isBrandBound(layer as Layer, 'variant')).toBe(false);
  });
});
