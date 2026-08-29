import { useRef, type ForwardRefExoticComponent, type RefAttributes } from 'react';
import { DsEyebrow, DsProgress } from '@/shared/ds';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { Check } from '@/features/setup/components/SetupIcons';
import {
  LinkOrganicIconV2,
  PaletteOrganicIcon,
  PaletteOrganicIconV2,
  PenOrganicIconV2,
  PhotoOrganicIconV2,
  ShapesOrganicIcon,
  TypeOrganicIconV2,
  type OrganicIconHandle,
  type OrganicIconProps,
} from '@/features/setup/components/organic-icons';
import {
  PaperStackOrganicIcon,
  ChatBubblesOrganicIcon,
  CompassOrganicIcon,
  ChartOrganicIcon,
  CubeOrganicIcon,
  PlayOrganicIcon,
} from './brand-kit-organic-icons';
import type { KitEntry, KitGroup } from '../catalog/catalog';
import type { DeliverableKey } from '../kit/types';

/**
 * The Brand Kit's sidebar — one continuous list of ITEMS, not a folder
 * tree of sections.
 *
 * This is the navigation change. Before, the sidebar listed seven
 * sections and every item lived one level down, so moving from Business
 * Card to Invoice meant going back out to the board and in again. Now
 * every item the user may see is a row, grouped under a subtle label,
 * with the open one highlighted — so switching between two items is a
 * single click from wherever you are.
 *
 * The vocabulary is the house style and not a new one: `.panel-group-label`
 * for the group headings and `.panel-item` / `.is-active` for the rows,
 * the same pair the guideline builder, the editor's Insert panel and the
 * mockup gallery already use. Nothing here is a bespoke control.
 *
 * `BrandKitSidebar` (section-level) is deliberately untouched — it still
 * serves the lifecycle page at /b/:slug/brand-kit-next, which has its own
 * IA and is not part of this simplification.
 */

type OrganicIconComponent = ForwardRefExoticComponent<
  OrganicIconProps & RefAttributes<OrganicIconHandle>
>;

/**
 * Row icon per item. Keyed by STORAGE key so a display rename can never
 * silently drop an icon, with a per-group fallback for anything new.
 */
const ICON_BY_KEY: Record<string, OrganicIconComponent> = {
  'brand-assets::Logos': ShapesOrganicIcon,
  'brand-assets::Colors': PaletteOrganicIconV2,
  'brand-assets::Fonts': TypeOrganicIconV2,
  'brand-assets::Icons': CubeOrganicIcon,
  'brand-assets::Photos': PhotoOrganicIconV2,
  'brand-assets::About': CompassOrganicIcon,

  'stationery::Business Card': PaperStackOrganicIcon,
  'stationery::Letterhead': PenOrganicIconV2,
  'stationery::Invoice': PaperStackOrganicIcon,
  'stationery::Envelope': PaperStackOrganicIcon,
  'web::Email Signature': LinkOrganicIconV2,

  'social::Social Media System': ChatBubblesOrganicIcon,
  'presentations::Presentation System': ChartOrganicIcon,
  'presentations::Brand Board': PaletteOrganicIcon,
};

const ICON_BY_GROUP: Record<KitGroup, OrganicIconComponent> = {
  assets: ShapesOrganicIcon,
  applications: PaperStackOrganicIcon,
  social: ChatBubblesOrganicIcon,
  presentations: PlayOrganicIcon,
  mockups: CubeOrganicIcon,
};

function iconFor(entry: KitEntry): OrganicIconComponent {
  return ICON_BY_KEY[entry.key] ?? ICON_BY_GROUP[entry.group];
}

/**
 * Whether an item has something real to show for THIS brand.
 *
 * Brand assets answer from the brand itself. Everything else is drawn
 * from the brand's identity, so it is ready as soon as the brand has a
 * logo and a colour — which is exactly the condition the section-level
 * sidebar used before, kept so the check marks don't change meaning.
 */
export function entryIsReady(entry: KitEntry, brand: MockBrand): boolean {
  const hasIdentity = brand.logos.length > 0 && brand.colors.core.length > 0;
  switch (entry.key) {
    case 'brand-assets::Logos':
      return brand.logos.length > 0;
    case 'brand-assets::Colors':
      return (
        brand.colors.core.length + brand.colors.accent.length + brand.colors.grey.length > 0
      );
    case 'brand-assets::Fonts':
      return brand.fonts.length > 0;
    case 'brand-assets::Icons':
      return brand.icons.length > 0;
    case 'brand-assets::Photos':
      return brand.photos.length > 0;
    case 'brand-assets::About':
      // Strategy reads Setup's eleven answers first and the free-form
      // sections second, so either one makes it worth opening.
      return (
        brand.about.length > 0 ||
        Object.values(brand.strategy ?? {}).some((v) =>
          Array.isArray(v) ? v.length > 0 : Boolean(v),
        )
      );
    default:
      return hasIdentity;
  }
}

export type KitSidebarGroup = { id: KitGroup; label: string; entries: KitEntry[] };

type Props = {
  brand: MockBrand;
  groups: KitSidebarGroup[];
  /** Storage key of the open item, or null when the Overview is showing. */
  activeKey: DeliverableKey | null;
  onSelectOverview: () => void;
  onSelectEntry: (entry: KitEntry) => void;
};

export function KitSidebar({
  brand,
  groups,
  activeKey,
  onSelectOverview,
  onSelectEntry,
}: Props) {
  const all = groups.flatMap((g) => g.entries);
  const ready = all.filter((e) => entryIsReady(e, brand)).length;

  return (
    <aside className="panel" aria-label="Brand Kit">
      <div className="panel-top">
        <div className="panel-heading">
          <DsEyebrow>Brand Kit</DsEyebrow>
          <h1 className="panel-heading-title">{brand.name}</h1>
        </div>
        <DsProgress
          value={all.length === 0 ? 0 : ready / all.length}
          label="Completion"
          meta={`${ready} / ${all.length}`}
        />
      </div>

      <nav className="panel-list">
        <OverviewRow isActive={activeKey === null} onClick={onSelectOverview} />
        {groups.map((group) => (
          <div key={group.id} className="bk-nav-group">
            <div className="panel-group-label">{group.label}</div>
            {group.entries.map((entry) => (
              <ItemRow
                key={entry.key}
                entry={entry}
                ready={entryIsReady(entry, brand)}
                isActive={activeKey === entry.key}
                onClick={() => onSelectEntry(entry)}
              />
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}

/** The way back to the whole kit. First row, above every group. */
function OverviewRow({ isActive, onClick }: { isActive: boolean; onClick: () => void }) {
  return (
    <div className={`panel-item${isActive ? ' is-active' : ''}`}>
      <button type="button" className="panel-item-body" onClick={onClick}>
        <span className="panel-item-thumb" aria-hidden>
          <GridGlyph />
        </span>
        <span className="panel-item-meta">
          <span className="panel-item-name">Overview</span>
        </span>
      </button>
    </div>
  );
}

function ItemRow({
  entry,
  ready,
  isActive,
  onClick,
}: {
  entry: KitEntry;
  ready: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  const iconRef = useRef<OrganicIconHandle>(null);
  const Icon = iconFor(entry);
  // Only a viewer entitled to see a non-active capability ever renders
  // this row, so the badge is a note to that viewer about what they are
  // looking at — never something a normal user can be shown.
  const badge = entry.state === 'active' ? null : entry.state;

  return (
    <div
      className={`panel-item${isActive ? ' is-active' : ''}${ready ? '' : ' is-missing'}`}
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
    >
      <button
        type="button"
        className="panel-item-body"
        onClick={onClick}
        aria-current={isActive ? 'true' : undefined}
        onFocus={() => iconRef.current?.startAnimation()}
        onBlur={() => iconRef.current?.stopAnimation()}
      >
        <span className="panel-item-thumb" aria-hidden>
          <Icon ref={iconRef} size={18} />
        </span>
        <span className="panel-item-meta">
          <span className="panel-item-name">{entry.label}</span>
          {badge && <span className="bk-nav-badge">{badge}</span>}
        </span>
      </button>
      <span className={`status-chip${ready ? ' is-added' : ' is-missing'}`}>
        <span className="chip-default">
          {ready ? <Check size={14} /> : <OutlineRing size={12} />}
        </span>
      </span>
    </div>
  );
}

function GridGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function OutlineRing({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeDasharray="2.5 2"
        fill="none"
      />
    </svg>
  );
}
