import { useRef, type ForwardRefExoticComponent, type RefAttributes } from 'react';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { Check } from '@/features/setup/components/SetupIcons';
import {
  LinkOrganicIconV2,
  type OrganicIconHandle,
  type OrganicIconProps,
} from '@/features/setup/components/organic-icons';
import {
  PaperStackOrganicIcon,
  ChatBubblesOrganicIcon,
  CubeOrganicIcon,
  CompassOrganicIcon,
  ChartOrganicIcon,
  PlayOrganicIcon,
  QrOrganicIcon,
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
  | 'stationery'
  | 'social'
  | 'web'
  | 'mockups'
  | 'brand-guides'
  | 'presentations'
  | 'animations'
  | 'qr-code';

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
  { key: 'stationery', name: 'Stationery' },
  { key: 'social', name: 'Social Media' },
  { key: 'web', name: 'Web' },
  { key: 'mockups', name: 'Mockups' },
  { key: 'brand-guides', name: 'Brand Guides' },
  { key: 'presentations', name: 'Presentations' },
  { key: 'animations', name: 'Animations' },
  { key: 'qr-code', name: 'QR Code' },
];

function countLabel(key: KitSectionKey): string {
  const n = getSectionCount(key);
  return `${n} element${n === 1 ? '' : 's'}`;
}

function buildEntries(brand: MockBrand): Entry[] {
  const logoCount = brand.logos.length;
  const colorCount =
    brand.colors.core.length + brand.colors.accent.length + brand.colors.grey.length;
  const hasIdentity = logoCount > 0 && colorCount > 0;

  return [
    {
      key: 'stationery',
      name: 'Stationery',
      sub: countLabel('stationery'),
      added: hasIdentity,
      Icon: PaperStackOrganicIcon,
    },
    {
      key: 'social',
      name: 'Social Media',
      sub: countLabel('social'),
      added: hasIdentity,
      Icon: ChatBubblesOrganicIcon,
    },
    {
      key: 'web',
      name: 'Web',
      sub: countLabel('web'),
      added: logoCount > 0,
      Icon: LinkOrganicIconV2,
    },
    {
      key: 'mockups',
      name: 'Mockups',
      sub: countLabel('mockups'),
      added: logoCount > 0,
      Icon: CubeOrganicIcon,
    },
    { key: 'brand-guides', name: 'Brand Guides', sub: countLabel('brand-guides'), added: true, Icon: CompassOrganicIcon },
    { key: 'presentations', name: 'Presentations', sub: countLabel('presentations'), added: true, Icon: ChartOrganicIcon },
    { key: 'animations', name: 'Animations', sub: countLabel('animations'), added: true, Icon: PlayOrganicIcon },
    { key: 'qr-code', name: 'QR Code', sub: countLabel('qr-code'), added: true, Icon: QrOrganicIcon },
  ];
}

type Props = {
  brand: MockBrand;
  activeKey: KitSectionKey | null;
  completed: number;
  total: number;
  onJump: (key: KitSectionKey) => void;
};

export function BrandKitSidebar({ brand, activeKey, completed, total, onJump }: Props) {
  const entries = buildEntries(brand);
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <aside className="panel" aria-label="Brand Kit sections">
      <div className="panel-top">
        <div className="panel-heading">
          <span className="panel-heading-eyebrow">Brand Kit</span>
          <h1 className="panel-heading-title">{brand.name}</h1>
        </div>
        <div className="panel-progress">
          <div className="panel-progress-head">
            <span className="panel-progress-label">Completion</span>
            <span className="panel-progress-count">
              {completed} / {total}
            </span>
          </div>
          <div className="panel-progress-bar">
            <div className="panel-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
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
