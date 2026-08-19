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

  it('exposes the eleven seed configs (5 master-prompt + 2 from Step 9 brandkit + 4 from Phase 4 Content Universe)', () => {
    const ids = Object.keys(CONTENT_TYPES).sort();
    expect(ids).toEqual([
      'banner',
      'brand-guideline-slide',
      'brochure',
      'business-card',
      'email-signature',
      'invoice',
      'letterhead',
      'poster',
      'presentation',
      'profile-icon',
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
    // Invoice + profile-icon are fixed: financial-doc layout is
    // legally rigid, icon sizes are exact-pixel re-exports.
    expect(getContentTypeConfig('invoice').resizeStrategy).toBe('fixed');
    expect(getContentTypeConfig('profile-icon').resizeStrategy).toBe('fixed');
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
    expect(getContentTypeConfig('invoice').defaultDimensions).toEqual({
      width: 1080,
      height: 1920,
    });
    expect(getContentTypeConfig('profile-icon').defaultDimensions).toEqual({
      width: 1080,
      height: 1080,
    });
  });

  it('banner config exposes the Facebook cover preset (added in Step 9 for brandkit facebook-covers migration)', () => {
    const banner = getContentTypeConfig('banner');
    const fbPreset = banner.dimensionPresets.find((p) => p.label === 'Facebook cover');
    expect(fbPreset).toEqual({ label: 'Facebook cover', width: 1640, height: 624 });
  });

  it('getContentTypeConfig throws on an unknown id', () => {
    expect(() => getContentTypeConfig('not-a-real-type')).toThrow(/Unknown content type/);
  });

  it('listContentTypes returns the same set as CONTENT_TYPES', () => {
    expect(listContentTypes().length).toBe(Object.keys(CONTENT_TYPES).length);
  });
});

describe('renderer capability', () => {
  it('defaults to fabric when a config omits it', () => {
    const parsed = ContentTypeConfigSchema.parse({
      id: 'x', label: 'X', icon: 'Square', pageModel: 'single',
      defaultDimensions: { width: 100, height: 100 },
      panels: { layers: true, properties: true, pageNavigator: false, assets: true, masterPages: false },
      exportFormats: ['png'], defaultExportFormat: 'png',
      supportsBrandKit: false, supportsMasterPages: false, resizeStrategy: 'fixed',
    });
    expect(parsed.renderer).toBe('fabric');
  });

  it('rejects an unknown renderer', () => {
    expect(() =>
      ContentTypeConfigSchema.parse({
        id: 'x', label: 'X', icon: 'Square', pageModel: 'single',
        defaultDimensions: { width: 100, height: 100 },
        panels: { layers: true, properties: true, pageNavigator: false, assets: true, masterPages: false },
        exportFormats: ['png'], defaultExportFormat: 'png',
        supportsBrandKit: false, supportsMasterPages: false, resizeStrategy: 'fixed',
        renderer: 'webgl',
      }),
    ).toThrow();
  });

  it('marks invoice as template-instance and leaves every other type on fabric', () => {
    expect(getContentTypeConfig('invoice').renderer).toBe('template-instance');
    expect(getContentTypeConfig('presentation').renderer).toBe('fabric');
    expect(getContentTypeConfig('social-post').renderer).toBe('fabric');
  });
});
