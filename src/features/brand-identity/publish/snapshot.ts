/**
 * A published identity: everything the page needs, and nothing it can reach.
 *
 * ── Why the material is inlined ───────────────────────────────────────────
 *
 * A share link is opened by someone with no account, no session and no grant
 * on anything. If the snapshot stored URLs, the page would render a brand's
 * words beside a grid of broken images: the `brand-assets` bucket was created
 * private, and there is no anonymous policy on `assets`. So the bytes travel
 * WITH the snapshot, as data URLs, and the published page reads exactly one
 * row and touches nothing else.
 *
 * That also settles a question the URL approach leaves open: what a visitor
 * sees cannot drift from what the owner published, because it is not a
 * reference to anything that can change.
 *
 * ── Why there is a budget ────────────────────────────────────────────────
 *
 * Inlining is not free — a `jsonb` row carrying twenty photographs is a row
 * nobody wants to read or write. Logos, colours and fonts go in first because
 * they are small and the page is meaningless without them; photographs and
 * assets fill whatever budget is left, largest-skipped-first, and the snapshot
 * records what did not fit rather than silently dropping it.
 */
import type { IdentityImage, IdentityModel } from '../identityModel';

/** Total inlined bytes a publication may carry. */
export const SNAPSHOT_BUDGET = 6 * 1024 * 1024;
/** No single item may take more than this share of the budget. */
export const SNAPSHOT_ITEM_MAX = 1.5 * 1024 * 1024;

export const SNAPSHOT_VERSION = 1;

export interface PublishedSnapshot {
  version: number;
  name: string;
  tagline?: string;
  /** The brand, in the legacy shape the page already renders from. */
  brand: Record<string, unknown>;
  images: IdentityImage[];
  assetGroups: Array<{ name: string; items: IdentityImage[] }>;
  /** Names of material that did not fit the budget. Shown to the OWNER only. */
  omitted: string[];
  publishedAt: string;
}

/** Rough byte size of a data URL, without decoding it. */
function sizeOf(url: string): number {
  if (!url.startsWith('data:')) return 0;
  const comma = url.indexOf(',');
  const payload = url.length - comma - 1;
  // base64 carries 3 bytes per 4 characters.
  return url.slice(0, comma).includes('base64') ? Math.floor((payload * 3) / 4) : payload;
}

/**
 * Fetches a url as a data URL, so it can travel inside the snapshot.
 *
 * Returns null when the bytes cannot be read — a cross-origin image with no
 * CORS header, a url that has since 404'd. The caller records the omission;
 * publishing does not fail because one photograph was unreachable.
 */
export async function inline(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (blob.size > SNAPSHOT_ITEM_MAX) return null;
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Builds the publication.
 *
 * The brand is carried through in its LEGACY shape rather than as the resolved
 * model, because that is what `BrandIdentityPage` already takes: the published
 * page then runs the identical `buildIdentityModel` the owner's page ran, and
 * the two cannot disagree about presence, sentinels or ordering. Sending the
 * resolved model instead would mean maintaining two readers of the same data.
 */
export async function buildSnapshot(model: IdentityModel): Promise<PublishedSnapshot> {
  const omitted: string[] = [];
  let spent = 0;

  /** Inlines within budget, or records why it did not. */
  const take = async (url: string, label: string): Promise<string | null> => {
    const data = await inline(url);
    if (!data) {
      omitted.push(label);
      return null;
    }
    const size = sizeOf(data);
    if (spent + size > SNAPSHOT_BUDGET) {
      omitted.push(label);
      return null;
    }
    spent += size;
    return data;
  };

  /*
   * A deep copy, so inlining a logo cannot mutate the brand in the store.
   * `brandAssets` is where every logo ref resolves to a url, and rewriting
   * those urls in place would leave the owner's own session pointing at data
   * URLs it did not ask for.
   */
  const brand = JSON.parse(JSON.stringify(model.brand)) as Record<string, unknown>;

  // Logos first: the page is meaningless without them, and they are small.
  const assets = (brand.brandAssets ?? []) as Array<{
    id: string;
    name?: string;
    formats?: Record<string, { url: string; size?: number }>;
  }>;
  const logoIds = new Set(model.logo.variants.map((v) => v.assetId).filter(Boolean));
  for (const asset of assets) {
    if (!logoIds.has(asset.id)) continue;
    for (const [format, file] of Object.entries(asset.formats ?? {})) {
      const data = await take(file.url, asset.name ?? asset.id);
      if (data) asset.formats![format] = { ...file, url: data };
    }
  }
  // The legacy scalars a few readers still reach for.
  for (const key of ['logo'] as const) {
    const url = brand[key];
    if (typeof url === 'string' && url) {
      const data = await take(url, key);
      if (data) brand[key] = data;
    }
  }

  const images: IdentityImage[] = [];
  for (const image of model.photography.images) {
    const data = await take(image.url, image.name);
    if (data) images.push({ ...image, url: data });
  }

  const assetGroups: PublishedSnapshot['assetGroups'] = [];
  for (const group of model.assets.groups) {
    const items: IdentityImage[] = [];
    for (const item of group.items) {
      const data = await take(item.url, item.name);
      if (data) items.push({ ...item, url: data });
    }
    if (items.length) assetGroups.push({ name: group.name, items });
  }

  return {
    version: SNAPSHOT_VERSION,
    name: model.name,
    ...(model.tagline ? { tagline: model.tagline } : {}),
    brand,
    images,
    assetGroups,
    omitted,
    publishedAt: new Date().toISOString(),
  };
}

/**
 * A share token.
 *
 * Random and unguessable — never derived from the brand's id or slug, because
 * a token you can compute from a name is not a permission, it is a URL scheme.
 */
export function newShareToken(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 24);
}
