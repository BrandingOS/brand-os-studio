import { useCallback, useRef, useState } from 'react';
import {
  ContextMenu,
  type ContextMenuState,
} from '@/features/setup/components/ContextMenu';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import type { Brand } from '@/shared/types/brand';
import type { KitSectionKey } from './BrandKitSidebar';
import type { EditorTarget } from './BrandKitCardEditor';
import { variantsForCard } from '../data/legacy-mapping';
import { getDeliverable, type DeliverableDef } from '../kit/registry';
import { getEntryFor, type KitEntry } from '../catalog/catalog';
import { downloadOptionsFor } from '../data/exportFormats';
import type { SavedCardCustomization } from '../data/cardCustomizations';
import { DownloadMenu, type DownloadChoice } from './DownloadMenu';
import { DeliverableCard } from './DeliverableCard';
import { CardCover } from './CardCover';

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
  'brand-assets',
  'stationery',
  'social',
  'web',
  'brand-guides',
  'presentations',
  'animations',
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
  // brand-assets has one card per asset category. Same SectionGrid
  // path as every other key — just with no per-section cap so all
  // six labels keep a distinct cover (see GLOBAL_COVER_MAP below).
  'brand-assets': [
    { label: 'Logos' },
    { label: 'Colors' },
    { label: 'Fonts' },
    { label: 'Icons' },
    { label: 'Photos' },
    { label: 'About' },
  ],
  stationery: [
    { label: 'Business Card' },
    { label: 'Letterhead' },
    { label: 'Envelope' },
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
    { label: 'Proposal' },
    { label: 'Case Studies' },
  ],
  animations: [
    { label: 'Logo Reveal' },
    { label: 'Slide In' },
    { label: 'Fade' },
    { label: 'Rotate' },
  ],
  // Mockups has no legacy section grid — it is reached through the
  // catalog's own `EntryGrid`, never through `SECTION_ORDER`. Empty here
  // so `Record<KitSectionKey, …>` stays total.
  mockups: [],
};

/** Cap any section at 5 cards regardless of source data. */
const MAX_PER_SECTION = 5;

/** Labels of the cards a section shows (post-cap) — used by the
 *  section-level download to bundle one export per card. */
export function sectionCardLabels(sectionKey: KitSectionKey): string[] {
  const raw = SECTION_CARDS[sectionKey] ?? [];
  const cards = sectionKey === 'brand-assets' ? raw : raw.slice(0, MAX_PER_SECTION);
  return cards.map((c) => c.label);
}

export function getSectionCount(sectionKey: KitSectionKey): number {
  const raw = SECTION_CARDS[sectionKey]?.length ?? 0;
  // brand-assets is a flat panel of asset categories — return the
  // raw count so the sidebar can show all six.
  if (sectionKey === 'brand-assets') return raw;
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
    // brand-assets has 6 cards (one per asset category) and we want
    // each to keep a distinct cover, so don't apply the per-section cap.
    const raw = SECTION_CARDS[section] ?? [];
    const cards = section === 'brand-assets' ? raw : raw.slice(0, MAX_PER_SECTION);
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
  // Brand Assets
  'brand-assets::Logos': '/brand-kit/covers/brand-assets-logos.png',
  'brand-assets::Colors': '/brand-kit/covers/brand-assets-colors.png',
  'brand-assets::Fonts': '/brand-kit/covers/brand-assets-fonts.png',
  'brand-assets::Icons': '/brand-kit/covers/brand-assets-icons.png',
  'brand-assets::Photos': '/brand-kit/covers/brand-assets-photos.png',
  'brand-assets::About': '/brand-kit/covers/brand-assets-about.png',
  // Stationery
  'stationery::Business Card': '/brand-kit/covers/business-card.png',
  'stationery::Letterhead': '/brand-kit/covers/letterhead.png',
  'stationery::Envelope': '/brand-kit/covers/envelope.png',
  'stationery::Invoice': '/brand-kit/covers/invoice.png',
  // Social Media
  'social::Profile': '/brand-kit/covers/social-profile.png',
  'social::Cover': '/brand-kit/covers/social-cover.png',
  'social::Post': '/brand-kit/covers/social-post.png',
  'social::Story': '/brand-kit/covers/social-story.png',
  // Web
  'web::Favicon': '/brand-kit/covers/web-favicon.png',
  'web::Website': '/brand-kit/covers/web-website.png',
  'web::Email Signature': '/brand-kit/covers/web-email-signature.png',
  'web::Landing Page': '/brand-kit/covers/web-landing-page.png',
  // Brand Guides
  'brand-guides::Logo Guide': '/brand-kit/covers/guide-logo.png',
  'brand-guides::Color Guide': '/brand-kit/covers/guide-color.png',
  'brand-guides::Typography Guide': '/brand-kit/covers/guide-typography.png',
  // Presentations
  'presentations::Pitch Deck': '/brand-kit/covers/pitch-deck.png',
};

export function coversFor(sectionKey: KitSectionKey, label: string): string[] {
  const key = `${sectionKey}::${label}`;
  const pooled = GLOBAL_COVER_MAP.get(key) ?? [COVERS[0]];
  const override = COVER_OVERRIDES[key];
  if (!override) return pooled;
  // Replace the primary with the override; keep the other two alternatives.
  return [override, ...pooled.slice(1)];
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

/**
 * One card in a grid.
 *
 * `storageLabel` addresses the DATA — covers, templates, saved
 * customizations, the deliverable registry. `displayLabel` is what the
 * user reads. They are the same for most cards and deliberately differ
 * for the few the catalog renames (Fonts → Typography, About →
 * Strategy), which is what lets a rename cost nobody their saved work.
 */
export type GridItem = {
  sectionKey: KitSectionKey;
  storageLabel: string;
  displayLabel: string;
};

/** Grid items for a whole section, in `SECTION_CARDS` order. */
export function itemsForSection(sectionKey: KitSectionKey): GridItem[] {
  const raw = SECTION_CARDS[sectionKey] ?? [];
  const cards = sectionKey === 'brand-assets' ? raw : raw.slice(0, MAX_PER_SECTION);
  return cards.map((c) => ({
    sectionKey,
    storageLabel: c.label,
    displayLabel: c.label,
  }));
}

/**
 * Build the editor/drilldown target for a card.
 *
 * Exported because the sidebar now opens items directly and has to
 * produce exactly the same target a card click produces — otherwise the
 * two entry points would drift and open subtly different things.
 */
export function buildEditorTarget(
  sectionKey: KitSectionKey,
  storageLabel: string,
  brand?: MockBrand,
  displayLabel?: string,
): EditorTarget {
  const opts = coversFor(sectionKey, storageLabel);
  return {
    sectionKey,
    label: storageLabel,
    displayLabel: displayLabel ?? storageLabel,
    cover: opts[0],
    covers: opts,
    templates: variantsForCard(sectionKey, storageLabel, brand),
  };
}

function rectCenter(el: HTMLElement): Origin {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

type CardProps = {
  item: GridItem;
  onEdit: (item: GridItem, origin?: Origin) => void;
  /** Hover pencil — opens the card editor directly (KIT-06). When
   *  absent the pencil falls back to the card-open behaviour. */
  onEditAction?: (item: GridItem) => void;
  onDownload?: (item: GridItem, choice: DownloadChoice) => void;
  onOpenMenu: (e: React.MouseEvent, item: GridItem) => void;
  /** Everything the cover needs to paint the brand's own artwork. */
  cover: React.ReactNode;
};

function BrandKitCard({
  item,
  onEdit,
  onEditAction,
  onDownload,
  onOpenMenu,
  cover,
}: CardProps) {
  // The ⬇ button opens the shared Download menu rather than firing a
  // download: For web · For print · Vector · Flattened · Custom size, the
  // same five words on every surface of the kit.
  const [menuOpen, setMenuOpen] = useState(false);
  const entry = getEntryFor(item.sectionKey, item.storageLabel);
  return (
    // A card is a control, so it says so and can be reached with Tab. It is
    // NOT a <button>: it contains buttons (edit · download), and a button
    // inside a button is not a button.
    <figure
      className="bk-card"
      role="button"
      tabIndex={0}
      aria-label={`Open ${item.displayLabel}`}
      onContextMenu={(e) => onOpenMenu(e, item)}
      onClick={(e) => onEdit(item, rectCenter(e.currentTarget as HTMLElement))}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        onEdit(item, rectCenter(e.currentTarget as HTMLElement));
      }}
    >
      <div className="bk-card-cover">
        {cover}
        <div className="bk-card-actions">
          <button
            type="button"
            className="bk-card-action"
            aria-label={`Edit ${item.displayLabel}`}
            title={`Edit ${item.displayLabel}`}
            onClick={(e) => {
              e.stopPropagation();
              // KIT-06: the pencil opens the EDITOR — before this it
              // re-fired the card-open handler, so "Edit" and "open"
              // were indistinguishable (both landed on the drilldown).
              if (onEditAction) onEditAction(item);
              else onEdit(item);
            }}
          >
            <EditIcon />
          </button>
          {onDownload && (
            <button
              type="button"
              className="bk-card-action"
              aria-label={`Download ${item.displayLabel}`}
              title={`Download ${item.displayLabel}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
            >
              <DownloadIcon />
            </button>
          )}
        </div>
        {menuOpen && onDownload && entry && (
          <DownloadMenu
            options={downloadOptionsFor(entry)}
            anchor={{ top: 44, left: 12 }}
            onClose={() => setMenuOpen(false)}
            onChoose={(choice) => onDownload(item, choice)}
          />
        )}
      </div>
      <figcaption className="bk-card-label">{item.displayLabel}</figcaption>
    </figure>
  );
}

/** Kit-lifecycle wiring for the six deliverable sections. When
 *  provided, deliverable cards render as state-driven
 *  `DeliverableCard`s (not-created / generating / review / approved)
 *  instead of stock-cover cards. Brand Assets cards are unaffected. */
export type KitGridProps = {
  sourceBrand?: Brand;
  selectedKeys: ReadonlySet<string>;
  onToggleSelect: (key: string) => void;
  onGenerate: (key: string) => void;
  onOpenReview: (key: string) => void;
  onOpenOwned: (def: DeliverableDef, origin?: Origin) => void;
  onEditItem: (def: DeliverableDef, itemId: string) => void;
  onDownloadItem: (def: DeliverableDef, itemId: string) => void;
};

type CardGridProps = {
  items: GridItem[];
  /** Bubble the click up to the page so it can swap to the in-page
   *  drilldown view (a full grid of variants for the picked card)
   *  rather than opening the old modal. The optional origin is the
   *  viewport-pixel center of the clicked card, used to drive the
   *  radial wave fade-in on the new view. */
  onPickCard: (target: EditorTarget, origin?: Origin) => void;
  /** Right-click "Edit" — opens the editor directly, skipping the
   *  variants drilldown. */
  onEditCard?: (target: EditorTarget) => void;
  onDownloadCard?: (target: EditorTarget, choice: DownloadChoice) => void;
  /** MockBrand from the page — required for brand-assets cards so
   *  variantsForCard can emit one template per real asset. */
  brand?: MockBrand;
  /** Canonical brand — what lets a cover paint the REAL renderer rather
   *  than the brand's identity mark. Absent (the standalone Setup mock,
   *  a test) every cover falls back to the identity composition. */
  sourceBrand?: Brand;
  /** The user's own featured picks, so a card's face is the variant they
   *  chose rather than the library's first. */
  featuredIdsByLabel?: Record<string, string[]>;
  /** The user's saved Quick Edits, so a cover says what they wrote. */
  savedContent?: Record<string, SavedCardCustomization>;
  kit?: KitGridProps;
};

/**
 * The shared card grid.
 *
 * `SectionGrid` (section-shaped, used by the lifecycle page) and
 * `EntryGrid` (catalog-shaped, used by the canonical Brand Kit) are both
 * thin wrappers over this, so the two pages can never disagree about how
 * a card behaves — only about which cards there are.
 */
export function CardGrid({
  items,
  onPickCard,
  onEditCard,
  onDownloadCard,
  brand,
  sourceBrand,
  featuredIdsByLabel,
  savedContent,
  kit,
}: CardGridProps) {
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);

  // Keep the card visually raised (actions visible) while its menu is open,
  // mirroring SetupBoard's `.is-ctx-active` pattern.
  const ctxAnchorRef = useRef<HTMLElement | null>(null);
  const closeCtxMenu = useCallback(() => {
    ctxAnchorRef.current?.classList.remove('is-ctx-active');
    ctxAnchorRef.current = null;
    setCtxMenu(null);
  }, []);

  const targetFor = useCallback(
    (item: GridItem): EditorTarget =>
      buildEditorTarget(item.sectionKey, item.storageLabel, brand, item.displayLabel),
    [brand],
  );

  const handleCardClick = useCallback(
    (item: GridItem, origin?: Origin) => {
      onPickCard(targetFor(item), origin);
    },
    [onPickCard, targetFor],
  );

  const openMenu = useCallback(
    (e: React.MouseEvent, item: GridItem) => {
      e.preventDefault();
      e.stopPropagation();
      const anchor = (e.currentTarget as HTMLElement).closest('.bk-card') as HTMLElement | null;
      if (ctxAnchorRef.current && ctxAnchorRef.current !== anchor) {
        ctxAnchorRef.current.classList.remove('is-ctx-active');
      }
      ctxAnchorRef.current = anchor;
      anchor?.classList.add('is-ctx-active');

      const menuItems: ContextMenuState['items'] = [];
      if (onEditCard) {
        menuItems.push({
          label: 'Edit',
          onSelect: () => onEditCard(targetFor(item)),
          icon: <EditIcon />,
        });
      }
      if (onDownloadCard) {
        menuItems.push({
          label: 'Download',
          onSelect: () => onDownloadCard(targetFor(item), { format: 'png' }),
          icon: <DownloadIcon />,
        });
      }
      if (menuItems.length === 0) return;
      setCtxMenu({ x: e.clientX, y: e.clientY, items: menuItems });
    },
    [onDownloadCard, onEditCard, targetFor],
  );

  return (
    <>
      <div className="bk-grid">
        {items.map((item) => {
          const def = kit && brand ? getDeliverable(item.sectionKey, item.storageLabel) : undefined;
          if (def && kit && brand) {
            return (
              <DeliverableCard
                key={item.storageLabel}
                def={def}
                brand={brand}
                sourceBrand={kit.sourceBrand}
                selected={kit.selectedKeys.has(def.key)}
                selectionActive={kit.selectedKeys.size > 0}
                onToggleSelect={kit.onToggleSelect}
                onGenerate={kit.onGenerate}
                onOpenReview={kit.onOpenReview}
                onOpen={kit.onOpenOwned}
                onEdit={kit.onEditItem}
                onDownload={kit.onDownloadItem}
              />
            );
          }
          return (
            <BrandKitCard
              key={item.storageLabel}
              item={item}
              onEdit={handleCardClick}
              onEditAction={
                onEditCard
                  ? (it) => {
                      // Preselect the first variant so the editor opens
                      // with a live preview instead of the cover image.
                      const target = targetFor(it);
                      onEditCard({ ...target, template: target.templates?.[0] });
                    }
                  : undefined
              }
              onDownload={
                onDownloadCard ? (it, choice) => onDownloadCard(targetFor(it), choice) : undefined
              }
              onOpenMenu={openMenu}
              cover={
                brand ? (
                  <CardCover
                    sectionKey={item.sectionKey}
                    storageLabel={item.storageLabel}
                    brand={brand}
                    sourceBrand={sourceBrand}
                    templates={variantsForCard(item.sectionKey, item.storageLabel, brand)}
                    featuredIdsByLabel={featuredIdsByLabel}
                    saved={savedContent}
                  />
                ) : null
              }
            />
          );
        })}
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

/** Section-shaped grid — every card in one storage section. Used by the
 *  lifecycle page at /b/:slug/brand-kit-next, whose IA is unchanged. */
export function SectionGrid({
  sectionKey,
  ...rest
}: Omit<CardGridProps, 'items'> & { sectionKey: KitSectionKey }) {
  return <CardGrid items={itemsForSection(sectionKey)} {...rest} />;
}

/** Catalog-shaped grid — the cards a viewer may see in one kit group. */
export function EntryGrid({
  entries,
  ...rest
}: Omit<CardGridProps, 'items'> & { entries: ReadonlyArray<KitEntry> }) {
  return (
    <CardGrid
      items={entries.map((e) => ({
        sectionKey: e.sectionKey,
        storageLabel: e.storageLabel,
        displayLabel: e.label,
      }))}
      {...rest}
    />
  );
}
