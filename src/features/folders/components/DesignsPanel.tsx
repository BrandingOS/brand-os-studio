/**
 * DesignsPanel — the Designs half of the library.
 *
 * The tab used to be a hard-coded "saving isn't wired up yet" card, which
 * was untrue: IDesignStorage.listDesigns has backed the Design page's
 * recents and the My Designs grid since Phase 4.2. It reads the same
 * service here, in the same tile language as the assets grid, and keeps the
 * invitation to start one only for a brand that genuinely has none.
 */
import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PenTool, Sparkles } from 'lucide-react';
import { DsButton, DsSkeleton } from '@/shared/ds';
import { useService, SERVICE_KEYS } from '@/core';
import type { DesignSummary, IDesignStorage } from '@/core/types/services';

function sortNewest(list: DesignSummary[]): DesignSummary[] {
  return [...list].sort((a, b) =>
    (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''),
  );
}

export function DesignsPanel({
  brandId,
  slug,
  onCount,
}: {
  brandId: string;
  slug: string;
  /** Reported up so the toolbar can label the tab honestly. */
  onCount: (count: number | null) => void;
}) {
  const designStorage = useService<IDesignStorage>(SERVICE_KEYS.DESIGN_STORAGE);
  const navigate = useNavigate();
  const [designs, setDesigns] = React.useState<DesignSummary[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await designStorage.listDesigns(brandId);
        if (cancelled) return;
        setDesigns(sortNewest(list));
        onCount(list.length);
      } catch {
        if (cancelled) return;
        setDesigns([]);
        onCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brandId, designStorage, onCount]);

  if (designs === null) {
    return (
      <div className="fl-grid" aria-busy="true">
        {Array.from({ length: 8 }, (_, i) => (
          <DsSkeleton key={i} height={216} radius={14} />
        ))}
      </div>
    );
  }

  if (designs.length === 0) {
    return (
      <div className="fl-blank">
        <div className="fl-blank-glyph" aria-hidden>
          <PenTool size={22} strokeWidth={1.5} />
        </div>
        <h2 className="fl-blank-title">No designs saved yet</h2>
        <p className="fl-blank-copy">
          Designs you create in the editor are filed here alongside the brand's assets.
        </p>
        <div className="fl-blank-actions">
          <DsButton tone="primary" size="sm" onClick={() => navigate(`/b/${slug}/design`)}>
            Start a design
          </DsButton>
          <DsButton
            tone="secondary"
            size="sm"
            onClick={() => navigate(`/b/${slug}/templates`)}
          >
            <Sparkles size={13} strokeWidth={1.8} />
            Browse templates
          </DsButton>
        </div>
      </div>
    );
  }

  return (
    <div className="fl-grid">
      {designs.map((d) => (
        <Link key={d.id} to={`/b/${slug}/design/${d.id}`} className="fl-tile fl-tile--design">
          <div className="fl-tile-well">
            {d.thumbnailUrl ? (
              <div className="fl-preview">
                <img src={d.thumbnailUrl} alt="" loading="lazy" decoding="async" data-state="ready" />
              </div>
            ) : (
              <div className="fl-preview fl-preview--glyph fl-preview--tile" aria-hidden>
                <PenTool strokeWidth={1.5} />
              </div>
            )}
          </div>
          <div className="fl-tile-meta">
            <div className="fl-tile-name">{d.name || 'Untitled design'}</div>
            <div className="fl-tile-sub">
              <span className="fl-tile-cat">{d.contentType ?? 'Design'}</span>
              {d.width && d.height && (
                <>
                  <span className="fl-tile-dot" aria-hidden>
                    ·
                  </span>
                  <span className="fl-tile-spec">
                    {d.width}×{d.height}
                  </span>
                </>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
