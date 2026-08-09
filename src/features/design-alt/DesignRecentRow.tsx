// DesignRecentRow — horizontal strip of recent designs for a brand.
//
// Reads IDesignStorage.listDesigns(brandId) on mount, sorts newest
// first, and renders the first 6 as clickable thumbnail tiles. The
// first tile is always "+ New blank canvas" → /editor/design/:slug,
// matching Canva's "Start with a blank canvas" affordance. Tiles
// open the unified editor at /b/:slug/design/:designId.
//
// Hidden when both the recents list AND the empty state would be
// noisy — i.e. when designStorage is unavailable. When no recents
// exist yet, we still show the "New blank canvas" tile + 4 muted
// placeholder tiles so the row reads as "this is where your work
// will live" rather than disappearing.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileImage, ArrowRight } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import type { DesignSummary, IDesignStorage } from '@/core/types/services';

interface Props {
  brand: Brand;
  designStorage: IDesignStorage;
  /** Hide the row entirely when there's nothing to show AND we can't
   *  even render the placeholder. Defaults to false — we'd rather
   *  show the "+ New" affordance than nothing. */
  hideWhenEmpty?: boolean;
}

const VISIBLE_LIMIT = 6;
const PLACEHOLDER_COUNT = 4;

export function DesignRecentRow({ brand, designStorage }: Props) {
  const [designs, setDesigns] = useState<DesignSummary[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await designStorage.listDesigns(brand.id);
        if (cancelled) return;
        // Newest first by updatedAt, falling back to createdAt.
        const sorted = [...list].sort((a, b) => {
          const ta = (a.updatedAt || a.createdAt || '').localeCompare(
            b.updatedAt || b.createdAt || '',
          );
          return -ta;
        });
        setDesigns(sorted.slice(0, VISIBLE_LIMIT));
      } catch (err) {
        console.error('[DesignRecentRow] listDesigns failed:', err);
        if (!cancelled) setDesigns([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brand.id, designStorage]);

  return (
    <section className="dh-section" aria-labelledby="dh-recents-title">
      <header className="dh-section-head">
        <h2 id="dh-recents-title" className="dh-section-title">Recent projects</h2>
        <Link
          to={`/b/${brand.slug}/templates?tab=my-designs`}
          className="dh-section-link"
        >
          See all <ArrowRight size={13} aria-hidden />
        </Link>
      </header>

      <div className="dh-recents" role="list">
        {/* New blank canvas tile — always first. */}
        <Link
          to={`/editor/design/${brand.slug}`}
          className="dh-recent-tile dh-recent-tile--new"
          role="listitem"
        >
          <span className="dh-recent-tile-thumb dh-recent-tile-thumb--new" aria-hidden>
            <Plus size={28} />
          </span>
          <span className="dh-recent-tile-name">New project</span>
          <span className="dh-recent-tile-meta">Blank canvas</span>
        </Link>

        {!loaded
          ? // Skeletons while loading.
            Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => (
              <div
                key={`skel-${i}`}
                className="dh-recent-tile dh-recent-tile--skeleton"
                aria-hidden
              >
                <span className="dh-recent-tile-thumb dh-recent-tile-thumb--skeleton" />
                <span className="dh-recent-tile-name dh-recent-tile-name--skeleton" />
              </div>
            ))
          : designs && designs.length > 0
          ? designs.map((d) => (
              <Link
                key={d.id}
                to={`/b/${brand.slug}/design/${d.id}`}
                className="dh-recent-tile"
                role="listitem"
              >
                <span className="dh-recent-tile-thumb">
                  {d.thumbnailUrl ? (
                    <img
                      src={d.thumbnailUrl}
                      alt=""
                      className="dh-recent-tile-img"
                      loading="lazy"
                    />
                  ) : (
                    <FileImage size={26} aria-hidden />
                  )}
                </span>
                <span className="dh-recent-tile-name">
                  {d.name?.trim() || 'Untitled'}
                </span>
                {d.contentType ? (
                  <span className="dh-recent-tile-meta">{d.contentType}</span>
                ) : null}
              </Link>
            ))
          : // Loaded but empty — one labelled empty state (DSN-05).
            // The old four grey placeholder tiles were indistinguishable
            // from loading skeletons, so the row read as permanently
            // stuck. Say what the space is for instead.
            (
              <div className="dh-recent-empty" role="listitem">
                <span className="dh-recent-empty-title">No designs yet</span>
                <span className="dh-recent-empty-sub">
                  Start a blank canvas or open a template below — your recent
                  work lands here.
                </span>
              </div>
            )}
      </div>
    </section>
  );
}

export default DesignRecentRow;
