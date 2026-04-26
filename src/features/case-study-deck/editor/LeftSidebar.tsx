/**
 * LeftSidebar — 80px icon strip + 280px expanding panel for the
 * case-study slide editor.
 *
 * Tabs:
 *   - Pages      → all 10 slides (thumbnails) — click navigates
 *   - Shapes     → CATALOGS[archetype].shapes — click sets shape
 *   - Text       → click-to-insert Heading / Subhead / Body / Caption
 *   - Brand      → brand colors + image assets — click applies/replaces/inserts
 *   - Templates  → ALL_STYLES — click sets per-slide style
 *
 * The panel slides in/out via CSS transition (200ms). Clicking the
 * active tab's icon collapses it.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Shapes, Type, Palette, LayoutTemplate } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import type { UseDeckPlan } from '../hooks/useDeckPlan';
import { CATALOGS } from '../shapes';
import { ALL_STYLES } from '../styles';
import { resolveStyledSlide } from '../slides/styled';
import { ARCHETYPE_LABELS } from '../slides/renderer';
import { resolveSlideStyle } from '../styles';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../constants';

type TabId = 'pages' | 'shapes' | 'text' | 'brand' | 'templates';

interface Props {
  brand: Brand;
  slug: string;
  deck: UseDeckPlan;
  currentIndex: number;
}

const TABS: { id: TabId; label: string; Icon: typeof Layers }[] = [
  { id: 'pages', label: 'Pages', Icon: Layers },
  { id: 'shapes', label: 'Shapes', Icon: Shapes },
  { id: 'text', label: 'Text', Icon: Type },
  { id: 'brand', label: 'Brand', Icon: Palette },
  { id: 'templates', label: 'Templates', Icon: LayoutTemplate },
];

export function LeftSidebar({ brand, slug, deck, currentIndex }: Props) {
  const [active, setActive] = useState<TabId | null>('pages');

  return (
    <div style={{ display: 'flex', height: '100%', borderRight: '1px solid #1c1c1c', background: '#0d0d0d' }}>
      {/* Icon strip */}
      <div
        style={{
          width: 64,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: '10px 0',
          alignItems: 'center',
          borderRight: '1px solid #141414',
          flexShrink: 0,
        }}
      >
        {TABS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => setActive(isActive ? null : id)}
              title={label}
              style={{
                width: 48,
                height: 56,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                background: isActive ? '#1f1f1f' : 'transparent',
                color: isActive ? '#fff' : '#9aa0a6',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 10,
                letterSpacing: '0.04em',
                transition: 'background 120ms, color 120ms',
              }}
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#9aa0a6';
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Expanding panel */}
      <div
        style={{
          width: active ? 280 : 0,
          overflow: 'hidden',
          transition: 'width 180ms ease',
          background: '#0d0d0d',
          height: '100%',
        }}
      >
        <div style={{ width: 280, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {active === 'pages' && <PagesPanel deck={deck} slug={slug} currentIndex={currentIndex} />}
          {active === 'shapes' && <ShapesPanel deck={deck} currentIndex={currentIndex} />}
          {active === 'text' && <TextPanel />}
          {active === 'brand' && <BrandPanel brand={brand} />}
          {active === 'templates' && <TemplatesPanel deck={deck} currentIndex={currentIndex} />}
        </div>
      </div>
    </div>
  );
}

function PanelHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        padding: '14px 16px 10px',
        borderBottom: '1px solid #161616',
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        color: '#9aa0a6',
      }}
    >
      {title}
    </div>
  );
}

/* ─────────────────────────  PAGES  ───────────────────────── */
function PagesPanel({ deck, slug, currentIndex }: { deck: UseDeckPlan; slug: string; currentIndex: number }) {
  const navigate = useNavigate();
  const total = deck.slides.length;

  return (
    <>
      <PanelHeader title="Pages" />
      <div style={{ overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {deck.slides.map((s, i) => {
          const Slide = resolveStyledSlide(s.archetype);
          if (!Slide) return null;
          const isActive = currentIndex === i;
          const styleForSlide = resolveSlideStyle(deck.plan.style, s.hasStyleOverride ? s.styleId : undefined, deck.master);
          return (
            <button
              key={`pg-${i}`}
              onClick={() => navigate(`/b/${slug}/case-study/edit/${i}`)}
              style={{
                position: 'relative',
                background: '#111',
                border: isActive ? '2px solid #fff' : '1px solid #222',
                borderRadius: 8,
                padding: 0,
                overflow: 'hidden',
                cursor: 'pointer',
                aspectRatio: `${SLIDE_WIDTH} / ${SLIDE_HEIGHT}`,
                width: '100%',
              }}
              title={ARCHETYPE_LABELS[s.archetype] ?? s.archetype}
            >
              <div
                style={{
                  transform: `scale(${(280 - 24 - 4) / SLIDE_WIDTH})`,
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
                  left: 6,
                  top: 4,
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#fff',
                  background: 'rgba(0,0,0,0.6)',
                  borderRadius: 4,
                  padding: '1px 6px',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ─────────────────────────  SHAPES  ──────────────────────── */
function ShapesPanel({ deck, currentIndex }: { deck: UseDeckPlan; currentIndex: number }) {
  const slide = deck.slides[currentIndex];
  if (!slide) return null;
  const catalog = CATALOGS[slide.archetype];
  const activeId = slide.shapeId;

  return (
    <>
      <PanelHeader title={`${catalog?.categoryLabel ?? 'Shapes'} · ${catalog?.shapes.length ?? 0}`} />
      <div style={{ overflowY: 'auto', padding: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {catalog?.shapes.map((shape) => {
            const isActive = activeId === shape.id;
            return (
              <button
                key={shape.id}
                onClick={() => deck.setSlideShape(currentIndex, isActive ? undefined : shape.id)}
                style={{
                  background: isActive ? '#1f1f1f' : '#141414',
                  border: isActive ? '1px solid #fff' : '1px solid #232323',
                  color: '#fff',
                  borderRadius: 6,
                  padding: '10px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  gap: 4,
                  cursor: 'pointer',
                  transition: 'background 120ms',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 600 }}>{shape.name}</span>
                {shape.description && (
                  <span style={{ fontSize: 10, opacity: 0.6, lineHeight: 1.3 }}>{shape.description}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────  TEXT  ────────────────────────── */
function TextPanel() {
  const insert = (kind: 'heading' | 'subhead' | 'body' | 'caption') => {
    const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement | null;
    if (!canvas) return;
    const el = document.createElement('div');
    el.setAttribute('data-inserted', 'text');
    el.contentEditable = 'false';
    el.style.position = 'absolute';
    el.style.left = '120px';
    el.style.top = '120px';
    el.style.zIndex = '50';
    el.style.color = 'currentColor';

    if (kind === 'heading') {
      el.style.fontSize = '96px';
      el.style.fontWeight = '800';
      el.style.lineHeight = '1';
      el.style.letterSpacing = '-0.03em';
      el.textContent = 'Heading';
    } else if (kind === 'subhead') {
      el.style.fontSize = '48px';
      el.style.fontWeight = '600';
      el.style.lineHeight = '1.1';
      el.textContent = 'Subhead';
    } else if (kind === 'body') {
      el.style.fontSize = '24px';
      el.style.fontWeight = '400';
      el.style.lineHeight = '1.45';
      el.style.maxWidth = '560px';
      el.textContent = 'Body text — replace with your own copy.';
    } else {
      el.style.fontSize = '14px';
      el.style.fontWeight = '500';
      el.style.letterSpacing = '0.18em';
      el.style.textTransform = 'uppercase';
      el.style.opacity = '0.65';
      el.textContent = 'Caption';
    }
    canvas.appendChild(el);
  };

  const buttons: { id: 'heading' | 'subhead' | 'body' | 'caption'; label: string; sample: string; size: number }[] = [
    { id: 'heading', label: 'Heading', sample: 'Aa', size: 36 },
    { id: 'subhead', label: 'Subhead', sample: 'Aa', size: 24 },
    { id: 'body', label: 'Body', sample: 'Aa', size: 16 },
    { id: 'caption', label: 'Caption', sample: 'AA', size: 11 },
  ];

  return (
    <>
      <PanelHeader title="Add text" />
      <div style={{ overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {buttons.map((b) => (
          <button
            key={b.id}
            onClick={() => insert(b.id)}
            style={{
              background: '#141414',
              border: '1px solid #232323',
              color: '#fff',
              borderRadius: 8,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'background 120ms',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#1c1c1c')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#141414')}
          >
            <span style={{ fontSize: 13, fontWeight: 600 }}>{b.label}</span>
            <span style={{ fontWeight: b.id === 'heading' ? 800 : b.id === 'subhead' ? 600 : 400, fontSize: b.size }}>{b.sample}</span>
          </button>
        ))}
        <p style={{ marginTop: 8, fontSize: 10, color: '#666', lineHeight: 1.5 }}>
          Click to insert a text block in the top-left of the canvas. Drag to move, double-click to edit.
        </p>
      </div>
    </>
  );
}

/* ─────────────────────────  BRAND  ──────────────────────── */
function BrandPanel({ brand }: { brand: Brand }) {
  const cs = brand.colorSystem;
  const colors: { hex: string; label: string }[] = [];
  if (cs?.primary?.hex) colors.push({ hex: cs.primary.hex, label: 'Primary' });
  if (cs?.secondary?.hex) colors.push({ hex: cs.secondary.hex, label: 'Secondary' });
  if (cs?.accent?.hex) colors.push({ hex: cs.accent.hex, label: 'Accent' });
  if (brand.primaryColor && colors.length === 0) colors.push({ hex: brand.primaryColor, label: 'Primary' });

  const images = (brand.brandAssets ?? []).filter((a) => a.kind === 'image');

  const applyColor = (hex: string) => {
    const sel = (window as unknown as { __getCurrentEditorSelection?: () => HTMLElement | null }).__getCurrentEditorSelection?.();
    if (!sel) return;
    const tag = sel.tagName.toLowerCase();
    const isImage = tag === 'img' || tag === 'svg' || tag === 'picture';
    if (isImage) return;
    // Heuristic — text-bearing leaves get color, containers get background.
    const isTextLeaf = sel.children.length === 0 && (sel.textContent ?? '').trim().length > 0;
    if (isTextLeaf) {
      sel.style.color = hex;
    } else {
      sel.style.backgroundColor = hex;
    }
  };

  const applyImage = (url: string) => {
    const sel = (window as unknown as { __getCurrentEditorSelection?: () => HTMLElement | null }).__getCurrentEditorSelection?.();
    if (sel && sel.tagName === 'IMG') {
      (sel as HTMLImageElement).src = url;
      return;
    }
    // Insert a new <img> at canvas top-left
    const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement | null;
    if (!canvas) return;
    const img = document.createElement('img');
    img.src = url;
    img.style.position = 'absolute';
    img.style.left = '160px';
    img.style.top = '160px';
    img.style.width = '480px';
    img.style.height = 'auto';
    img.style.zIndex = '40';
    img.setAttribute('data-inserted', 'image');
    canvas.appendChild(img);
  };

  return (
    <>
      <PanelHeader title="Brand" />
      <div style={{ overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Colors */}
        <div>
          <div style={{ fontSize: 10, color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>
            Colors
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {colors.length === 0 && (
              <div style={{ fontSize: 11, color: '#666', gridColumn: '1 / -1' }}>No brand colors set.</div>
            )}
            {colors.map((c) => (
              <button
                key={c.hex + c.label}
                onClick={() => applyColor(c.hex)}
                title={`${c.label} · ${c.hex}`}
                style={{
                  aspectRatio: '1',
                  background: c.hex,
                  border: '1px solid #232323',
                  borderRadius: 6,
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>

        {/* Assets */}
        <div>
          <div style={{ fontSize: 10, color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>
            Images · {images.length}
          </div>
          {images.length === 0 ? (
            <div style={{ fontSize: 11, color: '#666' }}>No image assets in this brand.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {images.map((a) => {
                const fmt = a.formats.png?.url ?? a.formats.webp?.url ?? a.formats.jpg?.url ?? a.formats.svg?.url;
                if (!fmt) return null;
                return (
                  <button
                    key={a.id}
                    onClick={() => applyImage(fmt)}
                    title={a.name}
                    style={{
                      aspectRatio: '1',
                      background: '#141414',
                      border: '1px solid #232323',
                      borderRadius: 6,
                      cursor: 'pointer',
                      padding: 0,
                      overflow: 'hidden',
                    }}
                  >
                    <img src={fmt} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <p style={{ fontSize: 10, color: '#666', lineHeight: 1.5 }}>
          Tip — select an element first, then click a color or image to apply. Otherwise an image is inserted as a new layer.
        </p>
      </div>
    </>
  );
}

/* ─────────────────────────  TEMPLATES  ──────────────────── */
function TemplatesPanel({ deck, currentIndex }: { deck: UseDeckPlan; currentIndex: number }) {
  const slide = deck.slides[currentIndex];
  if (!slide) return null;
  const activeId = slide.styleId;

  return (
    <>
      <PanelHeader title="Templates" />
      <div style={{ overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ALL_STYLES.map((s) => {
          const isActive = activeId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => deck.setSlideStyle(currentIndex, isActive ? undefined : s.id)}
              style={{
                background: isActive ? '#1f1f1f' : '#141414',
                border: isActive ? '1px solid #fff' : '1px solid #232323',
                color: '#fff',
                borderRadius: 8,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 3,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 120ms',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700 }}>{s.name}</span>
              <span style={{ fontSize: 10, opacity: 0.6, lineHeight: 1.4 }}>{s.description}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
