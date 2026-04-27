import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import { toast } from 'sonner';
import { CosmosWorkspaceShell } from '@/shared/layouts/CosmosWorkspaceShell';
import { ArrowRight } from '@/features/setup/components/SetupIcons';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import type { Brand } from '@/shared/types/brand';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import { renderCosmosTemplate as renderTemplateDesign } from './renderers';
import {
  BrandKitSidebar,
  KIT_SECTIONS,
  type KitSectionKey,
} from './components/BrandKitSidebar';
import { KitSection } from './components/KitSection';
import { SectionGrid } from './components/sections';
import {
  BrandKitCardEditor,
  type EditorTarget,
} from './components/BrandKitCardEditor';
import './brand-kit.css';

const SECTION_LABELS: Record<KitSectionKey, string> = {
  stationery: 'Stationery',
  social: 'Social Media',
  web: 'Web',
  mockups: 'Mockups',
  'brand-guides': 'Brand Guides',
  presentations: 'Presentations',
  animations: 'Animations',
  'qr-code': 'QR Code',
};

/**
 * BrandKitCosmosPage — single-scroll Brand Kit at /b/:slug/brand-kit.
 *
 * Two views, same route:
 *   • Sections list (default) — every section with a small grid of cards.
 *   • Drilldown view — the entire board area is replaced by a header
 *     plus a long grid of variants for one card. Sidebar stays put.
 *
 * Picking a card swaps to drilldown; back arrow / sidebar jump returns
 * to the sections list. Right-click "Edit" opens the editor directly,
 * skipping the drilldown — same behaviour the old context menu had.
 *
 * Transition: only the cover images fade in (top-to-bottom stagger);
 * the tile frames switch instantly. We tried a dual-layer cross-fade
 * earlier so the previous view's covers showed through during the
 * fade, but the two grids never aligned perfectly (subpixel drift +
 * different surrounding structures), which made the rectangles look
 * like they'd doubled up. Single-layer + cover-only fade keeps things
 * visually clean.
 */
type Origin = { x: number; y: number };
type ViewState = 'sections' | 'drilldown';

/** Per-tile fade duration (must match the CSS transition value). */
const TILE_FADE_MS = 280;
/** Cap on the staggered delay so far tiles still fade in finite time. */
const MAX_DELAY_MS = 500;
/** ms-per-pixel speed for the radial wipe. */
const WIPE_SPEED = 0.4;

export function BrandKitCosmosPage({
  brand,
  sourceBrand,
}: {
  brand: MockBrand;
  /** Canonical Brand object — needed by the legacy template
   *  renderers (BusinessCardRenderer, MockupRenderer, etc.) so the
   *  drilldown can paint live, brand-aware previews of every
   *  template variant. Optional: when absent (e.g. the standalone
   *  setup mock), the drilldown falls back to the placeholder
   *  cover for every tile. */
  sourceBrand?: Brand;
}) {
  const [activeKey, setActiveKey] = useState<KitSectionKey>('stationery');
  // Page 2's content target. Once set on the first click, page 2
  // stays mounted in the DOM forever — only the target's content
  // (covers + label) updates on subsequent clicks. Mounting page 2
  // exactly once means the transition fires reliably (CSS
  // transitions need a prior state to interpolate from).
  const [drilldownTarget, setDrilldownTarget] = useState<EditorTarget | null>(null);
  // Which page is currently active. Drives data-active on the
  // stage, which flips the opacity rules for both layers.
  const [view, setView] = useState<ViewState>('sections');
  const [editorTarget, setEditorTarget] = useState<EditorTarget | null>(null);

  const sectionRefs = useRef<Partial<Record<KitSectionKey, HTMLElement | null>>>({});
  // Captured at click time on the trigger element (a card or the
  // Back button). Read by the post-mount useLayoutEffect to assign
  // each tile a distance-based animation-delay so the fade ripples
  // outward from the click point.
  const originRef = useRef<Origin | null>(null);
  // Captured at the moment the user enters the drilldown. Restored
  // on Back so the user lands at the exact section they clicked
  // from, not at the top of the sections list.
  const enterScrollYRef = useRef<number>(0);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const setRef = (key: KitSectionKey) => (el: HTMLElement | null) => {
    sectionRefs.current[key] = el;
  };

  const handleJump = useCallback((key: KitSectionKey) => {
    setActiveKey(key);
    originRef.current = null;
    setView('sections');
    requestAnimationFrame(() => {
      const el = sectionRefs.current[key];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  // anchor: drilldown-anchor-v1 — user-approved baseline (2026-04-27).
  // Don't change handlePickCard / exitDrilldown / wipe useLayoutEffect
  // semantics without confirming first.
  const handlePickCard = useCallback(
    (target: EditorTarget, origin?: Origin) => {
      // Capture current scroll so Back can restore it.
      enterScrollYRef.current = window.scrollY;
      // Wipe origin = the clicked tile's center, captured in
      // DOCUMENT coords (viewport y + scrollY at click time). Doc
      // coords stay stable while the page smooth-scrolls to the
      // top, so the layoutEffect computes per-tile delays based on
      // where each tile actually IS in the document — and the
      // wipe radiates outward from the tile the user actually
      // clicked, not from a fixed anchor.
      if (origin) {
        originRef.current = { x: origin.x, y: origin.y + window.scrollY };
      } else {
        originRef.current = null;
      }
      setActiveKey(target.sectionKey);
      // Two-phase commit so the CSS opacity transition has a prior
      // state to interpolate from on every click. Without this the
      // first-click fade silently no-ops because the browser only
      // sees the final opacity (1) with no prior state. flushSync
      // forces React to commit phase A immediately; rAF defers
      // phase B to the next frame so they paint separately.
      flushSync(() => {
        setDrilldownTarget(target);
      });
      // Smooth scroll up — runs in parallel with the wipe so the
      // user sees tiles fading in WHILE they scroll up, not before
      // arrival (would look "ready") and not after (would lag).
      window.scrollTo({ top: 0, behavior: 'smooth' });
      requestAnimationFrame(() => setView('drilldown'));
    },
    [],
  );

  const exitDrilldown = useCallback((origin?: Origin) => {
    // Convert the Back button's viewport center to DOCUMENT coords
    // so the wipe radiates from where Back is in the document — not
    // from a viewport y that becomes stale once we restore scroll.
    if (origin) {
      originRef.current = { x: origin.x, y: origin.y + window.scrollY };
    } else {
      originRef.current = null;
    }
    const targetY = enterScrollYRef.current;
    setView('sections');
    // Don't clear drilldownTarget — page 2 stays mounted for the
    // fade-out, and for any future re-entry to skip the rAF dance.
    // Restore the scroll position the user was at when they entered
    // the drilldown, so they land back on the exact section they
    // clicked from. rAF defers until page 1 is visible and the
    // wipe has started, so the scroll feels native.
    requestAnimationFrame(() => {
      window.scrollTo({ top: targetY, behavior: 'auto' });
    });
  }, []);

  // Escape exits the drilldown view (mirrors how the modal used to
  // close on Escape). Skipped while the editor is open — the editor
  // owns Escape so closing it doesn't also collapse drilldown.
  useEffect(() => {
    if (view !== 'drilldown' || editorTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitDrilldown();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, editorTarget, exitDrilldown]);

  const completion = useMemo(() => {
    const identity = brand.logos.length > 0 && brand.colors.core.length > 0;
    const completed = identity ? KIT_SECTIONS.length : 0;
    return { completed, total: KIT_SECTIONS.length };
  }, [brand]);

  // Scroll-spy: only meaningful in the sections-list view, since
  // drilldown is a single section. Re-attach when leaving drilldown.
  useEffect(() => {
    if (view === 'drilldown') return;
    const sections: Array<{ key: KitSectionKey; el: HTMLElement }> = KIT_SECTIONS.map((s) => {
      const el = sectionRefs.current[s.key];
      return el ? { key: s.key, el } : null;
    }).filter(Boolean) as Array<{ key: KitSectionKey; el: HTMLElement }>;
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length === 0) return;
        const top = visible[0];
        const match = sections.find((s) => s.el === top.target);
        if (match) setActiveKey(match.key);
      },
      { rootMargin: '-80px 0px -55% 0px', threshold: 0 },
    );
    sections.forEach((s) => observer.observe(s.el));
    return () => observer.disconnect();
  }, [view]);

  // Radial wipe — runs synchronously after every view change but
  // BEFORE the browser paints, so the CSS opacity transition fires
  // with the correct per-tile delay from frame 0.
  //
  // Distances are computed in DOCUMENT space (viewport y + scrollY)
  // so the wipe is invariant of any in-flight smooth-scroll animation.
  // Without this, an enter that triggers a smooth scroll-to-top would
  // measure tile rects while they're still off-screen above the
  // viewport, every distance saturates MAX_DELAY_MS, and the whole
  // grid fades in together once scroll completes — losing the
  // staggered top-to-bottom reveal we want.
  //
  //   • Enter (sections → drilldown): delay = distance × speed.
  //     Tiles near the wipe origin (top of page after scroll) fade
  //     first, the cascade flows downward through the grid in time
  //     with the smooth scroll-to-top.
  //   • Exit  (drilldown → sections): delay = distance × speed,
  //     origin = the Back button's document position.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const tiles = Array.from(
      stage.querySelectorAll<HTMLElement>('.bk-card, .bk-variant-card'),
    );
    if (tiles.length === 0) return;

    const origin = originRef.current;
    if (!origin) {
      tiles.forEach((el) => el.style.setProperty('--bk-d', '0ms'));
      return;
    }

    // Read all rects first, write all delays after — avoids forcing
    // layout once per tile.
    const rects = tiles.map((el) => el.getBoundingClientRect());
    const scrollY = window.scrollY;

    tiles.forEach((el, i) => {
      const r = rects[i];
      const cx = r.left + r.width / 2;
      // Document Y instead of viewport Y so the distance is stable
      // while the page is mid-smooth-scroll.
      const cy = r.top + r.height / 2 + scrollY;
      const d = Math.hypot(cx - origin.x, cy - origin.y);
      const finalDelay = Math.min(d * WIPE_SPEED, MAX_DELAY_MS);
      el.style.setProperty('--bk-d', `${Math.round(finalDelay)}ms`);
    });
  }, [view, drilldownTarget]);

  return (
    <CosmosWorkspaceShell
      rightActions={
        <button type="button" className="pill-btn pill-btn--primary">
          <span>Export kit</span>
          <ArrowRight size={14} className="pill-btn-arrow" />
        </button>
      }
    >
      <div className="shell">
        <BrandKitSidebar
          brand={brand}
          activeKey={activeKey}
          completed={completion.completed}
          total={completion.total}
          onJump={handleJump}
        />
        <div className="board-wrap bk-cosmos-board">
          <div ref={stageRef} className="bk-stage" data-active={view}>
            {/* Page 1 — sections list. Always mounted, always
                visible (modulo the per-tile wipe). */}
            <div className="bk-stage-layer bk-stage-layer--page1">
              {KIT_SECTIONS.map((s) => (
                <KitSection
                  key={s.key}
                  dataKey={s.key}
                  title={s.name}
                  sectionRef={setRef(s.key)}
                  onAdd={() =>
                    toast(`Add ${s.name}`, {
                      description: 'Creation flow lands here.',
                    })
                  }
                  onDownload={() =>
                    toast(`Download ${s.name}`, {
                      description: 'Export flow lands here.',
                    })
                  }
                >
                  <SectionGrid
                    sectionKey={s.key}
                    onPickCard={handlePickCard}
                    onEditCard={(t) => setEditorTarget(t)}
                    onDownloadCard={(t) =>
                      toast(`Download ${t.label}`, {
                        description: 'Export lands here.',
                      })
                    }
                  />
                </KitSection>
              ))}
            </div>
            {/* Page 2 — drilldown. Mounted on the first card click
                and stays in the DOM forever after (target updates
                in place). Lives behind page 1 with opacity 0 until
                the wipe reveals it. */}
            {drilldownTarget !== null && (
              <div className="bk-stage-layer bk-stage-layer--page2">
                <BrandKitDrilldown
                  target={drilldownTarget}
                  sourceBrand={sourceBrand}
                  onBack={exitDrilldown}
                  onPickVariant={(template) =>
                    setEditorTarget({ ...drilldownTarget, template })
                  }
                  onDownload={() =>
                    toast(`Download ${drilldownTarget.label}`, {
                      description: 'Export flow lands here.',
                    })
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <BrandKitCardEditor
        brand={brand}
        sourceBrand={sourceBrand}
        target={editorTarget}
        onClose={() => setEditorTarget(null)}
        onSave={(t) => {
          toast(`Saved ${t.label}`, {
            description: 'Persistence lands here.',
          });
          setEditorTarget(null);
        }}
        onDownload={(t) =>
          toast(`Download ${t.label}`, {
            description: 'Export lands here.',
          })
        }
      />
    </CosmosWorkspaceShell>
  );
}

type DrilldownProps = {
  target: EditorTarget;
  sourceBrand?: Brand;
  onBack: (origin?: Origin) => void;
  onPickVariant: (template?: BrandKitTemplate) => void;
  onDownload: () => void;
};

/**
 * Drilldown — Page 2 = a folder view of what's inside the picked
 * card. ONE header at the top (Back · card title · download) and
 * ONE continuous 3-column grid of variant tiles flowing
 * top-to-bottom with no section breaks. Reads as a single folder
 * the user opened by clicking the card.
 *
 * Variants come from the legacy brandkit library via
 * `legacy-mapping.ts`: each cosmos card resolves to a moduleId,
 * and the drilldown shows that module's real templates. When
 * a `sourceBrand` is supplied each tile renders the template's
 * live design (BusinessCardRenderer / MockupRenderer / etc.)
 * — the same render the legacy `/b/:slug/brandkit/<id>` page
 * uses, just framed in our cosmos shell. Cards with no legacy
 * counterpart fall back to the shared cover image.
 */
function BrandKitDrilldown({
  target,
  sourceBrand,
  onBack,
  onPickVariant,
  onDownload,
}: DrilldownProps) {
  const templates = target.templates ?? [];
  const hasTemplates = templates.length > 0;

  return (
    <div className="bk-drilldown">
      <div className="bk-drilldown-head">
        <div className="bk-drilldown-pill">
          <button
            type="button"
            className="bk-drilldown-back"
            onClick={(e) => {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              onBack({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
            }}
            aria-label={`Back to ${SECTION_LABELS[target.sectionKey]}`}
            title={`Back to ${SECTION_LABELS[target.sectionKey]}`}
          >
            <BackArrow />
            <span>Back</span>
          </button>
          <h1 className="bk-drilldown-title">{target.label}</h1>
        </div>
        <div className="bk-drilldown-actions">
          <button
            type="button"
            className="section-add section-download"
            onClick={onDownload}
            aria-label={`Download ${target.label}`}
            title={`Download ${target.label}`}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>
      </div>
      <div className="bk-drilldown-grid">
        {hasTemplates
          ? templates.map((tpl) => (
              <figure key={tpl.id} className="bk-variant-card">
                <button
                  type="button"
                  className="bk-variant-tile"
                  onClick={() => onPickVariant(tpl)}
                  aria-label={`Open ${tpl.name}`}
                >
                  {sourceBrand ? (
                    <span className="bk-variant-tile-render" aria-hidden>
                      {renderTemplateDesign(tpl, sourceBrand)}
                    </span>
                  ) : (
                    <span
                      className="bk-variant-tile-cover"
                      style={{ backgroundImage: `url(${target.cover})` }}
                      aria-hidden
                    />
                  )}
                </button>
                <figcaption className="bk-variant-label">{tpl.name}</figcaption>
              </figure>
            ))
          : // Fallback for cards with no legacy counterpart yet (e.g. some
            // web/qr-code cards): keep the placeholder shape so the
            // drilldown always renders something.
            Array.from({ length: 12 }, (_, i) => {
              const label = `${target.label} ${String(i + 1).padStart(2, '0')}`;
              return (
                <figure key={i} className="bk-variant-card">
                  <button
                    type="button"
                    className="bk-variant-tile"
                    onClick={() => onPickVariant()}
                    aria-label={`Open ${label}`}
                  >
                    <span
                      className="bk-variant-tile-cover"
                      style={{ backgroundImage: `url(${target.cover})` }}
                      aria-hidden
                    />
                  </button>
                  <figcaption className="bk-variant-label">{label}</figcaption>
                </figure>
              );
            })}
      </div>
    </div>
  );
}

function BackArrow() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

export default BrandKitCosmosPage;
