// Unit tests for content-type configs.

import { describe, expect, it } from 'vitest';
import {
  CONTENT_TYPES,
  ContentTypeConfigSchema,
  getContentTypeConfig,
  listContentTypes,
} from './index';

describe('content-type configs', () => {
  it('every registered config matches the schema', () => {
    for (const cfg of Object.values(CONTENT_TYPES)) {
      expect(() => ContentTypeConfigSchema.parse(cfg)).not.toThrow();
    }
  });

  it('exposes the five seed configs from the master prompt', () => {
    const ids = Object.keys(CONTENT_TYPES).sort();
    expect(ids).toEqual([
      'banner',
      'brand-guideline-slide',
      'business-card',
      'presentation',
      'social-post',
    ]);
  });

  it('multi-page configs enable both pageNavigator and masterPages panels', () => {
    for (const cfg of listContentTypes()) {
      if (cfg.pageModel === 'multi') {
        expect(cfg.panels.pageNavigator, `${cfg.id} pageNavigator`).toBe(true);
        // Multi-page implies master pages should be supported (PowerPoint model)
        expect(cfg.supportsMasterPages, `${cfg.id} supportsMasterPages`).toBe(true);
        expect(cfg.panels.masterPages, `${cfg.id} masterPages panel`).toBe(true);
      }
    }
  });

  it('single-page configs do NOT show the pageNavigator', () => {
    for (const cfg of listContentTypes()) {
      if (cfg.pageModel === 'single') {
        expect(cfg.panels.pageNavigator, `${cfg.id} pageNavigator`).toBe(false);
      }
    }
  });

  it('every config declares a resizeStrategy from the allowed enum', () => {
    for (const cfg of listContentTypes()) {
      expect(['fixed', 'reflowable', 'ai-reflowable']).toContain(cfg.resizeStrategy);
    }
  });

  it('print stationery is fixed; presentations are ai-reflowable; banner is reflowable (per the table in templates.spec.md)', () => {
    expect(getContentTypeConfig('business-card').resizeStrategy).toBe('fixed');
    expect(getContentTypeConfig('presentation').resizeStrategy).toBe('ai-reflowable');
    expect(getContentTypeConfig('brand-guideline-slide').resizeStrategy).toBe('ai-reflowable');
    expect(getContentTypeConfig('social-post').resizeStrategy).toBe('ai-reflowable');
    expect(getContentTypeConfig('banner').resizeStrategy).toBe('reflowable');
  });

  it('every config has at least one export format and the default is in the list', () => {
    for (const cfg of listContentTypes()) {
      expect(cfg.exportFormats.length).toBeGreaterThan(0);
      expect(cfg.exportFormats).toContain(cfg.defaultExportFormat);
    }
  });

  it('seed dimensions match the master prompt', () => {
    expect(getContentTypeConfig('social-post').defaultDimensions).toEqual({
      width: 1080,
      height: 1080,
    });
    expect(getContentTypeConfig('presentation').defaultDimensions).toEqual({
      width: 1920,
      height: 1080,
    });
    expect(getContentTypeConfig('business-card').defaultDimensions).toEqual({
      width: 1050,
      height: 600,
    });
    expect(getContentTypeConfig('brand-guideline-slide').defaultDimensions).toEqual({
      width: 1920,
      height: 1080,
    });
    expect(getContentTypeConfig('banner').defaultDimensions).toEqual({
      width: 1500,
      height: 500,
    });
  });

  it('getContentTypeConfig throws on an unknown id', () => {
    expect(() => getContentTypeConfig('not-a-real-type')).toThrow(/Unknown content type/);
  });

  it('listContentTypes returns the same set as CONTENT_TYPES', () => {
    expect(listContentTypes().length).toBe(Object.keys(CONTENT_TYPES).length);
  });
});
