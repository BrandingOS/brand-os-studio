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
  onOpenUpload?: (key: SectionKey) => void;
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

const UPLOAD_KEYS = new Set<SectionKey>(['logo', 'icons', 'photos']);

export function SetupSidebar({ brand, activeKey, completed, total, onJump, onOpenUpload }: Props) {
  const entries: Entry[] = [
    { key: 'logo', name: 'Logo', sub: `${brand.logos.length} variants`, added: brand.logos.length > 0 },
    { key: 'colors', name: 'Color', sub: `${brand.colors.core.length + brand.colors.accent.length} colors`, added: brand.colors.core.length > 0 },
    { key: 'fonts', name: 'Typography', sub: `${brand.fonts.display.family} · ${brand.fonts.text.family}`, added: !!brand.fonts.display && !!brand.fonts.text },
    { key: 'icons', name: 'Iconography', sub: `${brand.icons.length} icons`, added: brand.icons.length > 0 },
    { key: 'photos', name: 'Photography', sub: `${brand.photos.length} references`, added: brand.photos.length > 0 },
    { key: 'website', name: 'Website', sub: brand.website.url || 'Not set', added: !!brand.website.url },
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
          const canUpload = UPLOAD_KEYS.has(entry.key) && !!onOpenUpload;
          const handleClick = () => {
            if (canUpload) onOpenUpload!(entry.key);
            else onJump(entry.key);
          };
          return (
            <SidebarItem
              key={entry.key}
              entry={entry}
              isActive={isActive}
              onClick={handleClick}
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
}: {
  entry: Entry;
  isActive: boolean;
  onClick: () => void;
}) {
  const iconRef = useRef<OrganicIconHandle>(null);
  const Icon = ICONS[entry.key];

  return (
    <button
      type="button"
      className={`panel-item${isActive ? ' is-active' : ''}${entry.added ? '' : ' is-missing'}`}
      onClick={onClick}
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
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
      <span className={`status-chip${entry.added ? ' is-added' : ' is-missing'}`}>
        <span className="chip-default">
          {entry.added ? <Check size={14} /> : <OutlineRing size={12} />}
        </span>
        <span className="chip-hover">
          <Plus size={14} />
        </span>
      </span>
    </button>
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
