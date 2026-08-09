import { describe, it, expect } from 'vitest';
import {
  classifyAsset,
  isLegacyUrlRef,
  legacyUrlFromRef,
  formatFromUrl,
  mintAssetFromUrl,
  mintAssetFromLegacyLogoRef,
  resolveLogoAsset,
  resolveFontAsset,
  type Asset,
} from '@/domain/asset';

describe('classifyAsset — the single classification boundary', () => {
  it('classifies fonts by extension and mime', () => {
    expect(classifyAsset({ filename: 'Satoshi.ttf' })).toBe('font');
    expect(classifyAsset({ filename: 'x.woff2' })).toBe('font');
    expect(classifyAsset({ mime: 'font/woff2' })).toBe('font');
    expect(classifyAsset({ mime: 'application/vnd.ms-fontobject' })).toBe('font');
  });

  it('classifies documents (pdf)', () => {
    expect(classifyAsset({ mime: 'application/pdf' })).toBe('document');
    expect(classifyAsset({ filename: 'brief.pdf' })).toBe('document');
  });

  it('a manual explicitKind ALWAYS wins (even over a font file)', () => {
    expect(classifyAsset({ filename: 'x.ttf', explicitKind: 'logo' })).toBe('logo');
    expect(classifyAsset({ mime: 'image/png', explicitKind: 'icon' })).toBe('icon');
  });

  it('deterministic file-type beats an AI/context suggestion', () => {
    // brand-vision guessed "logo" but the bytes are a font → font wins.
    expect(classifyAsset({ filename: 'x.otf', suggestedKind: 'logo' })).toBe('font');
  });

  it('uses the AI/context suggestion for logo vs icon vs image (undecidable from mime)', () => {
    expect(classifyAsset({ mime: 'image/svg+xml', suggestedKind: 'logo' })).toBe('logo');
    expect(classifyAsset({ mime: 'image/png', suggestedKind: 'icon' })).toBe('icon');
  });

  it('defaults to image for a raster/vector with no role', () => {
    expect(classifyAsset({ mime: 'image/png' })).toBe('image');
    expect(classifyAsset({ filename: 'photo.jpg' })).toBe('image');
  });
});

describe('legacy-url refs (resolving 2A transitional refs)', () => {
  it('detects and extracts legacy-url refs', () => {
    expect(isLegacyUrlRef('legacy-url:https://x/logo.svg')).toBe(true);
    expect(isLegacyUrlRef('a1')).toBe(false);
    expect(legacyUrlFromRef('legacy-url:https://x/logo.svg')).toBe('https://x/logo.svg');
    expect(legacyUrlFromRef('a1')).toBeNull();
  });

  it('mints a real Asset from a legacy-url logo ref', () => {
    const asset = mintAssetFromLegacyLogoRef(
      { assetId: 'legacy-url:https://x/logo.svg' },
      { id: 'as1', brandId: 'b1', name: 'Primary logo', role: 'primary', createdAt: '2026-01-01' },
    );
    expect(asset).not.toBeNull();
    expect(asset!.kind).toBe('logo');
    expect(asset!.brandId).toBe('b1');
    expect(asset!.status).toBe('active');
    expect(asset!.role).toBe('primary');
    expect(asset!.formats.svg?.url).toBe('https://x/logo.svg');
  });

  it('returns null when the ref is already a real asset id (nothing to mint)', () => {
    expect(mintAssetFromLegacyLogoRef({ assetId: 'a1' }, { id: 'x', brandId: 'b', name: 'n' })).toBeNull();
  });
});

describe('format inference + minting', () => {
  it('infers formats from URLs and data URIs', () => {
    expect(formatFromUrl('https://x/a.svg')).toBe('svg');
    expect(formatFromUrl('https://x/a.png')).toBe('png');
    expect(formatFromUrl('data:image/png;base64,AAAA')).toBe('png');
    expect(formatFromUrl('https://x/a.pdf')).toBe('pdf');
  });

  it('mints an active asset from a url', () => {
    const a = mintAssetFromUrl({ id: 'a1', brandId: 'b1', url: 'https://x/p.png', name: 'Photo', kind: 'image' });
    expect(a.kind).toBe('image');
    expect(a.status).toBe('active');
    expect(a.formats.png?.url).toBe('https://x/p.png');
    expect(a.metadata.version).toBe(1);
  });
});

describe('LogoSystem→Asset and Font→Asset relationships', () => {
  const store = new Map<string, Asset>([
    ['a1', mintAssetFromUrl({ id: 'a1', brandId: 'b1', url: 'https://x/logo.svg', name: 'Logo', kind: 'logo' })],
    ['f1', mintAssetFromUrl({ id: 'f1', brandId: 'b1', url: 'https://x/font.woff2', name: 'Font', kind: 'font' })],
  ]);
  const lookup = (id: string) => store.get(id);

  it('resolves a LogoRef to its Asset', () => {
    expect(resolveLogoAsset({ assetId: 'a1' }, lookup)?.id).toBe('a1');
    expect(resolveLogoAsset({ assetId: 'missing' }, lookup)).toBeUndefined();
    expect(resolveLogoAsset(undefined, lookup)).toBeUndefined();
  });

  it('resolves an uploaded font Asset from FontToken.fontAssetId', () => {
    expect(resolveFontAsset({ fontAssetId: 'f1' }, lookup)?.kind).toBe('font');
    expect(resolveFontAsset({ fontAssetId: undefined }, lookup)).toBeUndefined();
    expect(resolveFontAsset(undefined, lookup)).toBeUndefined();
  });
});
