import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { DsEyebrow, DsSkeleton } from '@/shared/ds';
import type { BrandColor, MockBrand } from '../data/mockBrand';
import { ICON_MAP } from './SetupIcons';
import { ColorPickerHSV } from './ColorPickerHSV';
import { IconsMarquee } from './IconsMarquee';
import type { SectionKey } from './SetupSidebar';
import { CopyIcon, type OrganicIconHandle } from './organic-icons';
import { ContextMenu, type ContextMenuState } from './ContextMenu';
import { hexToName } from '../data/colorNames';
import { STRATEGY_CARDS, contentOf, type StrategyKey } from '../data/strategyCards';
import { ADDABLE_LOGO_ROLES } from '@/shared/brand/logoRoles';
import { TILE_ID_BY_ROLE } from '../data/logoBoard';
import { LinkCard } from '@/shared/brand/LinkCard';
import type { SitePreview } from '@/shared/brand/sitePreview';
import type { LogoRole } from '@/shared/types/brandAssets';

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

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp', 'heic'];

/** Some browsers (and some OS file managers) drop files with an empty
 *  `type` — falling back to the extension keeps drag-drop working when
 *  the MIME header is missing. */
function isImageFile(file: File): boolean {
  if (file.type && file.type.startsWith('image/')) return true;
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

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
/**
 * The logo variants a tile can be reassigned to (right-click → Change logo type).
 *
 * Derived from `shared/brand/logoRoles`, which is the ONE list — the review
 * board reads the same one, so a variant named there is the variant named here
 * and neither can drift. The tile ids are Setup's own (`mapLogos` builds tiles
 * with them); the label, the ground and the canonical role all come from the
 * shared definition.
 */
export const LOGO_ROLES: Array<{
  id: string;
  label: string;
  variant: 'light' | 'dark';
  role: LogoRole;
}> = ADDABLE_LOGO_ROLES.map((d) => ({
  id: TILE_ID_BY_ROLE[d.role] ?? d.slot,
  label: d.label,
  variant: d.tone,
  role: d.role,
}));

function isLightHex(hex: string): boolean {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return l > 0.6;
}

/**
 * One free-text brand field.
 *
 * Commits on blur and on Enter rather than on every keystroke: the page
 * persists 400ms after the last change, and a per-character save of the NAME
 * would ask the database to regenerate the slug — and the URL with it — once
 * per letter typed.
 *
 * Escape abandons the edit. It has to mark itself cancelled before restoring,
 * because restoring causes the blur that would otherwise commit the very text
 * the user just asked to throw away.
 */
function BrandField({
  label,
  value,
  placeholder,
  hint,
  onCommit,
}: {
  label: string;
  value: string;
  placeholder: string;
  hint?: string;
  onCommit?: (next: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const cancelled = useRef(false);

  // Follow the brand when it changes underneath us (a save elsewhere, a
  // different brand) — but never while the user is mid-edit.
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);

  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false;
      setDraft(value);
      return;
    }
    const next = draft.trim();
    if (next && next !== value) onCommit?.(next);
    else setDraft(value);
  };

  /*
   * The hint is DESCRIBED-BY, not part of the label.
   *
   * It used to sit inside the <label>, which made the field's accessible name
   * "Slogan Also editable under Brand Strategy — one value, two ways in." —
   * i.e. a screen reader announced a sentence of trivia every time the field
   * took focus, and nothing could address the field by its actual name.
   */
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className="brand-field">
      <label className="brand-field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hint ? hintId : undefined}
        className="brand-field-input"
        value={draft}
        placeholder={placeholder}
        disabled={!onCommit}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
          } else if (e.key === 'Escape') {
            cancelled.current = true;
            e.currentTarget.blur();
          }
        }}
      />
      {hint ? (
        <span id={hintId} className="brand-field-hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function Section({
  dataKey,
  title,
  spec,
  onEdit,
  onExport,
  sectionRef,
  addButtonAttrs,
  addSlot,
  hideAdd,
  collapsed,
  children,
}: {
  dataKey: SectionKey;
  title: string;
  spec: string;
  onEdit?: () => void;
  /** Download the section's data. Rendered as a tray-arrow button next
   *  to the + button. Omit to hide the download affordance. */
  onExport?: () => void;
  sectionRef?: (el: HTMLElement | null) => void;
  addButtonAttrs?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  /** Extra node rendered inside `.section-actions` — used to anchor a
   *  popover (e.g. the add-color picker) to the + button's position. */
  addSlot?: React.ReactNode;
  /** Hide the + button (useful while a popover anchored to it is open). */
  hideAdd?: boolean;
  /** Empty section: renders as a compact dashed drop bar and (via CSS
   *  order) sinks below the filled sections. Filling it restores the
   *  section to its normal place and size automatically. */
  collapsed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      ref={sectionRef}
      className={`section${collapsed ? ' is-collapsed' : ''}`}
      data-key={dataKey}
    >
      <div className="section-header">
        <h2>{title}</h2>
        <span className="section-spec">{spec}</span>
        <div className="section-actions">
          {addSlot}
          {onExport && (
            <button
              type="button"
              className="section-add section-download"
              onClick={onExport}
              aria-label={`Download ${title} as JSON`}
              title={`Download ${title}`}
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
          )}
          {!hideAdd && (
          <button
            type="button"
            className="section-add"
            onClick={onEdit}
            aria-label="Add to section"
            {...addButtonAttrs}
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
          )}
        </div>
      </div>
      <div className="section-body">
        {collapsed ? (
          <button type="button" className="section-collapsed-drop" onClick={onEdit}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M12 5 L12 19" />
              <path d="M5 12 L19 12" />
            </svg>
            <span>Add {title.toLowerCase()}</span>
          </button>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export type SetupBoardRefs = Partial<Record<SectionKey, HTMLElement | null>>;

type AddableColorGroup = Exclude<ColorGroupKey, 'grey'>;

type Props = {
  brand: MockBrand;
  onEdit: (key: SectionKey) => void;
  sectionRefs: React.MutableRefObject<SetupBoardRefs>;
  onUpdateColor: (group: ColorGroupKey, index: number, hex: string) => void;
  onAddColor?: (group: AddableColorGroup, hex: string) => void;
  onDeleteColor?: (group: ColorGroupKey, index: number) => void;
  onMoveColor?: (from: ColorGroupKey, to: ColorGroupKey, index: number) => void;
  /** Reorder within the Core group so the selected color takes the
   *  primary (index 0) or secondary (index 1) slot. Only invoked for
   *  the `core` group. */
  onSetColorRole?: (
    group: ColorGroupKey,
    index: number,
    role: 'primary' | 'secondary',
  ) => void;
  onDownloadColor?: (color: BrandColor) => void;
  onCopyText?: (text: string) => void;
  onDeleteLogo?: (id: string) => void;
  onReplaceLogo?: (id: string) => void;
  onDownloadLogo?: (logo: MockBrand['logos'][number]) => void;
  /** Reassign a logo to another role (primary / wordmark / mark / …). */
  onChangeLogoRole?: (id: string, roleId: string) => void;
  /** Promote a variant to Primary. The two tiles trade roles. */
  onSetPrimaryLogo?: (id: string) => void;
  /** Open the "which variant is this?" flow. */
  onAddLogoVariant?: () => void;
  onPreviewLogo?: (logo: MockBrand['logos'][number]) => void;
  onDeletePhoto?: (id: string) => void;
  onReplacePhoto?: (id: string) => void;
  onDownloadPhoto?: (photo: MockBrand['photos'][number]) => void;
  onPreviewPhoto?: (photo: MockBrand['photos'][number]) => void;
  onDeleteFont?: (id: string) => void;
  onReplaceFont?: (id: string) => void;
  onDownloadFont?: (font: MockBrand['fonts'][number]) => void;
  onDeleteIcon?: (name: string) => void;
  onDownloadIcon?: (name: string, anchor: HTMLElement) => void;
  canAddFont?: boolean;
  onDeleteWebsite?: (id: string) => void;
  onReplaceWebsite?: (id: string) => void;
  onAddWebsite?: () => void;
  canAddWebsite?: boolean;
  onEditAbout?: (id: string) => void;
  /** Change one of the eleven structured strategy answers. */
  onEditStrategy?: (key: StrategyKey) => void;
  /** Remove one of the brand's other addresses. */
  onDeleteLink?: (id: string) => void;
  /** Raise the preview drawer for a link. */
  onOpenLink?: (url: string, preview: SitePreview | null) => void;
  onDeleteAbout?: (id: string) => void;
  onDownloadAbout?: (entry: MockBrand['about'][number]) => void;
  /** Drag-drop passthrough — lets the empty logo / photo tiles accept
   *  image file drops directly without routing through the upload modal. */
  onDropFiles?: (kind: 'logo' | 'photos', files: File[]) => void;
  /** Rename the brand. A rename regenerates the slug server-side, so the
   *  caller is responsible for following the URL. */
  onChangeName?: (name: string) => void;
  /**
   * Rendered in the Brand Strategy section's header, beside the + button.
   *
   * A slot rather than a callback because what goes there is a control the
   * page owns (the Build-with-AI entry point); the board only knows where it
   * belongs.
   */
  strategyActions?: React.ReactNode;
  /** The brand's slogan — the same value the Brand Strategy card edits. */
  onChangeSlogan?: (slogan: string) => void;
  /** Per-section download handler. Omit to hide all download buttons. */
  onExport?: (key: SectionKey) => void;
};

export function SetupBoard({
  brand,
  onEdit,
  onChangeName,
  onChangeSlogan,
  sectionRefs,
  onUpdateColor,
  onAddColor,
  onDeleteColor,
  onMoveColor,
  onSetColorRole,
  onDownloadColor,
  onCopyText,
  onDeleteLogo,
  onReplaceLogo,
  onDownloadLogo,
  onChangeLogoRole,
  onSetPrimaryLogo,
  onAddLogoVariant,
  onPreviewLogo,
  onDeletePhoto,
  onReplacePhoto,
  onDownloadPhoto,
  onPreviewPhoto,
  onDeleteFont,
  onReplaceFont,
  onDownloadFont,
  onDeleteIcon,
  onDownloadIcon,
  canAddFont = true,
  onDeleteWebsite,
  onReplaceWebsite,
  onAddWebsite,
  canAddWebsite = true,
  onEditAbout,
  onEditStrategy,
  strategyActions,
  onDeleteLink,
  onOpenLink,
  onDeleteAbout,
  onDownloadAbout,
  onDropFiles,
  onExport,
}: Props) {
  const exportFor = (key: SectionKey): (() => void) | undefined =>
    onExport ? () => onExport(key) : undefined;

  // Right-click menu state shared across all card types. A null value
  // means no menu is open; setting a value moves/replaces an existing
  // menu to the new cursor coordinates.
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  // Element the active menu was triggered from. Gets the `is-ctx-active`
  // class so the card keeps its hover-lifted look while the menu is
  // open — the class is cleared in closeCtxMenu.
  const ctxAnchorRef = useRef<HTMLElement | null>(null);
  const closeCtxMenu = useCallback(() => {
    ctxAnchorRef.current?.classList.remove('is-ctx-active');
    ctxAnchorRef.current = null;
    setCtxMenu(null);
  }, []);
  // Only one card on the page should sit in its raised state at a time —
  // right-clicking a swatch should collapse any open HSV picker
  // elsewhere, and toggling an HSV picker should close any open
  // right-click menu. We coordinate via a custom event on window so
  // ColorsGroup's internal state and this board's ctx-menu state stay in
  // sync without either owning the other's data.
  const raiseSourceRef = useRef<number>(0);
  const notifyRaised = useCallback(() => {
    const id = ++raiseSourceRef.current;
    window.dispatchEvent(
      new CustomEvent('brand-os:card-raised', { detail: { id, scope: 'ctx' } }),
    );
  }, []);
  useEffect(() => {
    const onRaised = (e: Event) => {
      const detail = (e as CustomEvent<{ id: number; scope: string }>).detail;
      if (detail.scope !== 'ctx') closeCtxMenu();
    };
    window.addEventListener('brand-os:card-raised', onRaised);
    return () => window.removeEventListener('brand-os:card-raised', onRaised);
  }, [closeCtxMenu]);
  const markAnchor = useCallback(
    (el: HTMLElement | null) => {
      if (ctxAnchorRef.current && ctxAnchorRef.current !== el) {
        ctxAnchorRef.current.classList.remove('is-ctx-active');
      }
      ctxAnchorRef.current = el;
      el?.classList.add('is-ctx-active');
      notifyRaised();
    },
    [notifyRaised],
  );
  const openColorMenu = (
    e: React.MouseEvent,
    color: BrandColor,
    group: ColorGroupKey,
    index: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    markAnchor(e.currentTarget as HTMLElement);
    const hex = color.hex.toUpperCase();
    const groupLabel: Record<ColorGroupKey, string> = {
      core: 'Core',
      accent: 'Accent',
      grey: 'Grey',
    };
    const moveTargets: ColorGroupKey[] = (['core', 'accent'] as const).filter(
      (g) => g !== group,
    );
    const items: ContextMenuState['items'] = [];
    if (onCopyText) {
      items.push({
        label: 'Copy hex',
        onSelect: () => onCopyText(hex),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="9" x2="20" y2="9" />
            <line x1="4" y1="15" x2="20" y2="15" />
            <line x1="10" y1="3" x2="8" y2="21" />
            <line x1="16" y1="3" x2="14" y2="21" />
          </svg>
        ),
      });
      items.push({
        label: 'Copy name',
        onSelect: () => onCopyText(color.name),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7V5h16v2" />
            <path d="M9 20h6" />
            <path d="M12 5v15" />
          </svg>
        ),
      });
    }
    if (onSetColorRole && group === 'core') {
      const roles: Array<{ role: 'primary' | 'secondary'; targetIndex: number; label: string }> = [
        { role: 'primary', targetIndex: 0, label: 'Set as Primary' },
        { role: 'secondary', targetIndex: 1, label: 'Set as Secondary' },
      ];
      for (const r of roles) {
        const isCurrent = index === r.targetIndex;
        items.push({
          label: isCurrent ? `${r.label} (current)` : r.label,
          disabled: isCurrent,
          onSelect: () => onSetColorRole(group, index, r.role),
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {r.role === 'primary' ? (
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              ) : (
                <polygon points="12 4 14.36 9.18 20 9.97 16 13.86 16.94 19.36 12 16.77 7.06 19.36 8 13.86 4 9.97 9.64 9.18 12 4" />
              )}
            </svg>
          ),
        });
      }
    }
    if (onMoveColor && group !== 'grey') {
      for (const t of moveTargets) {
        items.push({
          label: `Move to ${groupLabel[t]}`,
          onSelect: () => onMoveColor(group, t, index),
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="13 6 19 12 13 18" />
            </svg>
          ),
        });
      }
    }
    if (onDownloadColor) {
      items.push({
        label: 'Download color',
        onSelect: () => onDownloadColor(color),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        ),
      });
    }
    if (onDeleteColor && group !== 'grey') {
      items.push({
        label: 'Delete color',
        destructive: true,
        onSelect: () => onDeleteColor(group, index),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6" />
          </svg>
        ),
      });
    }
    if (items.length === 0) return;
    setCtxMenu({ x: e.clientX, y: e.clientY, items });
  };

  const openLogoMenu = (
    e: React.MouseEvent,
    logo: MockBrand['logos'][number],
  ) => {
    e.preventDefault();
    e.stopPropagation();
    markAnchor(e.currentTarget as HTMLElement);
    const items: ContextMenuState['items'] = [];
    if (onDownloadLogo) {
      items.push({
        label: 'Download logo',
        onSelect: () => onDownloadLogo(logo),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        ),
      });
    }
    if (onReplaceLogo) {
      items.push({
        label: 'Replace logo',
        onSelect: () => onReplaceLogo(logo.id),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
          </svg>
        ),
      });
    }
    if (onSetPrimaryLogo && logo.role !== 'primary' && logo.id !== 'primary') {
      items.push({
        label: 'Set as Primary',
        onSelect: () => onSetPrimaryLogo(logo.id),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3 2.6 5.6 6.4.8-4.7 4.3 1.3 6.3L12 17l-5.6 3 1.3-6.3L3 9.4l6.4-.8Z" />
          </svg>
        ),
      });
    }
    if (onChangeLogoRole) {
      items.push({
        label: 'Change logo type',
        onSelect: () => {},
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2H2v10l9.29 9.29a2 2 0 0 0 2.83 0l7.17-7.17a2 2 0 0 0 0-2.83Z" />
            <circle cx="7" cy="7" r="1" fill="currentColor" />
          </svg>
        ),
        // Opens INSIDE the same menu box (morph) — one option per role.
        children: LOGO_ROLES.filter((r) => r.id !== logo.id).map((r) => ({
          label: r.label,
          onSelect: () => onChangeLogoRole(logo.id, r.id),
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {r.variant === 'dark' ? (
                <rect x="3" y="6" width="18" height="12" rx="3" fill="currentColor" />
              ) : r.id === 'mark' ? (
                <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />
              ) : r.id === 'wordmark' ? (
                <rect x="4" y="10" width="16" height="4" rx="2" fill="currentColor" stroke="none" />
              ) : (
                <>
                  <circle cx="7" cy="12" r="3" fill="currentColor" stroke="none" />
                  <rect x="12" y="10" width="8" height="4" rx="2" fill="currentColor" stroke="none" />
                </>
              )}
            </svg>
          ),
        })),
      });
    }
    if (onDeleteLogo) {
      items.push({
        label: 'Delete logo',
        destructive: true,
        onSelect: () => onDeleteLogo(logo.id),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6" />
          </svg>
        ),
      });
    }
    if (items.length === 0) return;
    setCtxMenu({ x: e.clientX, y: e.clientY, items });
  };

  const openFontMenu = (
    e: React.MouseEvent,
    font: MockBrand['fonts'][number],
  ) => {
    e.preventDefault();
    e.stopPropagation();
    markAnchor(e.currentTarget as HTMLElement);
    const items: ContextMenuState['items'] = [];
    if (onDownloadFont) {
      items.push({
        label: 'Download font',
        onSelect: () => onDownloadFont(font),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        ),
      });
    }
    if (onReplaceFont) {
      items.push({
        label: 'Replace font',
        onSelect: () => onReplaceFont(font.id),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
          </svg>
        ),
      });
    }
    if (onDeleteFont) {
      items.push({
        label: 'Delete font',
        destructive: true,
        onSelect: () => onDeleteFont(font.id),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6" />
          </svg>
        ),
      });
    }
    if (items.length === 0) return;
    setCtxMenu({ x: e.clientX, y: e.clientY, items });
  };

  const openPhotoMenu = (
    e: React.MouseEvent,
    photo: MockBrand['photos'][number],
  ) => {
    e.preventDefault();
    e.stopPropagation();
    markAnchor(e.currentTarget as HTMLElement);
    const items: ContextMenuState['items'] = [];
    if (onDownloadPhoto) {
      items.push({
        label: 'Download photo',
        onSelect: () => onDownloadPhoto(photo),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        ),
      });
    }
    if (onReplacePhoto) {
      items.push({
        label: 'Replace photo',
        onSelect: () => onReplacePhoto(photo.id),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
          </svg>
        ),
      });
    }
    if (onDeletePhoto) {
      items.push({
        label: 'Delete photo',
        destructive: true,
        onSelect: () => onDeletePhoto(photo.id),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6" />
          </svg>
        ),
      });
    }
    if (items.length === 0) return;
    setCtxMenu({ x: e.clientX, y: e.clientY, items });
  };

  const openIconMenu = (e: React.MouseEvent<HTMLDivElement>, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    markAnchor(e.currentTarget as HTMLElement);
    const anchor = e.currentTarget as HTMLElement;
    const items: ContextMenuState['items'] = [];
    if (onDownloadIcon) {
      items.push({
        label: 'Download icon',
        onSelect: () => onDownloadIcon(name, anchor),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        ),
      });
    }
    if (onDeleteIcon) {
      items.push({
        label: 'Delete icon',
        destructive: true,
        onSelect: () => onDeleteIcon(name),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6" />
          </svg>
        ),
      });
    }
    if (items.length === 0) return;
    setCtxMenu({ x: e.clientX, y: e.clientY, items });
  };

  const openDeleteMenu = (
    e: React.MouseEvent,
    label: string,
    onDelete: () => void,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    markAnchor(e.currentTarget as HTMLElement);
    setCtxMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label,
          destructive: true,
          onSelect: onDelete,
          icon: (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6" />
            </svg>
          ),
        },
      ],
    });
  };
  const openAboutMenu = (
    e: React.MouseEvent,
    entry: MockBrand['about'][number],
  ) => {
    e.preventDefault();
    e.stopPropagation();
    markAnchor(e.currentTarget as HTMLElement);
    const items: ContextMenuState['items'] = [];
    if (onEditAbout) {
      items.push({
        label: 'Edit',
        onSelect: () => onEditAbout(entry.id),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
        ),
      });
    }
    if (onDownloadAbout) {
      items.push({
        label: 'Download',
        onSelect: () => onDownloadAbout(entry),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        ),
      });
    }
    if (onDeleteAbout) {
      items.push({
        label: 'Delete',
        destructive: true,
        onSelect: () => onDeleteAbout(entry.id),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6" />
          </svg>
        ),
      });
    }
    if (items.length === 0) return;
    setCtxMenu({ x: e.clientX, y: e.clientY, items });
  };

  const setRef = (key: SectionKey) => (el: HTMLElement | null) => {
    sectionRefs.current[key] = el;
  };

  const iconMap = ICON_MAP();

  // Add-color picker state — opened by the `+` in the Color section header.
  // Lives here (instead of in ColorsGroup) because the new color can land in
  // any of the palettes; the user picks inside the picker itself.
  const [addColorOpen, setAddColorOpen] = useState(false);
  const [addColorTarget, setAddColorTarget] = useState<AddableColorGroup>('core');
  const [addColorDraft, setAddColorDraft] = useState('#4F46E5');
  const [addColorDisplayed, setAddColorDisplayed] = useState(false);
  const addColorWrapRef = useRef<HTMLDivElement>(null);
  const addCloseTimerRef = useRef<number | null>(null);

  // Keep picker mounted during the collapse transition (matches swatch picker).
  useEffect(() => {
    if (addColorOpen) {
      if (addCloseTimerRef.current) {
        window.clearTimeout(addCloseTimerRef.current);
        addCloseTimerRef.current = null;
      }
      setAddColorDisplayed(true);
      return;
    }
    if (!addColorDisplayed) return;
    if (addCloseTimerRef.current) window.clearTimeout(addCloseTimerRef.current);
    addCloseTimerRef.current = window.setTimeout(() => {
      setAddColorDisplayed(false);
      addCloseTimerRef.current = null;
    }, 440);
  }, [addColorOpen, addColorDisplayed]);

  useEffect(() => {
    return () => {
      if (addCloseTimerRef.current) window.clearTimeout(addCloseTimerRef.current);
    };
  }, []);

  // Outside click + Escape close the add picker.
  //
  // We listen to `click` (not `mousedown`) because the HSV canvas uses
  // mousedown to start a drag — and if the user drags out of the popover
  // (which is fine, you can pick a color outside the canvas boundary) a
  // mousedown-based outside-click would fire `setAddColorOpen(false)`
  // mid-drag. `click` only fires when mousedown and mouseup land on the
  // same target, so a drag inside the picker never generates one.
  useEffect(() => {
    if (!addColorOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target || typeof target.closest !== 'function') return;
      if (target.closest('.cp-popover')) return;
      if (target.closest('[data-add-color-trigger="colors"]')) return;
      setAddColorOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAddColorOpen(false);
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [addColorOpen]);

  const handleAddColorCommit = useCallback(
    (hex: string) => {
      onAddColor?.(addColorTarget, hex);
      setAddColorOpen(false);
    },
    [onAddColor, addColorTarget],
  );

  const handleColorsSectionAdd = () => {
    setAddColorOpen((prev) => !prev);
  };

  // Empty sections collapse to a slim dashed drop bar and sink to the
  // bottom of the board (CSS `order` on `.section.is-collapsed`); adding
  // content restores them to their normal spot and full size.
  const emptyLogo = brand.logos.filter((l) => l.id !== 'placeholder').length === 0;
  const emptyFonts = brand.fonts.length === 0;
  const emptyIcons = brand.icons.length === 0;
  const emptyWebsite = brand.websites.length === 0;
  /**
   * The strategy answers this brand has actually given.
   *
   * Derived rather than stored: the eleven fields always exist on the model, so
   * "answered" is a property of their content and cannot drift out of step with
   * what the cards render.
   */
  const answeredStrategy = STRATEGY_CARDS.map((card) => ({
    card,
    content: contentOf(card, brand.strategy),
  })).filter((c) => c.content.trim());
  const emptyAbout =
    brand.about.every((a) => !a.content.trim()) && answeredStrategy.length === 0;

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

      {/* ─── Brand ─── */}
      <Section
        sectionRef={setRef('brand')}
        dataKey="brand"
        title="Brand"
        spec="Name · Slogan"
        hideAdd
      >
        <div className="brand-fields">
          <BrandField
            label="Brand name"
            value={brand.name}
            placeholder="What the brand is called"
            onCommit={onChangeName}
          />
          <BrandField
            label="Slogan"
            value={brand.strategy.slogan}
            placeholder="The line that goes under the name"
            hint="Also editable under Brand Strategy — one value, two ways in."
            onCommit={onChangeSlogan}
          />
        </div>
      </Section>

      {/* ─── Logo ─── */}
      <Section sectionRef={setRef('logo')} dataKey="logo" title="Logo" spec="Primary · Variants" onEdit={() => onEdit('logo')} onExport={exportFor('logo')} collapsed={emptyLogo}>
        <div className="logos">
          {brand.logos.map((logo) => (
            <div
              key={logo.id}
              className={`logo-tile${logo.variant === 'dark' ? ' is-dark' : ''}${onPreviewLogo ? ' is-clickable' : ''}`}
              aria-label={logo.label}
              role={onPreviewLogo ? 'button' : undefined}
              tabIndex={onPreviewLogo ? 0 : undefined}
              onClick={onPreviewLogo ? () => onPreviewLogo(logo) : undefined}
              onKeyDown={
                onPreviewLogo
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onPreviewLogo(logo);
                      }
                    }
                  : undefined
              }
              onContextMenu={(e) => openLogoMenu(e, logo)}
            >
              <span
                className="logo-svg"
                dangerouslySetInnerHTML={{ __html: logo.svg }}
                style={{ display: 'block', width: '100%', height: '100%' }}
              />
              <span className="logo-tile-name">{logo.label}</span>
              {(onDeleteLogo || onReplaceLogo) && (
                <div className="logo-tile-actions">
                  {onReplaceLogo && (
                    <button
                      type="button"
                      className="logo-tile-action"
                      aria-label="Replace logo"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReplaceLogo(logo.id);
                      }}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLogo(logo.id);
                      }}
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
          <button
            type="button"
            className="logo-tile is-empty"
            onClick={() => (onAddLogoVariant ? onAddLogoVariant() : onEdit('logo'))}
            aria-label="Add logo variant"
            onDragOver={(e) => {
              if (!onDropFiles) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
              (e.currentTarget as HTMLElement).classList.add('is-drop-target');
            }}
            onDragLeave={(e) => {
              (e.currentTarget as HTMLElement).classList.remove('is-drop-target');
            }}
            onDrop={(e) => {
              if (!onDropFiles) return;
              e.preventDefault();
              (e.currentTarget as HTMLElement).classList.remove('is-drop-target');
              const files = Array.from(e.dataTransfer.files).filter(isImageFile);
              if (files.length > 0) onDropFiles('logo', files);
            }}
          >
            <svg className="logo-tile-dash" aria-hidden="true">
              <rect />
            </svg>
            {/* Named, not a bare `+`. The old plus opened a file picker and
                produced a tile called "Logo" holding no role — which no slot
                can persist, and which hid the fact that roles exist at all. */}
            <span className="logo-tile-add" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M12 5 L12 19" />
                <path d="M5 12 L19 12" />
              </svg>
              <span>Add logo variant</span>
            </span>
          </button>
        </div>
      </Section>

      {/* ─── Color ─── */}
      <Section
        sectionRef={setRef('colors')}
        dataKey="colors"
        title="Color"
        spec="Core · Accent · Grey"
        onEdit={handleColorsSectionAdd}
        onExport={exportFor('colors')}
        hideAdd={addColorOpen}
        addButtonAttrs={{
          'data-add-color-trigger': 'colors',
          'aria-expanded': addColorOpen,
          'aria-label': 'Add a new color',
        }}
        addSlot={
          <div
            ref={addColorWrapRef}
            className={`cp-popover${addColorOpen ? ' is-open' : ''}`}
            aria-hidden={!addColorOpen}
          >
            {addColorDisplayed && (
              <ColorPickerHSV
                hex={addColorDraft}
                compact
                commitLabel="Add"
                paletteOptions={[
                  { key: 'core', label: 'Core' },
                  { key: 'accent', label: 'Accent' },
                ]}
                selectedPalette={addColorTarget}
                onSelectPalette={(k) => setAddColorTarget(k as AddableColorGroup)}
                onChange={(hex) => setAddColorDraft(hex)}
                onCommit={handleAddColorCommit}
                onCancel={() => setAddColorOpen(false)}
              />
            )}
          </div>
        }
      >
        <div className="colors-stack">
          <ColorsGroup
            groupKey="core"
            layout="core"
            title="Core Colors"
            colors={brand.colors.core}
            onUpdateColor={onUpdateColor}
            onSwatchContextMenu={openColorMenu}
            onAddColor={(hex) => onAddColor?.('core', hex)}
            addFirstLabel="Add a core color"
            onSetPrimary={
              onSetColorRole ? (i) => onSetColorRole('core', i, 'primary') : undefined
            }
          />
          {brand.colors.accent.length > 0 && (
            <ColorsGroup
              groupKey="accent"
              layout="accent"
              title="Accent Colors"
              colors={brand.colors.accent}
              onUpdateColor={onUpdateColor}
              onSwatchContextMenu={openColorMenu}
            />
          )}
          <ColorsGroup
            groupKey="grey"
            layout="grey"
            title="Neutral Colors"
            colors={brand.colors.grey}
            onUpdateColor={onUpdateColor}
            onSwatchContextMenu={openColorMenu}
          />
        </div>
      </Section>

      {/* ─── Typography ─── */}
      <Section
        sectionRef={setRef('fonts')}
        dataKey="fonts"
        collapsed={emptyFonts}
        title="Typography"
        spec={brand.fonts.length === 0 ? 'Add your first font' : `${brand.fonts.length} / 4`}
        onEdit={() => onEdit('fonts')}
        onExport={exportFor('fonts')}
        hideAdd={!canAddFont}
      >
        {brand.fonts.length === 0 ? (
          <button
            type="button"
            className="type-empty"
            onClick={() => onEdit('fonts')}
          >
            <svg className="empty-tile-dash" aria-hidden="true">
              <rect />
            </svg>
            <span className="empty-tile-content">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M12 5 L12 19" />
                <path d="M5 12 L19 12" />
              </svg>
              <span>Add a font</span>
            </span>
          </button>
        ) : (
          // 1–2 fonts: single column. 3–4 fonts: 2 cols × 2 rows.
          // 5–6 fonts: 2 cols × 3 rows (the hard cap — no scroll). Column-
          // first flow so a new font lands in the next open slot going
          // down, then the next column.
          <div
            className={`type-grid${brand.fonts.length >= 3 ? ' is-two-col' : ''}${brand.fonts.length >= 5 ? ' is-three-row' : ''}`}
            data-count={brand.fonts.length}
          >
            {brand.fonts.map((font) => (
              <TypeRow
                key={font.id}
                font={font}
                onReplace={onReplaceFont ? () => onReplaceFont(font.id) : undefined}
                onDelete={onDeleteFont ? () => onDeleteFont(font.id) : undefined}
                onContextMenu={(e) => openFontMenu(e, font)}
              />
            ))}
          </div>
        )}
      </Section>

      {/* ─── Iconography ─── */}
      <Section sectionRef={setRef('icons')} dataKey="icons" title="Iconography" spec="24 × 24px" onEdit={() => onEdit('icons')} onExport={exportFor('icons')} collapsed={emptyIcons}>
        {brand.icons.length === 0 ? (
          <button
            type="button"
            className="icons-empty"
            onClick={() => onEdit('icons')}
          >
            <svg className="empty-tile-dash" aria-hidden="true">
              <rect />
            </svg>
            <span className="empty-tile-content">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M12 5 L12 19" />
                <path d="M5 12 L19 12" />
              </svg>
              <span>Add icons</span>
            </span>
          </button>
        ) : (
          <IconsMarquee
            icons={brand.icons}
            iconMap={iconMap as Record<string, (p: { size?: number }) => JSX.Element>}
            onIconContextMenu={openIconMenu}
          />
        )}
      </Section>

      {/* ─── Website ─── */}
      <Section
        sectionRef={setRef('website')}
        dataKey="website"
        collapsed={emptyWebsite}
        title="Website"
        spec={
          brand.websites.length === 0
            ? 'Add a reference link'
            : `${brand.websites.length} / 3`
        }
        onEdit={() => onEdit('website')}
        onExport={exportFor('website')}
      >
        {/*
          A link is shown as a CARD, not as a browser.

          This used to render one fake browser window — chrome, tab strip and a
          body that showed either a screenshot or a giant letter on grey. A
          brand with three links saw one of them at monitor size and the others
          as tabs. `LinkCard` reads the site's own Open Graph metadata, which is
          published for exactly this purpose, and the full-size render moves to
          the preview drawer where it belongs.
        */}
        {brand.websites.length === 0 && brand.links.length === 0 ? (
          <button type="button" className="website-empty" onClick={onAddWebsite}>
            <svg className="empty-tile-dash" aria-hidden="true">
              <rect />
            </svg>
            <span className="empty-tile-content">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M12 5 L12 19" />
                <path d="M5 12 L19 12" />
              </svg>
              <span>Add a website</span>
            </span>
          </button>
        ) : (
          <div className="link-cards">
            {brand.websites.map((w) => (
              <LinkCard
                key={w.id}
                url={w.url}
                fallbackTitle={w.title ?? undefined}
                onOpen={(p) => onOpenLink?.(w.url, p)}
                onReplace={onReplaceWebsite ? () => onReplaceWebsite(w.id) : undefined}
                onRemove={onDeleteWebsite ? () => onDeleteWebsite(w.id) : undefined}
              />
            ))}
            {/* The brand's other addresses — social profiles and anything else
                it brought. Same card, same behaviour. */}
            {brand.links.map((link) => (
              <LinkCard
                key={link.id}
                url={link.url}
                fallbackTitle={link.label ?? undefined}
                onOpen={(p) => onOpenLink?.(link.url, p)}
                onRemove={onDeleteLink ? () => onDeleteLink(link.id) : undefined}
              />
            ))}
          </div>
        )}
      </Section>

      {/* ─── Brand Strategy ─── */}
      <Section
        sectionRef={setRef('voice')}
        dataKey="voice"
        collapsed={emptyAbout}
        title="Brand Strategy"
        spec={`${answeredStrategy.length} of ${STRATEGY_CARDS.length} answered`}
        onEdit={() => onEdit('voice')}
        onExport={exportFor('voice')}
        addSlot={strategyActions}
      >
        {(() => {
          const filled = brand.about.filter((a) => a.content.trim().length > 0);
          if (filled.length === 0 && answeredStrategy.length === 0) {
            return (
              <button
                type="button"
                className="about-empty"
                onClick={() => onEdit('voice')}
              >
                <svg className="empty-tile-dash" aria-hidden="true">
                  <rect />
                </svg>
                <span className="empty-tile-content">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                    <path d="M12 5 L12 19" />
                    <path d="M5 12 L19 12" />
                  </svg>
                  <span>Add a section</span>
                </span>
              </button>
            );
          }
          return (
            <div className="about-grid">
              {/*
                The structured answers first, in the review's order, then the
                free-form sections. A card is something the brand SAYS — an
                unanswered field says nothing and would only fill the section
                with placeholders, so it waits inside the add flow instead,
                exactly as it does on the review.
              */}
              {answeredStrategy.map(({ card, content }) => (
                <button
                  key={card.key}
                  type="button"
                  className="about-card"
                  onClick={() => onEditStrategy?.(card.key)}
                  title="Click to change"
                >
                  <h3 className="about-card-title">{card.name}</h3>
                  <p className="about-card-body">{content}</p>
                </button>
              ))}
              {filled.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="about-card"
                  onClick={() => onEditAbout?.(entry.id)}
                  onContextMenu={(e) => openAboutMenu(e, entry)}
                >
                  <h3 className="about-card-title">{entry.title}</h3>
                  <p className="about-card-body">{entry.content}</p>
                </button>
              ))}
            </div>
          );
        })()}
      </Section>
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxMenu.items}
          onClose={closeCtxMenu}
        />
      )}
    </main>
  );
}

type CopyFlash = { id: number; text: string; x: number; y: number };

/**
 * One color tile in a ColorsGroup. Extracted from the map-loop so the
 * copy-icon animation can own its own ref — hovering any part of the
 * swatch nudges the icon, and clicking the name / icon / hex copies the
 * hex (never the display name). Clicking empty background of the swatch
 * still toggles the inline HSV picker.
 */
function Swatch({
  color,
  renderedHex,
  light,
  isActive,
  isPrimary,
  zIndex,
  onPickerToggle,
  onCopyHex,
  onSetPrimary,
  onContextMenu,
}: {
  color: BrandColor;
  renderedHex: string;
  light: boolean;
  isActive: boolean;
  isPrimary?: boolean;
  zIndex: number;
  onPickerToggle: () => void;
  onCopyHex: (anchor: HTMLElement) => void;
  onSetPrimary?: () => void;
  onContextMenu?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const iconRef = useRef<OrganicIconHandle>(null);
  const resetTimerRef = useRef<number | null>(null);
  const handleCopyClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    onCopyHex(e.currentTarget);
    // Pulse the copy icon once — spring out, then back. Not tied to
    // hover; the animation only fires when the copy actually happens.
    iconRef.current?.startAnimation();
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => {
      iconRef.current?.stopAnimation();
      resetTimerRef.current = null;
    }, 520);
  };
  useEffect(() => () => {
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
  }, []);
  return (
    <button
      type="button"
      className={`swatch${light ? ' is-light' : ''}${isActive ? ' is-active' : ''}${isPrimary ? ' is-primary' : ''}`}
      style={{ background: renderedHex, zIndex }}
      // Accessible name mirrors the VISIBLE label (hexToName of the live
      // hex), not the stored color.name — WCAG 2.5.3 Label in Name.
      aria-label={`Edit ${hexToName(renderedHex)} ${renderedHex}`}
      aria-expanded={isActive}
      onClick={(e) => {
        e.stopPropagation();
        onPickerToggle();
      }}
      onContextMenu={onContextMenu}
    >
      {onSetPrimary && (
        <span
          className={`swatch-primary-tag${isPrimary ? ' is-on' : ''}`}
          role="button"
          tabIndex={-1}
          aria-pressed={isPrimary}
          title={isPrimary ? 'Primary brand color' : 'Set as the primary brand color'}
          onClick={(e) => {
            e.stopPropagation();
            if (!isPrimary) onSetPrimary();
          }}
        >
          <span className="swatch-primary-dot" aria-hidden="true" />
          {isPrimary ? 'Primary' : 'Set primary'}
        </span>
      )}
      <span
        className="swatch-name"
        role="button"
        tabIndex={-1}
        onClick={handleCopyClick}
      >
        {/* Name follows the LIVE previewed color, not the stored one, so it
            re-labels in real time while the user drags the picker. */}
        {hexToName(renderedHex)}
        <span className="swatch-copy-icon" aria-hidden onClick={handleCopyClick}>
          <CopyIcon ref={iconRef} size={13} />
        </span>
      </span>
      <span
        className="swatch-hex"
        role="button"
        tabIndex={-1}
        onClick={handleCopyClick}
      >
        {renderedHex.toUpperCase()}
      </span>
    </button>
  );
}

function ColorsGroup({
  groupKey,
  layout,
  title,
  colors,
  onUpdateColor,
  onSwatchContextMenu,
  onAddColor,
  addFirstLabel,
  onSetPrimary,
}: {
  groupKey: ColorGroupKey;
  layout: 'core' | 'accent' | 'grey';
  title: string;
  colors: BrandColor[];
  onUpdateColor: (group: ColorGroupKey, index: number, hex: string) => void;
  onSwatchContextMenu?: (
    e: React.MouseEvent,
    color: BrandColor,
    group: ColorGroupKey,
    index: number,
  ) => void;
  onAddColor?: (hex: string) => void;
  addFirstLabel?: string;
  /** When set, swatches show the Primary tag (core group only) — the first
   *  swatch reads "Primary", the rest get a "Set primary" affordance. */
  onSetPrimary?: (index: number) => void;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [displayedIndex, setDisplayedIndex] = useState<number | null>(null);
  const [previewHex, setPreviewHex] = useState<string | null>(null);
  const [flash, setFlash] = useState<CopyFlash | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [addDraftHex, setAddDraftHex] = useState('#5B6BFF');
  const [addTouched, setAddTouched] = useState(false);
  const [addMounted, setAddMounted] = useState(false);
  const flashTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const addCloseTimerRef = useRef<number | null>(null);
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
      if (addCloseTimerRef.current) window.clearTimeout(addCloseTimerRef.current);
    };
  }, []);

  // Keep the inline add-picker mounted through the close transition so it
  // fades out smoothly instead of disappearing the moment addMode flips off.
  useEffect(() => {
    if (addMode) {
      if (addCloseTimerRef.current) {
        window.clearTimeout(addCloseTimerRef.current);
        addCloseTimerRef.current = null;
      }
      setAddMounted(true);
      return;
    }
    if (!addMounted) return;
    if (addCloseTimerRef.current) window.clearTimeout(addCloseTimerRef.current);
    addCloseTimerRef.current = window.setTimeout(() => {
      setAddMounted(false);
      addCloseTimerRef.current = null;
    }, 440);
  }, [addMode, addMounted]);

  // Outside click + Escape cancel the inline add flow; Enter commits the
  // current draft hex (skipped when focus is in a text field so the user
  // can still type commas/newlines into an input without accidental save).
  useEffect(() => {
    if (!addMode) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (groupRef.current?.contains(target)) return;
      setAddMode(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAddMode(false);
        return;
      }
      if (e.key === 'Enter') {
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || t?.isContentEditable) return;
        e.preventDefault();
        onAddColor?.(addDraftHex);
        setAddMode(false);
        setAddTouched(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [addMode, addDraftHex, onAddColor]);

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
        // Any other raised card (right-click menu, picker in a sibling
        // group) should collapse the moment this one opens.
        window.dispatchEvent(
          new CustomEvent('brand-os:card-raised', {
            detail: { id: Date.now(), scope: `colors-${groupKey}` },
          }),
        );
        return i;
      });
    },
    [groupKey],
  );

  // Listen for a raise dispatched elsewhere (ctx menu on a swatch,
  // picker opening in another ColorsGroup) and collapse this group's
  // open picker if we aren't the source of the event.
  useEffect(() => {
    const onRaised = (e: Event) => {
      const scope = (e as CustomEvent<{ scope: string }>).detail.scope;
      if (scope !== `colors-${groupKey}`) {
        setActiveIndex(null);
        setPreviewHex(null);
        setAddMode(false);
      }
    };
    window.addEventListener('brand-os:card-raised', onRaised);
    return () => window.removeEventListener('brand-os:card-raised', onRaised);
  }, [groupKey]);

  const handleStartAdd = useCallback(() => {
    if (addMode) return;
    setAddMode(true);
    window.dispatchEvent(
      new CustomEvent('brand-os:card-raised', {
        detail: { id: Date.now(), scope: `colors-${groupKey}` },
      }),
    );
  }, [addMode, groupKey]);

  const handleAddCommit = useCallback(
    (hex: string) => {
      onAddColor?.(hex);
      setAddMode(false);
      setAddTouched(false);
    },
    [onAddColor],
  );

  const handleAddCancel = useCallback(() => {
    setAddMode(false);
    setAddTouched(false);
  }, []);

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

  if (colors.length === 0 && onAddColor) {
    const showColor = addMode && addTouched;
    const addLight = showColor ? isLightHex(addDraftHex) : false;
    const swatchClass = [
      'swatch',
      'is-empty',
      addMode ? 'is-active' : '',
      showColor ? 'is-filled' : '',
      addLight ? 'is-light' : '',
    ]
      .filter(Boolean)
      .join(' ');
    const liveName = showColor
      ? hexToName(addDraftHex)
      : addFirstLabel ?? `Add ${title.toLowerCase()}`;
    return (
      <div className="colors-group" data-group={groupKey} ref={groupRef}>
        <p className="colors-group-title">{title}</p>
        <div className="colors-row" data-layout={layout}>
          <button
            type="button"
            className={swatchClass}
            style={showColor ? { background: addDraftHex } : undefined}
            onClick={handleStartAdd}
            aria-pressed={addMode}
          >
            <svg className="empty-tile-dash" aria-hidden="true">
              <rect />
            </svg>
            <span className="swatch-name">{liveName}</span>
            <span className="swatch-hex">
              {addMode
                ? showColor
                  ? addDraftHex.toUpperCase()
                  : '—'
                : '+'}
            </span>
          </button>
        </div>
        <div className={`cp-expand${addMode ? ' is-open' : ''}`} aria-hidden={!addMode}>
          {addMounted && (
            <ColorPickerHSV
              key={`${groupKey}-add`}
              hex={addDraftHex}
              onChange={(hex) => {
                setAddDraftHex(hex);
                setAddTouched(true);
              }}
              onCommit={handleAddCommit}
              onCancel={handleAddCancel}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="colors-group" data-group={groupKey} ref={groupRef}>
      <p className="colors-group-title">{title}</p>
      <div className="colors-row" data-layout={layout}>
        {colors.map((c, i) => {
          const renderedHex = activeIndex === i && previewHex ? previewHex : c.hex;
          const light = isLightHex(renderedHex);
          const isActive = activeIndex === i;
          return (
            <Swatch
              key={`${c.hex}-${i}`}
              color={c}
              renderedHex={renderedHex}
              light={light}
              isActive={isActive}
              isPrimary={onSetPrimary != null && i === 0}
              zIndex={i + 1}
              onPickerToggle={() => handleSwatchClick(i)}
              onCopyHex={(anchor) => handleCopy(renderedHex.toUpperCase(), anchor)}
              onSetPrimary={onSetPrimary ? () => onSetPrimary(i) : undefined}
              onContextMenu={
                onSwatchContextMenu
                  ? (e) => onSwatchContextMenu(e, c, groupKey, i)
                  : undefined
              }
            />
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

type Font = { id: string; family: string; role: string; fallback?: string };

function FontActions({
  onReplace,
  onDelete,
  className = 'type-card-actions',
}: {
  onReplace?: () => void;
  onDelete?: () => void;
  className?: string;
}) {
  if (!onReplace && !onDelete) return null;
  return (
    <div className={className}>
      {onReplace && (
        <button
          type="button"
          className="type-card-action"
          aria-label="Replace font"
          onClick={onReplace}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
          </svg>
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          className="type-card-action"
          aria-label="Delete font"
          onClick={onDelete}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6" />
          </svg>
        </button>
      )}
    </div>
  );
}

/**
 * Full-width 3-column row — matches the original specimen layout in the
 * source HTML prototype. Actions (replace / delete) live in a narrow
 * column to the LEFT of the identity column, so they never overlap or
 * sit on top of the font name.
 */
function TypeRow({
  font,
  onReplace,
  onDelete,
  onContextMenu,
}: {
  font: Font;
  onReplace?: () => void;
  onDelete?: () => void;
  onContextMenu?: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const isDisplay = font.role.toLowerCase().includes('display');
  const fontStack = `"${font.family}", ${font.fallback ?? (isDisplay ? 'serif' : 'sans-serif')}`;
  const weightList = resolveWeights(font.family);
  const hasActions = !!(onReplace || onDelete);
  return (
    <div
      className={`type-row${hasActions ? ' has-actions' : ''}`}
      style={{ fontFamily: fontStack }}
      onContextMenu={onContextMenu}
    >
      {hasActions && (
        <FontActions
          onReplace={onReplace}
          onDelete={onDelete}
          className="type-row-actions type-row-actions--corner"
        />
      )}
      <div className="type-col type-col--identity">
        <DsEyebrow style={{ margin: '0 0 10px' }}>{font.role}</DsEyebrow>
        <h3 className="type-name">{font.family}</h3>
        <div className="type-glyphs">
          <p className="type-glyph type-glyph--lower">abcdefghijklmnopqrstuvwxyz</p>
          <p className="type-glyph type-glyph--upper">ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
          <p className="type-glyph type-glyph--num">0 1 2 3 4 5 6 7 8 9</p>
        </div>
      </div>
      <div className="type-col type-col--weights">
        <DsEyebrow style={{ margin: '0 0 10px' }}>Weight</DsEyebrow>
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
        <DsEyebrow style={{ margin: '0 0 10px' }}>Example</DsEyebrow>
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

