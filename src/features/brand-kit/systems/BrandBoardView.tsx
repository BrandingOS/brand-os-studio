import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Brand } from '@/shared/types/brand';
import { useBrandBoardStore } from '@/features/brand-board/store/useBrandBoardStore';
import { BrandBoardCanvas } from '@/features/brand-board/preview/BrandBoardCanvas';
import { SystemBand, SystemEmpty } from './SystemLayout';

/**
 * Brand Board — one page that says what the whole brand is.
 *
 * The board already existed, and it is good: a 1600×1000 poster with the
 * mark, the palette with hex codes, type specimens, the brand's adjectives
 * and an application mockup, all reading off the brand. What it did NOT
 * have was a home in Studio — it lived at /b/:slug/brand-board wearing
 * Classic chrome, which meant the only way to see your own brand board was
 * to leave the workspace you were in.
 *
 * So this embeds the real canvas, in Studio, and keeps the full editor one
 * click away for the shuffling and fine-tuning it is actually for.
 *
 * Two things this is careful about:
 *
 *   • The board's draft is IN-MEMORY ONLY (the store is devtools-wrapped,
 *     not persisted — what survives a reload is whatever was saved back to
 *     the brand). So mounting here goes through `ensureInitFromBrand`,
 *     which no-ops when the store already holds this brand's draft.
 *     Mounting must never cost the user unsaved work.
 *   • The canvas renders at a fixed 1600×1000. It is scaled to fit with a
 *     transform rather than reflowed, because the poster's proportions are
 *     the design.
 */

const CANVAS_W = 1600;
const CANVAS_H = 1000;

export function BrandBoardView({ brand }: { brand?: Brand }) {
  const ensureInitFromBrand = useBrandBoardStore((s) => s.ensureInitFromBrand);
  const initializedFor = useBrandBoardStore((s) => s.initializedForBrandId);

  useEffect(() => {
    if (brand) ensureInitFromBrand(brand);
  }, [brand, ensureInitFromBrand]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);

  // Scale to the available width. ResizeObserver rather than a window
  // listener so the board also re-fits when the sidebar or a panel changes
  // the column width without the window moving.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => {
      const width = el.clientWidth;
      if (width > 0) setScale(width / CANVAS_W);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!brand) {
    return (
      <SystemEmpty
        title="Brand board unavailable"
        sub="This preview needs a saved brand to read from."
      />
    );
  }

  const ready = initializedFor === brand.id;

  return (
    <div className="bk-sys">
      <SystemBand
        title="The whole brand, on one page"
        lede="Mark, palette, type and an application — the overview to hand someone who asks what the brand looks like."
      >
        <div className="bk-board-actions">
          <Link className="bk-board-open" to={`/b/${brand.slug}/brand-board`}>
            Open in the board editor
          </Link>
        </div>
        <div ref={wrapRef} className="bk-board-wrap">
          <div
            className="bk-board-stage"
            style={{ height: ready ? CANVAS_H * scale : 0 }}
          >
            {ready && (
              <div
                className="bk-board-canvas"
                style={{
                  width: CANVAS_W,
                  height: CANVAS_H,
                  transform: `scale(${scale})`,
                }}
              >
                <BrandBoardCanvas />
              </div>
            )}
          </div>
        </div>
      </SystemBand>
    </div>
  );
}
