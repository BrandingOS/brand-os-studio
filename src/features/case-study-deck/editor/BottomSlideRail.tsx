/**
 * BottomSlideRail — 96px horizontal strip of slide thumbnails.
 *
 * Each thumbnail is a CSS-scaled SlideFrame at ~140×80 pulled from
 * the deck. Click navigates to that slide. Active slide is highlighted
 * with a 2px brand-color border. Page numerals overlay top-left.
 */
import { useNavigate } from 'react-router-dom';
import type { UseDeckPlan } from '../hooks/useDeckPlan';
import { resolveStyledSlide } from '../slides/styled';
import { ARCHETYPE_LABELS } from '../slides/renderer';
import { resolveSlideStyle } from '../styles';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../constants';

interface Props {
  deck: UseDeckPlan;
  slug: string;
  currentIndex: number;
}

const THUMB_W = 140;
const THUMB_H = Math.round(THUMB_W * (SLIDE_HEIGHT / SLIDE_WIDTH));

export function BottomSlideRail({ deck, slug, currentIndex }: Props) {
  const navigate = useNavigate();
  const total = deck.slides.length;
  const accent = deck.profile.palette.primary || '#3B82F6';

  return (
    <footer
      style={{
        height: 96,
        background: '#0d0d0d',
        borderTop: '1px solid #1c1c1c',
        flexShrink: 0,
        overflowX: 'auto',
        overflowY: 'hidden',
        padding: '8px 12px',
      }}
    >
      <div style={{ display: 'flex', gap: 8, height: '100%', alignItems: 'center' }}>
        {deck.slides.map((s, i) => {
          const Slide = resolveStyledSlide(s.archetype);
          if (!Slide) return null;
          const isActive = i === currentIndex;
          const styleForSlide = resolveSlideStyle(deck.plan.style, s.hasStyleOverride ? s.styleId : undefined, deck.master);
          return (
            <button
              key={`rail-${i}`}
              onClick={() => navigate(`/b/${slug}/case-study/edit/${i}`)}
              title={ARCHETYPE_LABELS[s.archetype] ?? s.archetype}
              style={{
                position: 'relative',
                flexShrink: 0,
                width: THUMB_W,
                height: THUMB_H,
                background: '#111',
                border: isActive ? `2px solid ${accent}` : '1px solid #222',
                borderRadius: 6,
                padding: 0,
                overflow: 'hidden',
                cursor: 'pointer',
                opacity: s.hidden ? 0.4 : 1,
              }}
            >
              <div
                style={{
                  transform: `scale(${THUMB_W / SLIDE_WIDTH})`,
                  transformOrigin: 'top left',
                  width: SLIDE_WIDTH,
                  height: SLIDE_HEIGHT,
                  pointerEvents: 'none',
                }}
              >
                {s.frozenHtml ? (
                  <div
                    style={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT, position: 'relative' }}
                    dangerouslySetInnerHTML={{ __html: s.frozenHtml }}
                  />
                ) : (
                  <Slide index={i} profile={deck.profile} style={styleForSlide} overrides={s.overrides} total={total} shapeId={s.shapeId} />
                )}
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: 4,
                  top: 4,
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#fff',
                  background: 'rgba(0,0,0,0.65)',
                  borderRadius: 3,
                  padding: '1px 5px',
                  letterSpacing: '0.06em',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
            </button>
          );
        })}
      </div>
    </footer>
  );
}
