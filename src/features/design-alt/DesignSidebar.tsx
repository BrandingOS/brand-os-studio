import type { ComponentType } from 'react';
import {
  SparkIcon,
  BlankCanvasIcon,
  GridIcon,
  ClockIcon,
  CalendarIcon,
  SocialIcon,
  PresentationIcon,
} from './DesignIcons';

export type DesignSectionKey =
  | 'start'
  | 'templates'
  | 'recent'
  | 'content'
  | 'social'
  | 'presentations'
  | 'ai';

type IconComponent = ComponentType<{ size?: number; className?: string }>;

type Entry = {
  key: DesignSectionKey;
  name: string;
  sub: string;
  icon: IconComponent;
};

const ENTRIES: Entry[] = [
  { key: 'start', name: 'Start', sub: 'Blank · AI · Upload', icon: BlankCanvasIcon },
  { key: 'templates', name: 'Templates', sub: 'Bento · Social · Print', icon: GridIcon },
  { key: 'recent', name: 'Recent', sub: 'Pick up where you left off', icon: ClockIcon },
  { key: 'content', name: 'Content Calendar', sub: 'Posts · Drafts', icon: CalendarIcon },
  { key: 'social', name: 'Social', sub: 'Per-platform canvases', icon: SocialIcon },
  { key: 'presentations', name: 'Presentations', sub: 'Branded decks', icon: PresentationIcon },
  { key: 'ai', name: 'AI Design', sub: 'Infinite canvas agent', icon: SparkIcon },
];

type Props = {
  brandName: string;
  activeKey: DesignSectionKey | null;
  onJump: (key: DesignSectionKey) => void;
};

/**
 * Sidebar for the Design launchpad. Mirrors the SetupSidebar look (same
 * `.panel` + `.panel-item` primitives) so the two tabs feel like one
 * system. No progress bar here — Design isn't a fillable checklist, it's
 * a starting point, so we replace the bar with a short sub-heading.
 */
export function DesignSidebar({ brandName, activeKey, onJump }: Props) {
  return (
    <aside className="panel" aria-label="Design navigation">
      <div className="panel-top">
        <div className="panel-heading">
          <span className="panel-heading-eyebrow">Design</span>
          <h1 className="panel-heading-title">{brandName}</h1>
        </div>
        <p className="design-panel-lede">
          Pick a starting point. Everything lands back in this brand.
        </p>
      </div>

      <nav className="panel-list">
        {ENTRIES.map((entry) => {
          const Icon = entry.icon;
          const isActive = activeKey === entry.key;
          return (
            <div
              key={entry.key}
              className={`panel-item${isActive ? ' is-active' : ''}`}
            >
              <button
                type="button"
                className="panel-item-body"
                onClick={() => onJump(entry.key)}
              >
                <span className="panel-item-thumb" aria-hidden>
                  <Icon size={16} />
                </span>
                <span className="panel-item-meta">
                  <span className="panel-item-name">{entry.name}</span>
                  <span className="panel-item-sub">{entry.sub}</span>
                </span>
              </button>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

export default DesignSidebar;
