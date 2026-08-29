import { useRef, type ForwardRefExoticComponent, type RefAttributes } from 'react';
import { DsEyebrow, DsProgress } from '@/shared/ds';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { Check } from '@/features/setup/components/SetupIcons';
import {
  LinkOrganicIconV2,
  PaletteOrganicIconV2,
  type OrganicIconHandle,
  type OrganicIconProps,
} from '@/features/setup/components/organic-icons';
import {
  PaperStackOrganicIcon,
  ChatBubblesOrganicIcon,
  CompassOrganicIcon,
  ChartOrganicIcon,
  PlayOrganicIcon,
} from './brand-kit-organic-icons';
import { getSectionCount } from './sections';

/**
 * Single flat list of sections — no "On this page" / "Deep editors"
 * split anymore. Every entry is a heading on the page and a
 * scroll-target in the sidebar. Most headings contain multiple
 * placeholder cards inside (business-card-sized); users drill into
 * one to customize.
 */
export type KitSectionKey =
  | 'brand-assets'
  | 'stationery'
  | 'social'
  | 'web'
  | 'brand-guides'
  | 'presentations'
  | 'animations'
  | 'mockups';

type OrganicIconComponent = ForwardRefExoticComponent<
  OrganicIconProps & RefAttributes<OrganicIconHandle>
>;

type Entry = {
  key: KitSectionKey;
  name: string;
  sub: string;
  added: boolean;
  Icon: OrganicIconComponent;
};

export const KIT_SECTIONS: { key: KitSectionKey; name: string }[] = [
  { key: 'brand-assets', name: 'Brand Assets' },
  { key: 'stationery', name: 'Stationery' },
  { key: 'social', name: 'Social Media' },
  { key: 'web', name: 'Web' },
  { key: 'brand-guides', name: 'Brand Guides' },
  { key: 'presentations', name: 'Presentations' },
  { key: 'animations', name: 'Animations' },
];

/** Per-section deliverable progress (approved / total) — drives the
 *  "2 of 4 created" sub labels + the section check state so the
 *  sidebar reflects what the user actually created. */
export type SectionProgress = Partial<
  Record<KitSectionKey, { approved: number; total: number }>
>;

function countLabel(key: KitSectionKey, progress?: SectionProgress): string {
  const p = progress?.[key];
  if (p) return `${p.approved} of ${p.total} created`;
  const n = getSectionCount(key);
  return `${n} element${n === 1 ? '' : 's'}`;
}

function buildEntries(brand: MockBrand, progress?: SectionProgress): Entry[] {
  const logoCount = brand.logos.length;
  const colorCount =
    brand.colors.core.length + brand.colors.accent.length + brand.colors.grey.length;
  const fontCount = brand.fonts.length;
  const iconCount = brand.icons.length;
  const photoCount = brand.photos.length;
  const aboutCount = brand.about.length;
  const assetCount = logoCount + colorCount + fontCount + iconCount + photoCount + aboutCount;
  const hasIdentity = logoCount > 0 && colorCount > 0;

  /** With kit progress (the brand-kit-next page): a section reads as
   *  "added" once ≥1 deliverable in it is approved. Without progress
   *  (the original brand-kit page): the pre-redesign identity-based
   *  heuristics apply, so that page looks exactly as it always did. */
  const legacyAdded: Record<KitSectionKey, boolean> = {
    'brand-assets': assetCount > 0,
    stationery: hasIdentity,
    social: hasIdentity,
    web: logoCount > 0,
    'brand-guides': true,
    presentations: true,
    animations: true,
    mockups: logoCount > 0,
  };
  const created = (key: KitSectionKey) =>
    progress ? (progress[key]?.approved ?? 0) > 0 : legacyAdded[key];

  return [
    {
      key: 'brand-assets',
      name: 'Brand Assets',
      sub: `${assetCount} item${assetCount === 1 ? '' : 's'}`,
      added: assetCount > 0,
      Icon: PaletteOrganicIconV2,
    },
    {
      key: 'stationery',
      name: 'Stationery',
      sub: countLabel('stationery', progress),
      added: created('stationery'),
      Icon: PaperStackOrganicIcon,
    },
    {
      key: 'social',
      name: 'Social Media',
      sub: countLabel('social', progress),
      added: created('social'),
      Icon: ChatBubblesOrganicIcon,
    },
    {
      key: 'web',
      name: 'Web',
      sub: countLabel('web', progress),
      added: created('web'),
      Icon: LinkOrganicIconV2,
    },
    { key: 'brand-guides', name: 'Brand Guides', sub: countLabel('brand-guides', progress), added: created('brand-guides'), Icon: CompassOrganicIcon },
    { key: 'presentations', name: 'Presentations', sub: countLabel('presentations', progress), added: created('presentations'), Icon: ChartOrganicIcon },
    { key: 'animations', name: 'Animations', sub: countLabel('animations', progress), added: created('animations'), Icon: PlayOrganicIcon },
  ];
}

type Props = {
  brand: MockBrand;
  activeKey: KitSectionKey | null;
  completed: number;
  total: number;
  sectionProgress?: SectionProgress;
  onJump: (key: KitSectionKey) => void;
};

export function BrandKitSidebar({ brand, activeKey, completed, total, sectionProgress, onJump }: Props) {
  const entries = buildEntries(brand, sectionProgress);

  return (
    <aside className="panel" aria-label="Brand Kit sections">
      <div className="panel-top">
        <div className="panel-heading">
          <DsEyebrow>Brand Kit</DsEyebrow>
          <h1 className="panel-heading-title">{brand.name}</h1>
        </div>
        <DsProgress
          value={total === 0 ? 0 : completed / total}
          label="Completion"
          meta={`${completed} / ${total}`}
        />
      </div>

      <nav className="panel-list">
        {entries.map((entry) => (
          <SectionRow
            key={entry.key}
            entry={entry}
            isActive={activeKey === entry.key}
            onClick={() => onJump(entry.key)}
          />
        ))}
      </nav>
    </aside>
  );
}

function SectionRow({
  entry,
  isActive,
  onClick,
}: {
  entry: Entry;
  isActive: boolean;
  onClick: () => void;
}) {
  const iconRef = useRef<OrganicIconHandle>(null);
  const Icon = entry.Icon;

  return (
    <div
      className={`panel-item${isActive ? ' is-active' : ''}${entry.added ? '' : ' is-missing'}`}
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
    >
      <button
        type="button"
        className="panel-item-body"
        onClick={onClick}
        onFocus={() => iconRef.current?.startAnimation()}
        onBlur={() => iconRef.current?.stopAnimation()}
      >
        {entry.added && (
          <span className="panel-item-thumb" aria-hidden>
            <Icon ref={iconRef} size={18} />
          </span>
        )}
        <span className="panel-item-meta">
          <span className="panel-item-name">{entry.name}</span>
          {entry.added && entry.sub && <span className="panel-item-sub">{entry.sub}</span>}
        </span>
      </button>
      <span className={`status-chip${entry.added ? ' is-added' : ' is-missing'}`}>
        <span className="chip-default">
          {entry.added ? <Check size={14} /> : <OutlineRing size={12} />}
        </span>
      </span>
    </div>
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
