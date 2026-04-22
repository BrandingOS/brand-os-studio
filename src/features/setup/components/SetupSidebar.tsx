import { useRef, type ForwardRefExoticComponent, type RefAttributes } from 'react';
import type { MockBrand } from '../data/mockBrand';
import { Check, Plus } from './SetupIcons';
import {
  PenOrganicIconV2,
  PaletteOrganicIconV2,
  TypeOrganicIcon,
  ShapesOrganicIcon,
  PhotoOrganicIconV2,
  LinkOrganicIconV2,
  VoiceOrganicIcon,
  type OrganicIconHandle,
  type OrganicIconProps,
} from './organic-icons';

type SectionKey = 'logo' | 'colors' | 'fonts' | 'icons' | 'photos' | 'website' | 'voice';

type Props = {
  brand: MockBrand;
  activeKey: SectionKey | null;
  completed: number;
  total: number;
  onJump: (key: SectionKey) => void;
  /** Optional: when provided, the chip on each row becomes an
   *  interactive add-button that jumps to the section and opens its add
   *  flow directly, without the user needing to click + on the board. */
  onAdd?: (key: SectionKey) => void;
};

type OrganicIconComponent = ForwardRefExoticComponent<
  OrganicIconProps & RefAttributes<OrganicIconHandle>
>;

const ICONS: Record<SectionKey, OrganicIconComponent> = {
  logo: PenOrganicIconV2,
  colors: PaletteOrganicIconV2,
  fonts: TypeOrganicIcon,
  icons: ShapesOrganicIcon,
  photos: PhotoOrganicIconV2,
  website: LinkOrganicIconV2,
  voice: VoiceOrganicIcon,
};

type Entry = {
  key: SectionKey;
  name: string;
  sub: string;
  added: boolean;
};

export function SetupSidebar({ brand, activeKey, completed, total, onJump, onAdd }: Props) {
  const fontSummary = brand.fonts.length === 0
    ? 'Not set'
    : brand.fonts.length === 1
    ? brand.fonts[0].family
    : `${brand.fonts[0].family} · ${brand.fonts[1].family}`;
  const websiteSummary = brand.websites.length === 0
    ? 'Not set'
    : brand.websites.length === 1
    ? brand.websites[0].url
    : `${brand.websites.length} sites`;

  const entries: Entry[] = [
    { key: 'logo', name: 'Logo', sub: `${brand.logos.length} variants`, added: brand.logos.length > 0 },
    { key: 'colors', name: 'Color', sub: `${brand.colors.core.length + brand.colors.accent.length} colors`, added: brand.colors.core.length > 0 },
    { key: 'fonts', name: 'Typography', sub: fontSummary, added: brand.fonts.length > 0 },
    { key: 'icons', name: 'Iconography', sub: `${brand.icons.length} icons`, added: brand.icons.length > 0 },
    { key: 'photos', name: 'Photography', sub: `${brand.photos.length} references`, added: brand.photos.length > 0 },
    { key: 'website', name: 'Website', sub: websiteSummary, added: brand.websites.length > 0 },
    { key: 'voice', name: 'Voice & Tone', sub: `${brand.voice.pillars.length} pillars`, added: brand.voice.essay.length > 0 },
  ];

  const ordered = [...entries.filter((e) => e.added), ...entries.filter((e) => !e.added)];

  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <aside className="panel" aria-label="Brand setup progress">
      <div className="panel-top">
        <div className="panel-heading">
          <span className="panel-heading-eyebrow">Brand Setup</span>
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
        {ordered.map((entry) => {
          const isActive = activeKey === entry.key;
          return (
            <SidebarItem
              key={entry.key}
              entry={entry}
              isActive={isActive}
              onClick={() => onJump(entry.key)}
              onAdd={onAdd ? () => onAdd(entry.key) : undefined}
            />
          );
        })}
      </nav>
    </aside>
  );
}

function SidebarItem({
  entry,
  isActive,
  onClick,
  onAdd,
}: {
  entry: Entry;
  isActive: boolean;
  onClick: () => void;
  onAdd?: () => void;
}) {
  const iconRef = useRef<OrganicIconHandle>(null);
  const Icon = ICONS[entry.key];

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
          {entry.added && <span className="panel-item-sub">{entry.sub}</span>}
        </span>
      </button>
      {onAdd ? (
        <button
          type="button"
          className={`status-chip is-button${entry.added ? ' is-added' : ' is-missing'}`}
          aria-label={`Add to ${entry.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
        >
          <span className="chip-default">
            {entry.added ? <Check size={14} /> : <OutlineRing size={12} />}
          </span>
          <span className="chip-hover">
            <Plus size={14} />
          </span>
        </button>
      ) : (
        <span className={`status-chip${entry.added ? ' is-added' : ' is-missing'}`}>
          <span className="chip-default">
            {entry.added ? <Check size={14} /> : <OutlineRing size={12} />}
          </span>
          <span className="chip-hover">
            <Plus size={14} />
          </span>
        </span>
      )}
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

export type { SectionKey };
