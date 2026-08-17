/**
 * Where a published identity lives.
 *
 * Two implementations behind one interface, and the seam matters: a share link
 * is only useful if a stranger on another machine can open it, and only the
 * server-backed one can do that. The local one exists so the Publish control
 * works — and is testable — before migration 023 is deployed, and so guests
 * and dev-bypass sessions are not handed a button that throws.
 *
 * The honesty is in `reach`: a publication says plainly whether its link
 * leaves this browser. A local publication that presented itself as shareable
 * would be the worst possible outcome — the owner sends the URL and the
 * recipient sees nothing.
 */
import { newShareToken, type PublishedSnapshot } from './snapshot';

export interface Publication {
  token: string;
  brandId: string;
  brandName: string;
  snapshot: PublishedSnapshot;
  publishedAt: string;
  /**
   * How far the link travels.
   *
   * `everyone` — stored on the server; anyone with the URL can open it.
   * `this-browser` — stored locally; the link works here and nowhere else.
   */
  reach: 'everyone' | 'this-browser';
}

export interface PublicationRepository {
  /** The live publication for a brand, or null. */
  forBrand(brandId: string): Promise<Publication | null>;
  /** What a visitor's token resolves to. */
  byToken(token: string): Promise<Publication | null>;
  /** Publish or re-publish. Replaces any existing publication for the brand. */
  publish(input: {
    brandId: string;
    brandName: string;
    snapshot: PublishedSnapshot;
    /** Reuse when re-publishing, so a link already sent keeps working. */
    token?: string;
  }): Promise<Publication>;
  /** Revoke. The link dies immediately. */
  unpublish(brandId: string): Promise<void>;
}

const KEY = 'brandos:identity-publications';

type Stored = Record<string, Publication>;

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Stored) : {};
  } catch {
    return {};
  }
}

function write(next: Stored): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // A snapshot can be megabytes and localStorage is small. Failing to store
    // is reported by the caller finding no publication afterwards, which is
    // truthful — better than a token that resolves to nothing.
  }
}

export class LocalPublicationRepository implements PublicationRepository {
  async forBrand(brandId: string): Promise<Publication | null> {
    return Object.values(read()).find((p) => p.brandId === brandId) ?? null;
  }

  async byToken(token: string): Promise<Publication | null> {
    return read()[token] ?? null;
  }

  async publish({
    brandId,
    brandName,
    snapshot,
    token,
  }: {
    brandId: string;
    brandName: string;
    snapshot: PublishedSnapshot;
    token?: string;
  }): Promise<Publication> {
    const store = read();
    // One live publication per brand — re-publishing replaces. A brand with
    // nine stale links nobody can tell apart is worse than no sharing.
    for (const [key, value] of Object.entries(store)) {
      if (value.brandId === brandId && key !== token) delete store[key];
    }
    const publication: Publication = {
      // A real random token, never the timestamp — that was both guessable and
      // full of colons, which do not belong in a path segment.
      token: token ?? newShareToken(),
      brandId,
      brandName,
      snapshot,
      publishedAt: snapshot.publishedAt,
      reach: 'this-browser',
    };
    store[publication.token] = publication;
    write(store);
    return publication;
  }

  async unpublish(brandId: string): Promise<void> {
    const store = read();
    for (const [key, value] of Object.entries(store)) {
      if (value.brandId === brandId) delete store[key];
    }
    write(store);
  }
}
