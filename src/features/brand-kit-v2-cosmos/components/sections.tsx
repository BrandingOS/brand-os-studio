import { useCallback, useRef, useState } from 'react';
import {
  ContextMenu,
  type ContextMenuState,
} from '@/features/setup/components/ContextMenu';
import type { KitSectionKey } from './BrandKitSidebar';
import type { EditorTarget } from './BrandKitCardEditor';
import { variantsForCard } from '../data/legacy-mapping';

/**
 * Every Brand Kit section renders the same shape — a grid of
 * placeholder cards. Each card uses the shared cover image until
 * real per-item renders land. The card aspect is slightly taller
 * than a business card (1.6 / 1) — enough vertical room to fit a
 * mark + label without feeling squat.
 */

/** Pool of 46 cover images in /public/brand-kit/covers/pic-01…46.
 *  Most are .jpeg, a few have .jpg / .gif extensions — the override
 *  map below spells those out. */
const COVERS: string[] = (() => {
  const exts: Record<number, string> = { 14: 'jpg', 21: 'jpg', 15: 'gif', 39: 'gif' };
  return Array.from({ length: 46 }, (_, i) => {
    const n = i + 1;
    const ext = exts[n] ?? 'jpeg';
    return `/brand-kit/covers/pic-${n.toString().padStart(2, '0')}.${ext}`;
  });
})();

/** Section order used when assigning covers globally. Mirrors the
 *  order in BrandKitSidebar's KIT_SECTIONS — duplicated here to keep
 *  sections.tsx free of an import cycle with BrandKitSidebar. */
const SECTION_ORDER: KitSectionKey[] = [
  'stationery',
  'social',
  'web',
  'mockups',
  'brand-guides',
  'presentations',
  'animations',
  'qr-code',
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Seeded xorshift shuffle so the cover order looks randomised but is
 *  stable across page loads — keeps the same image pinned to the same
 *  card on every render. */
function deterministicShuffle<T>(arr: readonly T[], seed: number): T[] {
  const out = [...arr];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (s ^ (s << 13)) >>> 0;
    s = (s ^ (s >>> 17)) >>> 0;
    s = (s ^ (s << 5)) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type CardSpec = { label: string };

const SECTION_CARDS: Record<KitSectionKey, CardSpec[]> = {
  stationery: [
    { label: 'Business Card' },
    { label: 'Letterhead' },
    { label: 'Envelope' },
    { label: 'Notecard' },
    { label: 'Invoice' },
  ],
  social: [
    { label: 'Profile' },
    { label: 'Cover' },
    { label: 'Post' },
    { label: 'Story' },
  ],
  web: [
    { label: 'Favicon' },
    { label: 'Website' },
    { label: 'Email Signature' },
    { label: 'Landing Page' },
  ],
  mockups: [
    { label: 'Mug' },
    { label: 'T-Shirt' },
    { label: 'Billboard' },
    { label: 'Tote' },
    { label: 'Sticker Sheet' },
  ],
  'brand-guides': [
    { label: 'Logo Guide' },
    { label: 'Color Guide' },
    { label: 'Typography Guide' },
    { label: 'Voice Guide' },
    { label: 'Imagery Guide' },
  ],
  presentations: [
    { label: 'Pitch Deck' },
    { label: 'Business Plan' },
    { label: 'Portfolio' },
    { label: 'Proposal' },
    { label: 'Case Studies' },
  ],
  animations: [
    { label: 'Logo Reveal' },
    { label: 'Slide In' },
    { label: 'Fade' },
    { label: 'Rotate' },
  ],
  'qr-code': [
    { label: 'Branded' },
    { label: 'Minimal' },
    { label: 'Rounded' },
    { label: 'Square' },
  ],
};

/** Cap any section at 5 cards regardless of source data. */
const MAX_PER_SECTION = 5;

export function getSectionCount(sectionKey: KitSectionKey): number {
  const raw = SECTION_CARDS[sectionKey]?.length ?? 0;
  return Math.min(raw, MAX_PER_SECTION);
}

/** Build a global cover map at module load: walk every section in
 *  order, assign 3 cover options from a shuffled 46-image pool —
 *  the first is the card's default, the other two are alternatives
 *  the editor exposes as a thumbnail picker. Indices are spread out
 *  by ~1/3 of the pool so the alternatives look distinct. */
const GLOBAL_COVER_MAP: ReadonlyMap<string, string[]> = (() => {
  const shuffled = deterministicShuffle(COVERS, hashString('brand-kit-v2'));
  const len = shuffled.length;
  const offsets = [0, Math.floor(len / 3), Math.floor((len * 2) / 3)];
  const map = new Map<string, string[]>();
  let idx = 0;
  for (const section of SECTION_ORDER) {
    const cards = (SECTION_CARDS[section] ?? []).slice(0, MAX_PER_SECTION);
    for (const card of cards) {
      const opts = offsets.map((off) => shuffled[(idx + off) % len]);
      map.set(`${section}::${card.label}`, opts);
      idx += 1;
    }
  }
  return map;
})();

/** Hand-picked default covers for specific cards. The first option in
 *  the editor's image picker uses this when present; the remaining
 *  two alternatives still come from the shuffled pool. */
const COVER_OVERRIDES: Partial<Record<string, string>> = {
  'stationery::Business Card': '/brand-kit/covers/stationery-business-card.jpeg',
};

export function coversFor(sectionKey: KitSectionKey, label: string): string[] {
  const key = `${sectionKey}::${label}`;
  const pooled = GLOBAL_COVER_MAP.get(key) ?? [COVERS[0]];
  const override = COVER_OVERRIDES[key];
  if (!override) return pooled;
  // Replace the primary with the override; keep the other two alternatives.
  return [override, ...pooled.slice(1)];
}

function coverFor(sectionKey: KitSectionKey, label: string): string {
  return coversFor(sectionKey, label)[0];
}

function EditIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

type Origin = { x: number; y: number };

type CardProps = {
  sectionKey: KitSectionKey;
  card: CardSpec;
  onEdit: (sectionKey: KitSectionKey, label: string, origin?: Origin) => void;
  onDownload?: (sectionKey: KitSectionKey, label: string) => void;
  onOpenMenu: (e: React.MouseEvent, sectionKey: KitSectionKey, label: string) => void;
};

function rectCenter(el: HTMLElement): Origin {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function BrandKitCard({ sectionKey, card, onEdit, onDownload, onOpenMenu }: CardProps) {
  return (
    <figure
      className="bk-card"
      onContextMenu={(e) => onOpenMenu(e, sectionKey, card.label)}
      onClick={(e) => onEdit(sectionKey, card.label, rectCenter(e.currentTarget as HTMLElement))}
    >
      <div className="bk-card-cover">
        <div
          className="bk-card-cover-image"
          style={{ backgroundImage: `url(${coverFor(sectionKey, card.label)})` }}
        />
        <div className="bk-card-actions">
          <button
            type="button"
            className="bk-card-action"
            aria-label={`Edit ${card.label}`}
            title={`Edit ${card.label}`}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(sectionKey, card.label);
            }}
          >
            <EditIcon />
          </button>
          {onDownload && (
            <button
              type="button"
              className="bk-card-action"
              aria-label={`Download ${card.label}`}
              title={`Download ${card.label}`}
              onClick={(e) => {
                e.stopPropagation();
                onDownload(sectionKey, card.label);
              }}
            >
              <DownloadIcon />
            </button>
          )}
        </div>
      </div>
      <figcaption className="bk-card-label">{card.label}</figcaption>
    </figure>
  );
}

type GridProps = {
  sectionKey: KitSectionKey;
  /** Bubble the click up to the page so it can swap to the in-page
   *  drilldown view (a full grid of variants for the picked card)
   *  rather than opening the old modal. The optional origin is the
   *  viewport-pixel center of the clicked card, used to drive the
   *  radial wave fade-in on the new view. */
  onPickCard: (target: EditorTarget, origin?: Origin) => void;
  /** Right-click "Edit" — opens the editor directly, skipping the
   *  variants drilldown. */
  onEditCard?: (target: EditorTarget) => void;
  onDownloadCard?: (target: EditorTarget) => void;
};

export function SectionGrid({ sectionKey, onPickCard, onEditCard, onDownloadCard }: GridProps) {
  const cards = (SECTION_CARDS[sectionKey] ?? []).slice(0, MAX_PER_SECTION);

  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);

  // Keep the card visually raised (actions visible) while its menu is open,
  // mirroring SetupBoard's `.is-ctx-active` pattern.
  const ctxAnchorRef = useRef<HTMLElement | null>(null);
  const closeCtxMenu = useCallback(() => {
    ctxAnchorRef.current?.classList.remove('is-ctx-active');
    ctxAnchorRef.current = null;
    setCtxMenu(null);
  }, []);

  const targetFor = useCallback((key: KitSectionKey, label: string): EditorTarget => {
    const opts = coversFor(key, label);
    const templates = variantsForCard(key, label);
    return {
      sectionKey: key,
      label,
      cover: opts[0],
      covers: opts,
      templates,
    };
  }, []);

  const handleCardClick = useCallback(
    (key: KitSectionKey, label: string, origin?: Origin) => {
      onPickCard(targetFor(key, label), origin);
    },
    [onPickCard, targetFor],
  );

  const openMenu = useCallback(
    (e: React.MouseEvent, key: KitSectionKey, label: string) => {
      e.preventDefault();
      e.stopPropagation();
      const anchor = (e.currentTarget as HTMLElement).closest('.bk-card') as HTMLElement | null;
      if (ctxAnchorRef.current && ctxAnchorRef.current !== anchor) {
        ctxAnchorRef.current.classList.remove('is-ctx-active');
      }
      ctxAnchorRef.current = anchor;
      anchor?.classList.add('is-ctx-active');

      const items: ContextMenuState['items'] = [];
      if (onEditCard) {
        items.push({
          label: 'Edit',
          onSelect: () => onEditCard(targetFor(key, label)),
          icon: <EditIcon />,
        });
      }
      if (onDownloadCard) {
        items.push({
          label: 'Download',
          onSelect: () => onDownloadCard(targetFor(key, label)),
          icon: <DownloadIcon />,
        });
      }
      if (items.length === 0) return;
      setCtxMenu({ x: e.clientX, y: e.clientY, items });
    },
    [onDownloadCard, onEditCard, targetFor],
  );

  return (
    <>
      <div className="bk-grid">
        {cards.map((card) => (
          <BrandKitCard
            key={card.label}
            sectionKey={sectionKey}
            card={card}
            onEdit={handleCardClick}
            onDownload={
              onDownloadCard
                ? (k, l) => onDownloadCard(targetFor(k, l))
                : undefined
            }
            onOpenMenu={openMenu}
          />
        ))}
      </div>
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxMenu.items}
          onClose={closeCtxMenu}
        />
      )}
    </>
  );
}
