import { useRef, type ForwardRefExoticComponent, type RefAttributes } from 'react';
import { DsEyebrow, DsProgress } from '@/shared/ds';
import type { MockBrand } from '../data/mockBrand';
import { STRATEGY_CARDS, contentOf } from '../data/strategyCards';
import { Check, Plus } from './SetupIcons';
import {
  PenOrganicIconV2,
  PaletteOrganicIconV2,
  TypeOrganicIcon,
  TypeOrganicIconV2,
  ShapesOrganicIcon,
  PhotoOrganicIconV2,
  LinkOrganicIconV2,
  VoiceOrganicIcon,
  type OrganicIconHandle,
  type OrganicIconProps,
} from './organic-icons';

type SectionKey = 'brand' | 'logo' | 'colors' | 'fonts' | 'icons' | 'photos' | 'website' | 'voice';

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
  // The name and the slogan are words, so the typographic mark fits. V2 was
  // already in the file and unused; Typography keeps V1.
  brand: TypeOrganicIconV2,
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
    // First, because it is what the brand IS. The name was previously only
    // readable — it rendered as this panel's heading and could be changed
    // nowhere in Setup at all.
    {
      key: 'brand',
      name: 'Brand',
      sub: brand.strategy.slogan.trim() || (brand.name.trim() ? 'No slogan' : 'Not set'),
      added: brand.name.trim().length > 0,
    },
    { key: 'logo', name: 'Logo', sub: `${brand.logos.length} variants`, added: brand.logos.length > 0 },
    { key: 'colors', name: 'Color', sub: `${brand.colors.core.length + brand.colors.accent.length} colors`, added: brand.colors.core.length > 0 },
    { key: 'fonts', name: 'Typography', sub: fontSummary, added: brand.fonts.length > 0 },
    { key: 'icons', name: 'Iconography', sub: `${brand.icons.length} icons`, added: brand.icons.length > 0 },
    { key: 'website', name: 'Website', sub: websiteSummary, added: brand.websites.length > 0 },
    {
      key: 'voice',
      // The section is Brand Strategy now — the same name the review uses, and
      // the same eleven answers behind it.
      name: 'Brand Strategy',
      sub: (() => {
        const answered = STRATEGY_CARDS.filter((c) => contentOf(c, brand.strategy).trim()).length;
        const sections = brand.about.filter((a) => a.content.trim()).length;
        if (answered === 0 && sections === 0) return 'Not set';
        // What is answered out of what a strategy HAS. The old count said how
        // many cards were on screen, which the user could already see.
        const base = `${answered} / ${STRATEGY_CARDS.length} answered`;
        return sections ? `${base} · ${sections} section${sections === 1 ? '' : 's'}` : base;
      })(),
      added:
        STRATEGY_CARDS.some((c) => contentOf(c, brand.strategy).trim()) ||
        brand.about.some((a) => a.content.trim().length > 0),
    },
  ];

  const ordered = [...entries.filter((e) => e.added), ...entries.filter((e) => !e.added)];

  return (
    <aside className="panel" aria-label="Brand setup progress">
      <div className="panel-top">
        <div className="panel-heading">
          <DsEyebrow>Brand Setup</DsEyebrow>
          <h1 className="panel-heading-title">{brand.name}</h1>
        </div>
        <DsProgress
          value={total === 0 ? 0 : completed / total}
          label="Completion"
          meta={`${completed} / ${total}`}
        />
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
