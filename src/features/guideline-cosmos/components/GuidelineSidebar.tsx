import { useRef, type ForwardRefExoticComponent, type RefAttributes } from 'react';
import { Check } from '@/features/setup/components/SetupIcons';
import {
  PenOrganicIconV2,
  PaletteOrganicIconV2,
  TypeOrganicIcon,
  PhotoOrganicIconV2,
  VoiceOrganicIcon,
  ShapesOrganicIcon,
  LinkOrganicIconV2,
  type OrganicIconHandle,
  type OrganicIconProps,
} from '@/features/setup/components/organic-icons';

export type GuidelineSectionKey =
  | 'strategy'
  | 'logo'
  | 'color'
  | 'typography'
  | 'voice'
  | 'photography'
  | 'applications';

type OrganicIconComponent = ForwardRefExoticComponent<
  OrganicIconProps & RefAttributes<OrganicIconHandle>
>;

const ICONS: Record<GuidelineSectionKey, OrganicIconComponent> = {
  strategy: ShapesOrganicIcon,
  logo: PenOrganicIconV2,
  color: PaletteOrganicIconV2,
  typography: TypeOrganicIcon,
  voice: VoiceOrganicIcon,
  photography: PhotoOrganicIconV2,
  applications: LinkOrganicIconV2,
};

export type GuidelineEntry = {
  key: GuidelineSectionKey;
  name: string;
  sub: string;
  added: boolean;
};

type Props = {
  brandName: string;
  entries: GuidelineEntry[];
  activeKey: GuidelineSectionKey | null;
  onJump: (key: GuidelineSectionKey) => void;
};

/**
 * Left sidebar for the Guideline tab — mirrors SetupSidebar visually so
 * the two tabs feel like one system, but the chip is read-only (no "add"
 * action) because guideline content is derived from the brand, not edited
 * in place on this surface.
 */
export function GuidelineSidebar({ brandName, entries, activeKey, onJump }: Props) {
  const completed = entries.filter((e) => e.added).length;
  const total = entries.length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  // Surface filled sections first, like SetupSidebar does.
  const ordered = [...entries.filter((e) => e.added), ...entries.filter((e) => !e.added)];

  return (
    <aside className="panel" aria-label="Brand guideline sections">
      <div className="panel-top">
        <div className="panel-heading">
          <span className="panel-heading-eyebrow">Brand Guideline</span>
          <h1 className="panel-heading-title">{brandName}</h1>
        </div>
        <div className="panel-progress">
          <div className="panel-progress-head">
            <span className="panel-progress-label">Documented</span>
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
        {ordered.map((entry) => (
          <SidebarItem
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

function SidebarItem({
  entry,
  isActive,
  onClick,
}: {
  entry: GuidelineEntry;
  isActive: boolean;
  onClick: () => void;
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
      <span className={`status-chip${entry.added ? ' is-added' : ' is-missing'}`}>
        <span className="chip-default">
          {entry.added ? <Check size={14} /> : <OutlineRing size={12} />}
        </span>
        <span className="chip-hover">
          <Check size={14} />
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
