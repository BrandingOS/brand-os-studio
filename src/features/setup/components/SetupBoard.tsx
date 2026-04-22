import { useCallback, useEffect, useRef, useState } from 'react';
import type { BrandColor, MockBrand } from '../data/mockBrand';
import { ICON_MAP } from './SetupIcons';
import { ColorPickerHSV } from './ColorPickerHSV';
import { IconsMarquee } from './IconsMarquee';
import type { SectionKey } from './SetupSidebar';

type ColorGroupKey = 'core' | 'accent' | 'grey';

type PhotoSlot = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
type SlotRect = { row: number; col: number; rowSpan: number; colSpan: number };

const SLOT_RECTS: Record<PhotoSlot, SlotRect> = {
  A: { row: 1, col: 1, rowSpan: 2, colSpan: 2 },
  B: { row: 1, col: 3, rowSpan: 1, colSpan: 1 },
  C: { row: 1, col: 4, rowSpan: 1, colSpan: 1 },
  D: { row: 2, col: 3, rowSpan: 2, colSpan: 2 },
  E: { row: 3, col: 1, rowSpan: 1, colSpan: 1 },
  F: { row: 3, col: 2, rowSpan: 1, colSpan: 1 },
};

const SLOT_ORDER: PhotoSlot[] = ['A', 'B', 'C', 'D', 'E', 'F'];

const BENTO_ROWS = 3;
const BENTO_COLS = 4;
const CORNER_R = 0.07; // rounded corner radius in cell units (≈14px for 200px cells)

type EmptyRegion = {
  bbox: SlotRect;
  /** Rounded-corner SVG path that traces the exact outline of the region. */
  outline: string;
  /** % offsets inside bbox where the + icon should sit. */
  plusLeft: number;
  plusTop: number;
  /** True when the region is a single axis-aligned rectangle (no internal notches). */
  isRect: boolean;
};

// Find connected regions of empty slots at the cell level and trace each
// region's actual outline — adjacent empties become one coherent shape,
// even when the union is an L / Γ / Z (which a single rect can't express).
function emptyRegions(emptySlots: Set<PhotoSlot>): EmptyRegion[] {
  const empty: boolean[][] = Array.from({ length: BENTO_ROWS }, () =>
    new Array(BENTO_COLS).fill(false),
  );
  for (const slot of emptySlots) {
    const { row, col, rowSpan, colSpan } = SLOT_RECTS[slot];
    for (let r = row - 1; r < row - 1 + rowSpan; r++) {
      for (let c = col - 1; c < col - 1 + colSpan; c++) {
        empty[r][c] = true;
      }
    }
  }

  const visited: boolean[][] = Array.from({ length: BENTO_ROWS }, () =>
    new Array(BENTO_COLS).fill(false),
  );
  const regions: EmptyRegion[] = [];

  for (let r0 = 0; r0 < BENTO_ROWS; r0++) {
    for (let c0 = 0; c0 < BENTO_COLS; c0++) {
      if (!empty[r0][c0] || visited[r0][c0]) continue;
      // Flood-fill the component.
      const cells: Array<{ row: number; col: number }> = [];
      const stack = [{ row: r0, col: c0 }];
      while (stack.length) {
        const cell = stack.pop()!;
        const { row, col } = cell;
        if (row < 0 || row >= BENTO_ROWS || col < 0 || col >= BENTO_COLS) continue;
        if (!empty[row][col] || visited[row][col]) continue;
        visited[row][col] = true;
        cells.push(cell);
        stack.push(
          { row: row + 1, col },
          { row: row - 1, col },
          { row, col: col + 1 },
          { row, col: col - 1 },
        );
      }

      let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
      for (const { row, col } of cells) {
        if (row < minR) minR = row;
        if (col < minC) minC = col;
        if (row > maxR) maxR = row;
        if (col > maxC) maxC = col;
      }
      const bbox: SlotRect = {
        row: minR + 1,
        col: minC + 1,
        rowSpan: maxR - minR + 1,
        colSpan: maxC - minC + 1,
      };

      // Collect boundary edges in bbox-local cell coordinates.
      const inRegion = new Set(cells.map((c) => `${c.row},${c.col}`));
      type Edge = { x1: number; y1: number; x2: number; y2: number };
      const edges: Edge[] = [];
      for (const { row, col } of cells) {
        const lr = row - minR;
        const lc = col - minC;
        if (!inRegion.has(`${row - 1},${col}`))
          edges.push({ x1: lc, y1: lr, x2: lc + 1, y2: lr });
        if (!inRegion.has(`${row},${col + 1}`))
          edges.push({ x1: lc + 1, y1: lr, x2: lc + 1, y2: lr + 1 });
        if (!inRegion.has(`${row + 1},${col}`))
          edges.push({ x1: lc + 1, y1: lr + 1, x2: lc, y2: lr + 1 });
        if (!inRegion.has(`${row},${col - 1}`))
          edges.push({ x1: lc, y1: lr + 1, x2: lc, y2: lr });
      }

      const isRect =
        cells.length === bbox.rowSpan * bbox.colSpan;

      const outline = isRect ? '' : buildOutline(edges);

      // Place the + at the region's polygon centroid (mean of cell centers) —
      // stays visually centered for rectangles, L-shapes, and Γ-shapes alike.
      const avgColCenter = cells.reduce((s, c) => s + c.col + 0.5, 0) / cells.length;
      const avgRowCenter = cells.reduce((s, c) => s + c.row + 0.5, 0) / cells.length;
      const plusLeft = ((avgColCenter - minC) / bbox.colSpan) * 100;
      const plusTop = ((avgRowCenter - minR) / bbox.rowSpan) * 100;

      regions.push({ bbox, outline, plusLeft, plusTop, isRect });
    }
  }

  return regions;
}

// Walk unordered boundary edges into a closed path with rounded corners.
function buildOutline(edges: Array<{ x1: number; y1: number; x2: number; y2: number }>): string {
  if (!edges.length) return '';
  // Build directed adjacency: each vertex points to edges that start there.
  // Each edge is directed so the region is on its right (clockwise walk).
  // Since we emitted edges in CW per-cell order, this already holds.
  const byStart = new Map<string, typeof edges>();
  const key = (x: number, y: number) => `${x},${y}`;
  for (const e of edges) {
    const k = key(e.x1, e.y1);
    if (!byStart.has(k)) byStart.set(k, []);
    byStart.get(k)!.push(e);
  }

  const usedEdges = new Set<(typeof edges)[number]>();
  const parts: string[] = [];

  for (const startEdge of edges) {
    if (usedEdges.has(startEdge)) continue;
    const verts: Array<[number, number]> = [[startEdge.x1, startEdge.y1]];
    let cur = startEdge;
    let guard = 0;
    while (guard++ < 1000) {
      usedEdges.add(cur);
      verts.push([cur.x2, cur.y2]);
      const outs = byStart.get(key(cur.x2, cur.y2)) || [];
      const next = outs.find((e) => !usedEdges.has(e));
      if (!next) break;
      cur = next;
    }
    // Strip redundant collinear mid-vertices to clean the path.
    const simplified: Array<[number, number]> = [];
    for (const v of verts) {
      const n = simplified.length;
      if (n >= 2) {
        const [ax, ay] = simplified[n - 2];
        const [bx, by] = simplified[n - 1];
        if ((bx - ax) * (v[1] - by) === (by - ay) * (v[0] - bx)) {
          simplified[n - 1] = v;
          continue;
        }
      }
      simplified.push(v);
    }
    // First and last should be equal for a closed loop; drop the duplicate.
    if (
      simplified.length > 1 &&
      simplified[0][0] === simplified[simplified.length - 1][0] &&
      simplified[0][1] === simplified[simplified.length - 1][1]
    ) {
      simplified.pop();
    }
    parts.push(roundedPath(simplified));
  }

  return parts.join(' ');
}

// Given ordered polygon vertices, emit an SVG path with rounded corners.
function roundedPath(verts: Array<[number, number]>): string {
  const n = verts.length;
  if (n < 3) return '';
  const r = CORNER_R;
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const prev = verts[(i - 1 + n) % n];
    const cur = verts[i];
    const next = verts[(i + 1) % n];

    // Unit vector from prev → cur and cur → next.
    const dInX = cur[0] - prev[0];
    const dInY = cur[1] - prev[1];
    const dInLen = Math.hypot(dInX, dInY) || 1;
    const uInX = dInX / dInLen;
    const uInY = dInY / dInLen;

    const dOutX = next[0] - cur[0];
    const dOutY = next[1] - cur[1];
    const dOutLen = Math.hypot(dOutX, dOutY) || 1;
    const uOutX = dOutX / dOutLen;
    const uOutY = dOutY / dOutLen;

    const maxR = Math.min(r, dInLen / 2, dOutLen / 2);

    const startX = cur[0] - uInX * maxR;
    const startY = cur[1] - uInY * maxR;
    const endX = cur[0] + uOutX * maxR;
    const endY = cur[1] + uOutY * maxR;

    const fmt = (n: number) => Number(n.toFixed(4)).toString();

    if (i === 0) {
      parts.push(`M ${fmt(startX)} ${fmt(startY)}`);
    } else {
      parts.push(`L ${fmt(startX)} ${fmt(startY)}`);
    }
    // sweep-flag: 1 for convex (right-turn) CW walk, 0 for concave (left-turn).
    const cross = uInX * uOutY - uInY * uOutX;
    const sweep = cross > 0 ? 1 : 0;
    parts.push(
      `A ${fmt(maxR)} ${fmt(maxR)} 0 0 ${sweep} ${fmt(endX)} ${fmt(endY)}`,
    );
  }
  parts.push('Z');
  return parts.join(' ');
}

function rectStyle(rect: SlotRect): React.CSSProperties {
  return {
    gridRow: `${rect.row} / span ${rect.rowSpan}`,
    gridColumn: `${rect.col} / span ${rect.colSpan}`,
  };
}

function CopyIcon() {
  return (
    <svg
      className="swatch-copy-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

/** Relative luminance check — swatches with light bg get dark text. */
function isLightHex(hex: string): boolean {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return l > 0.6;
}

function Section({
  dataKey,
  title,
  spec,
  onEdit,
  sectionRef,
  children,
}: {
  dataKey: SectionKey;
  title: string;
  spec: string;
  onEdit?: () => void;
  sectionRef?: (el: HTMLElement | null) => void;
  children: React.ReactNode;
}) {
  return (
    <section ref={sectionRef} className="section" data-key={dataKey}>
      <div className="section-header">
        <h2>{title}</h2>
        <span className="section-spec">{spec}</span>
        <div className="section-actions">
          <button
            type="button"
            className="section-add"
            onClick={onEdit}
            aria-label="Add to section"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M12 5 L12 19" />
              <path d="M5 12 L19 12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="section-body">{children}</div>
    </section>
  );
}

export type SetupBoardRefs = Partial<Record<SectionKey, HTMLElement | null>>;

type Props = {
  brand: MockBrand;
  onEdit: (key: SectionKey) => void;
  sectionRefs: React.MutableRefObject<SetupBoardRefs>;
  onUpdateColor: (group: ColorGroupKey, index: number, hex: string) => void;
  onDeleteLogo?: (id: string) => void;
  onReplaceLogo?: (id: string) => void;
  onDeletePhoto?: (id: string) => void;
  onReplacePhoto?: (id: string) => void;
};

export function SetupBoard({
  brand,
  onEdit,
  sectionRefs,
  onUpdateColor,
  onDeleteLogo,
  onReplaceLogo,
  onDeletePhoto,
  onReplacePhoto,
}: Props) {
  const setRef = (key: SectionKey) => (el: HTMLElement | null) => {
    sectionRefs.current[key] = el;
  };

  const iconMap = ICON_MAP();

  return (
    <main className="board-wrap" id="board">
      <header className="board-head">
        <div className="board-meta">
          <span className="board-live-dot" aria-hidden="true" />
          <span>
            <b>Live</b> preview
          </span>
        </div>
      </header>

      {/* ─── Logo ─── */}
      <Section sectionRef={setRef('logo')} dataKey="logo" title="Logo" spec="Primary · Variants" onEdit={() => onEdit('logo')}>
        <div className="logos">
          {brand.logos.map((logo) => (
            <div
              key={logo.id}
              className={`logo-tile${logo.variant === 'dark' ? ' is-dark' : ''}`}
              aria-label={logo.label}
            >
              <span
                className="logo-svg"
                dangerouslySetInnerHTML={{ __html: logo.svg }}
                style={{ display: 'block', width: '100%', height: '100%' }}
              />
              {(onDeleteLogo || onReplaceLogo) && (
                <div className="logo-tile-actions">
                  {onReplaceLogo && (
                    <button
                      type="button"
                      className="logo-tile-action"
                      aria-label="Replace logo"
                      onClick={() => onReplaceLogo(logo.id)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <polyline points="23 4 23 10 17 10" />
                        <polyline points="1 20 1 14 7 14" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
                        <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
                      </svg>
                    </button>
                  )}
                  {onDeleteLogo && (
                    <button
                      type="button"
                      className="logo-tile-action"
                      aria-label="Delete logo"
                      onClick={() => onDeleteLogo(logo.id)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M3 6h18" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          <button type="button" className="logo-tile is-empty" onClick={() => onEdit('logo')} aria-label="Add logo variant">
            <svg className="logo-tile-dash" aria-hidden="true">
              <rect />
            </svg>
            <span className="logo-tile-plus" aria-hidden="true">
              +
            </span>
          </button>
        </div>
      </Section>

      {/* ─── Color ─── */}
      <Section sectionRef={setRef('colors')} dataKey="colors" title="Color" spec="Core · Accent · Grey" onEdit={() => onEdit('colors')}>
        <div className="colors-stack">
          <ColorsGroup
            groupKey="core"
            layout="core"
            title="Core Colors"
            colors={brand.colors.core}
            onUpdateColor={onUpdateColor}
          />
          <ColorsGroup
            groupKey="accent"
            layout="accent"
            title="Accent Colors"
            colors={brand.colors.accent}
            onUpdateColor={onUpdateColor}
          />
          <ColorsGroup
            groupKey="grey"
            layout="grey"
            title="Neutral Colors"
            colors={brand.colors.grey}
            onUpdateColor={onUpdateColor}
          />
        </div>
      </Section>

      {/* ─── Typography ─── */}
      <Section sectionRef={setRef('fonts')} dataKey="fonts" title="Typography" spec="Display · Text" onEdit={() => onEdit('fonts')}>
        <div className="type-system">
          <TypeRow
            label="Display"
            family={brand.fonts.display.family}
            fallback={brand.fonts.display.fallback}
            weights={brand.fonts.display.weights}
            displayStyle={{ fontStyle: 'italic', fontWeight: 400 }}
          />
          <TypeRow
            label="Text"
            family={brand.fonts.text.family}
            fallback={brand.fonts.text.fallback}
            weights={brand.fonts.text.weights}
            displayStyle={{ fontWeight: 500 }}
          />
        </div>
      </Section>

      {/* ─── Iconography ─── */}
      <Section sectionRef={setRef('icons')} dataKey="icons" title="Iconography" spec="24 × 24px" onEdit={() => onEdit('icons')}>
        <IconsMarquee
          icons={brand.icons}
          iconMap={iconMap as Record<string, (p: { size?: number }) => JSX.Element>}
        />
      </Section>

      {/* ─── Photography ─── */}
      <Section sectionRef={setRef('photos')} dataKey="photos" title="Photography" spec="Imagery & style" onEdit={() => onEdit('photos')}>
        {(() => {
          const photoBySlot = new Map<PhotoSlot, (typeof brand.photos)[number]>(
            brand.photos.map((p) => [p.slot, p]),
          );
          const emptySlots = new Set<PhotoSlot>(
            SLOT_ORDER.filter((k) => !photoBySlot.has(k)),
          );
          const regions = emptyRegions(emptySlots);
          return (
            <div className="photos photos-bento">
              {SLOT_ORDER.map((slot) => {
                const photo = photoBySlot.get(slot);
                if (!photo) return null;
                return (
                  <div key={photo.id} className="photo-tile" style={rectStyle(SLOT_RECTS[slot])}>
                    <img src={photo.src} alt="" loading="lazy" />
                    {(onDeletePhoto || onReplacePhoto) && (
                      <div className="photo-tile-actions">
                        {onReplacePhoto && (
                          <button
                            type="button"
                            className="photo-tile-action"
                            aria-label="Replace image"
                            onClick={() => onReplacePhoto(photo.id)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <polyline points="23 4 23 10 17 10" />
                              <polyline points="1 20 1 14 7 14" />
                              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
                              <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
                            </svg>
                          </button>
                        )}
                        {onDeletePhoto && (
                          <button
                            type="button"
                            className="photo-tile-action"
                            aria-label="Delete image"
                            onClick={() => onDeletePhoto(photo.id)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M3 6h18" />
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {regions.map((region, i) => (
                <button
                  key={`slot-${region.bbox.row}-${region.bbox.col}-${i}`}
                  type="button"
                  className="photo-tile is-slot"
                  style={rectStyle(region.bbox)}
                  onClick={() => onEdit('photos')}
                  aria-label="Add photo"
                >
                  {region.isRect ? (
                    <svg className="photo-tile-dash" aria-hidden="true">
                      <rect />
                    </svg>
                  ) : (
                    <svg
                      className="photo-tile-dash photo-tile-dash-shape"
                      viewBox={`0 0 ${region.bbox.colSpan} ${region.bbox.rowSpan}`}
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <path d={region.outline} />
                    </svg>
                  )}
                  <span
                    className="photo-tile-plus"
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: `${region.plusLeft}%`,
                      top: `${region.plusTop}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M12 5 L12 19" />
                      <path d="M5 12 L19 12" />
                    </svg>
                  </span>
                </button>
              ))}
            </div>
          );
        })()}
      </Section>

      {/* ─── Website ─── */}
      <Section sectionRef={setRef('website')} dataKey="website" title="Website" spec="Reference" onEdit={() => onEdit('website')}>
        <div className="website-frame">
          <div className="website-chrome">
            <span className="chrome-dot" />
            <span className="chrome-dot" />
            <span className="chrome-dot" />
            <span className="chrome-url">{brand.website.url}</span>
          </div>
          <div className="website-body">
            <div className="website-fallback">
              <div className="website-fallback-mark">{brand.name.charAt(0)}</div>
              <div className="website-fallback-url">{brand.website.url}</div>
            </div>
          </div>
        </div>
      </Section>

      {/* ─── Voice & Tone ─── */}
      <Section sectionRef={setRef('voice')} dataKey="voice" title="Voice & Tone" spec="How we sound" onEdit={() => onEdit('voice')}>
        <div className="voice-block">
          <p className="voice-essay">{brand.voice.essay}</p>
          <div className="voice-card">
            <h3>Pillars</h3>
            <p>Four words our copy returns to — the North Star for tone.</p>
            <div className="voice-pills">
              {brand.voice.pillars.map((p) => (
                <span key={p} className="voice-pill">
                  {p}
                </span>
              ))}
            </div>
          </div>
          <div className="voice-card">
            <h3>Tone range</h3>
            <p>Warm but precise. We drop jargon, keep rigor. We sound like a thoughtful friend who knows the subject cold.</p>
          </div>
        </div>
      </Section>
    </main>
  );
}

type CopyFlash = { id: number; text: string; x: number; y: number };

function ColorsGroup({
  groupKey,
  layout,
  title,
  colors,
  onUpdateColor,
}: {
  groupKey: ColorGroupKey;
  layout: 'core' | 'accent' | 'grey';
  title: string;
  colors: BrandColor[];
  onUpdateColor: (group: ColorGroupKey, index: number, hex: string) => void;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [displayedIndex, setDisplayedIndex] = useState<number | null>(null);
  const [previewHex, setPreviewHex] = useState<string | null>(null);
  const [flash, setFlash] = useState<CopyFlash | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  // Outside click + Escape close the picker and revert the preview.
  useEffect(() => {
    if (activeIndex == null) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (groupRef.current?.contains(target)) return;
      setActiveIndex(null);
      setPreviewHex(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveIndex(null);
        setPreviewHex(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [activeIndex]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Keep the picker mounted through the close transition (max-height 420ms).
  // When activeIndex is set we mirror it immediately; when it clears we wait
  // for the fade-out to finish before unmounting so the content doesn't
  // vanish on an empty collapsing box.
  useEffect(() => {
    if (activeIndex != null) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setDisplayedIndex(activeIndex);
      return;
    }
    if (displayedIndex == null) return;
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setDisplayedIndex(null);
      closeTimerRef.current = null;
    }, 440);
  }, [activeIndex, displayedIndex]);

  const handleSwatchClick = useCallback(
    (i: number) => {
      setActiveIndex((prev) => {
        if (prev === i) {
          setPreviewHex(null);
          return null;
        }
        setPreviewHex(null);
        return i;
      });
    },
    [],
  );

  const handleCopy = useCallback(async (text: string, anchor: HTMLElement) => {
    const ok = await copyToClipboard(text);
    if (!ok) return;
    const rect = anchor.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;
    const id = Date.now() + Math.random();
    setFlash({ id, text: 'Copied!', x, y });
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setFlash(null), 1200);
  }, []);

  const handleCommit = useCallback(
    (hex: string) => {
      if (activeIndex == null) return;
      onUpdateColor(groupKey, activeIndex, hex);
      setActiveIndex(null);
      setPreviewHex(null);
    },
    [activeIndex, groupKey, onUpdateColor],
  );

  const activeColor = activeIndex != null ? colors[activeIndex] : null;
  const displayedColor = displayedIndex != null ? colors[displayedIndex] : activeColor;
  const pickerIndex = activeIndex ?? displayedIndex;

  return (
    <div className="colors-group" ref={groupRef}>
      <p className="colors-group-title">{title}</p>
      <div className="colors-row" data-layout={layout}>
        {colors.map((c, i) => {
          const renderedHex = activeIndex === i && previewHex ? previewHex : c.hex;
          const light = isLightHex(renderedHex);
          const isActive = activeIndex === i;
          return (
            <button
              key={`${c.hex}-${i}`}
              type="button"
              className={`swatch${light ? ' is-light' : ''}${isActive ? ' is-active' : ''}`}
              style={{ background: renderedHex, zIndex: i + 1 }}
              aria-label={`Edit ${c.name} ${renderedHex}`}
              aria-expanded={isActive}
              onClick={(e) => {
                e.stopPropagation();
                handleSwatchClick(i);
              }}
            >
              <span
                className="swatch-name"
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(c.name, e.currentTarget);
                }}
              >
                {c.name}
                <CopyIcon />
              </span>
              <span
                className="swatch-hex"
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(renderedHex.toUpperCase(), e.currentTarget);
                }}
              >
                {renderedHex.toUpperCase()}
                <CopyIcon />
              </span>
            </button>
          );
        })}
      </div>
      <div className={`cp-expand${activeIndex != null ? ' is-open' : ''}`} aria-hidden={activeIndex == null}>
        {displayedColor && pickerIndex != null && (
          <ColorPickerHSV
            key={`${groupKey}-${pickerIndex}-${displayedColor.hex}`}
            hex={displayedColor.hex}
            onChange={(hex) => setPreviewHex(hex)}
            onCommit={handleCommit}
            onCancel={() => {
              setActiveIndex(null);
              setPreviewHex(null);
            }}
          />
        )}
      </div>
      {flash && (
        <div
          className="copy-flash is-on"
          style={{ left: flash.x, top: flash.y }}
          role="status"
          aria-live="polite"
        >
          {flash.text}
        </div>
      )}
    </div>
  );
}

type FontWeight = { label: string; value: number; italic?: boolean };

const FONT_WEIGHTS: Record<string, FontWeight[]> = {
  'Instrument Serif': [
    { label: 'Regular', value: 400 },
    { label: 'Italic', value: 400, italic: true },
  ],
  'Playfair Display': [
    { label: 'Regular', value: 400 },
    { label: 'Medium', value: 500 },
    { label: 'SemiBold', value: 600 },
    { label: 'Bold', value: 700 },
    { label: 'Black', value: 900 },
  ],
  'DM Serif Display': [
    { label: 'Regular', value: 400 },
    { label: 'Italic', value: 400, italic: true },
  ],
  Fraunces: [
    { label: 'Thin', value: 100 },
    { label: 'Light', value: 300 },
    { label: 'Regular', value: 400 },
    { label: 'Medium', value: 500 },
    { label: 'SemiBold', value: 600 },
    { label: 'Bold', value: 700 },
    { label: 'Black', value: 900 },
  ],
  Inter: [
    { label: 'Thin', value: 100 },
    { label: 'Light', value: 300 },
    { label: 'Regular', value: 400 },
    { label: 'Medium', value: 500 },
    { label: 'SemiBold', value: 600 },
    { label: 'Bold', value: 700 },
    { label: 'Black', value: 900 },
  ],
  'Space Grotesk': [
    { label: 'Light', value: 300 },
    { label: 'Regular', value: 400 },
    { label: 'Medium', value: 500 },
    { label: 'SemiBold', value: 600 },
    { label: 'Bold', value: 700 },
  ],
  'JetBrains Mono': [
    { label: 'Thin', value: 100 },
    { label: 'Light', value: 300 },
    { label: 'Regular', value: 400 },
    { label: 'Medium', value: 500 },
    { label: 'Bold', value: 700 },
  ],
};

const DEFAULT_WEIGHTS: FontWeight[] = [
  { label: 'Light', value: 300 },
  { label: 'Regular', value: 400 },
  { label: 'Medium', value: 500 },
  { label: 'SemiBold', value: 600 },
  { label: 'Bold', value: 700 },
];

const SPECIMEN_SENTENCE = 'The professional standard';

function resolveWeights(family: string): FontWeight[] {
  return FONT_WEIGHTS[family] ?? DEFAULT_WEIGHTS;
}

function TypeRow({
  label,
  family,
  fallback,
}: {
  label: string;
  family: string;
  fallback?: string;
  weights?: string;
  displayStyle?: React.CSSProperties;
}) {
  const fontStack = `"${family}", ${fallback ?? (label === 'Display' ? 'serif' : 'sans-serif')}`;
  const weightList = resolveWeights(family);
  return (
    <div className="type-row" style={{ fontFamily: fontStack }}>
      <div className="type-col type-col--identity">
        <p className="type-col-label">{label}</p>
        <h3 className="type-name">{family}</h3>
        <div className="type-glyphs">
          <p className="type-glyph type-glyph--lower">abcdefghijklmnopqrstuvwxyz</p>
          <p className="type-glyph type-glyph--upper">ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
          <p className="type-glyph type-glyph--num">0 1 2 3 4 5 6 7 8 9</p>
        </div>
      </div>
      <div className="type-col type-col--weights">
        <p className="type-col-label">Weight</p>
        <ul className="type-list type-weights">
          {weightList.map((w, i) => (
            <li
              key={`${w.value}-${w.italic ? 'i' : 'r'}-${i}`}
              data-weight={w.value}
              style={{ fontWeight: w.value, fontStyle: w.italic ? 'italic' : undefined }}
            >
              {w.label}
            </li>
          ))}
        </ul>
      </div>
      <div className="type-col type-col--examples">
        <p className="type-col-label">Example</p>
        <ul className="type-list type-examples">
          {weightList.map((w, i) => (
            <li
              key={`${w.value}-${w.italic ? 'i' : 'r'}-${i}`}
              data-weight={w.value}
              style={{ fontWeight: w.value, fontStyle: w.italic ? 'italic' : undefined }}
            >
              {SPECIMEN_SENTENCE}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
