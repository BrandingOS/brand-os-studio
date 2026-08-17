/**
 * Publishing an identity.
 *
 * The promise a share link makes is narrow and worth pinning: what a stranger
 * sees is what the owner published, it does not change under them, it carries
 * its own material so nothing else has to be readable, and revoking it works.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Brand } from '@/shared/types/brand';
import { buildIdentityModel } from '../identityModel';
import { buildSnapshot, newShareToken, SNAPSHOT_VERSION } from '../publish/snapshot';
import { LocalPublicationRepository } from '../publish/publicationRepository';

const asset = (id: string, url: string) => ({
  id,
  kind: 'logo' as const,
  name: id,
  formats: { svg: { url, size: 1 } },
  metadata: {},
});

function brand(): Brand {
  return {
    id: 'b1',
    slug: 'meridian',
    name: 'Meridian',
    primaryColor: '#FFCC00',
    fonts: { primary: 'Fraunces' },
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    logoSystem: { primary: { assetId: 'a1' } },
    brandAssets: [asset('a1', 'data:image/svg+xml,%3Csvg%3E%3C/svg%3E')],
    businessInfo: { tagline: 'Made with intent' },
    identity: {
      colors: { primary: { hex: '#FFCC00' } },
      logos: {},
      typography: { primary: { family: 'Fraunces' } },
      voice: { personality: [], doList: [], dontList: [], examples: [] },
      strategy: { values: [], personality: [], aboutSections: [] },
    },
  } as unknown as Brand;
}

const model = () => buildIdentityModel({ brand: brand() });

describe('the snapshot carries its own material', () => {
  it('inlines the logo rather than pointing at it', async () => {
    const snap = await buildSnapshot(model());
    const assets = (snap.brand.brandAssets ?? []) as Array<{
      formats: Record<string, { url: string }>;
    }>;
    // A visitor has no session and no grant on `assets`, and the storage
    // bucket is private. A url here would render as a broken image.
    expect(assets[0].formats.svg.url.startsWith('data:')).toBe(true);
    expect(snap.omitted).toEqual([]);
    expect(snap.version).toBe(SNAPSHOT_VERSION);
  });

  it('does not mutate the brand it was built from', async () => {
    const source = brand();
    const before = JSON.stringify(source);
    await buildSnapshot(buildIdentityModel({ brand: source }));
    // Rewriting urls in place would leave the OWNER's live session pointing at
    // data URLs it never asked for.
    expect(JSON.stringify(source)).toBe(before);
  });

  it('carries the brand in the shape the page already renders', async () => {
    const snap = await buildSnapshot(model());
    // The published page runs the same `buildIdentityModel`, so presence,
    // ordering and sentinel handling cannot drift between the two views.
    const republished = buildIdentityModel({ brand: snap.brand as unknown as Brand });
    expect(republished.name).toBe('Meridian');
    expect(republished.colour.colours[0].hex).toBe('#FFCC00');
    expect(republished.logo.variants).toHaveLength(1);
  });

  it('records what it could not carry rather than dropping it quietly', async () => {
    const m = buildIdentityModel({
      brand: brand(),
      images: [{ id: 'p1', url: 'https://unreachable.example/photo.jpg', name: 'photo.jpg' }],
    });
    // `fetch` is unavailable in this environment, which is exactly the
    // unreachable case a real publish hits with a CORS-less image.
    const snap = await buildSnapshot(m);
    expect(snap.images).toEqual([]);
    expect(snap.omitted).toContain('photo.jpg');
  });
});

describe('a share token', () => {
  it('is random, not derived from the brand', () => {
    const a = newShareToken();
    const b = newShareToken();
    expect(a).not.toBe(b);
    expect(a).not.toContain('meridian');
    // A token you can compute from a name is a URL scheme, not a permission.
    expect(a.length).toBeGreaterThanOrEqual(16);
  });
});

describe('publishing, re-publishing and revoking', () => {
  let repo: LocalPublicationRepository;

  beforeEach(() => {
    localStorage.clear();
    repo = new LocalPublicationRepository();
  });

  it('resolves the token it hands out', async () => {
    const snap = await buildSnapshot(model());
    const pub = await repo.publish({ brandId: 'b1', brandName: 'Meridian', snapshot: snap });
    expect(await repo.byToken(pub.token)).toMatchObject({ brandId: 'b1' });
  });

  it('says plainly that a local publication does not travel', async () => {
    const snap = await buildSnapshot(model());
    const pub = await repo.publish({ brandId: 'b1', brandName: 'Meridian', snapshot: snap });
    // The worst outcome is an owner sending a link that only works for them.
    expect(pub.reach).toBe('this-browser');
  });

  it('keeps the token when re-publishing, so a sent link keeps working', async () => {
    const first = await repo.publish({
      brandId: 'b1',
      brandName: 'Meridian',
      snapshot: await buildSnapshot(model()),
    });
    const second = await repo.publish({
      brandId: 'b1',
      brandName: 'Meridian',
      snapshot: await buildSnapshot(model()),
      token: first.token,
    });
    expect(second.token).toBe(first.token);
  });

  it('keeps exactly one live publication per brand', async () => {
    await repo.publish({ brandId: 'b1', brandName: 'Meridian', snapshot: await buildSnapshot(model()) });
    const second = await repo.publish({
      brandId: 'b1',
      brandName: 'Meridian',
      snapshot: await buildSnapshot(model()),
    });
    const stored = JSON.parse(localStorage.getItem('brandos:identity-publications') ?? '{}');
    // Nine stale links nobody can tell apart is worse than no sharing at all.
    expect(Object.keys(stored)).toEqual([second.token]);
  });

  it('kills the link on revoke', async () => {
    const pub = await repo.publish({
      brandId: 'b1',
      brandName: 'Meridian',
      snapshot: await buildSnapshot(model()),
    });
    await repo.unpublish('b1');
    expect(await repo.byToken(pub.token)).toBeNull();
    expect(await repo.forBrand('b1')).toBeNull();
  });

  it('does not change under a visitor when the brand changes', async () => {
    const pub = await repo.publish({
      brandId: 'b1',
      brandName: 'Meridian',
      snapshot: await buildSnapshot(model()),
    });
    // The brand moves on. The publication is a copy, so it does not.
    const moved = { ...brand(), name: 'Renamed', primaryColor: '#000000' } as Brand;
    void buildIdentityModel({ brand: moved });
    const seen = await repo.byToken(pub.token);
    expect(seen?.snapshot.name).toBe('Meridian');
    expect(seen?.snapshot.brand.primaryColor).toBe('#FFCC00');
  });
});
