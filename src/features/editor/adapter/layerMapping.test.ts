// Pure-function tests for layerMapping. Tests that don't need Fabric
// running — getLayerId/setLayerId, fabricToTransform, findLayer.
// Adapter integration tests live in FabricAdapter.test.ts.

import { describe, expect, it } from 'vitest';
import {
  fabricToTransform,
  findLayer,
  getLayerId,
  setLayerId,
} from './layerMapping';
import type { BrandOSDocument } from '@/features/editor/schema';
import socialPostFixture from '@/features/editor/schema/__fixtures__/social-post.sample.json';

describe('layerMapping pure functions', () => {
  describe('getLayerId / setLayerId', () => {
    it('round-trips an id stamp', () => {
      const fakeObj = {} as Parameters<typeof getLayerId>[0];
      expect(getLayerId(fakeObj)).toBe(null);
      setLayerId(fakeObj, 'abc-123');
      expect(getLayerId(fakeObj)).toBe('abc-123');
    });
  });

  describe('fabricToTransform', () => {
    it('reads geometry off a Fabric-shaped object', () => {
      const fakeObj = {
        left: 100,
        top: 200,
        width: 300,
        height: 150,
        angle: 45,
        scaleX: 1.5,
        scaleY: 2,
      } as Parameters<typeof fabricToTransform>[0];
      expect(fabricToTransform(fakeObj)).toEqual({
        x: 100,
        y: 200,
        width: 300,
        height: 150,
        rotation: 45,
        scaleX: 1.5,
        scaleY: 2,
      });
    });

    it('applies sensible defaults for missing fields', () => {
      const fakeObj = {} as Parameters<typeof fabricToTransform>[0];
      expect(fabricToTransform(fakeObj)).toEqual({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      });
    });
  });

  describe('findLayer', () => {
    const doc = socialPostFixture as unknown as BrandOSDocument;

    it('returns the layer + its containing page when found', () => {
      const headlineId = doc.pages[0].layers[0].id;
      const found = findLayer(doc, headlineId);
      expect(found).not.toBe(null);
      expect(found!.layer.id).toBe(headlineId);
      expect(found!.page.id).toBe(doc.pages[0].id);
    });

    it('returns null for an unknown id', () => {
      expect(findLayer(doc, 'no-such-id')).toBe(null);
    });
  });
});
