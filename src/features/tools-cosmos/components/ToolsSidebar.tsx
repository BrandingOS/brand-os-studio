import type { ComponentType } from 'react';
import {
  FolderIcon,
  ShareIcon,
  ShieldCheckIcon,
  ChartIcon,
  InboxIcon,
  LayersIcon,
} from './icons';

export type ToolsSectionKey =
  | 'assets'
  | 'share'
  | 'validation'
  | 'analytics'
  | 'approvals'
  | 'utilities';

export const TOOLS_SECTIONS: Array<{
  key: ToolsSectionKey;
  name: string;
  sub: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}> = [
  { key: 'assets', name: 'Assets', sub: 'Library & uploads', icon: FolderIcon },
  { key: 'share', name: 'Share', sub: 'Public links & portal', icon: ShareIcon },
  { key: 'validation', name: 'Validation', sub: 'Consistency & contrast', icon: ShieldCheckIcon },
  { key: 'analytics', name: 'Analytics', sub: 'Brand health', icon: ChartIcon },
  { key: 'approvals', name: 'Approvals', sub: 'Review queue', icon: InboxIcon },
  { key: 'utilities', name: 'Utilities', sub: 'Studios & makers', icon: LayersIcon },
];

type Props = {
  brandName: string;
  activeKey: ToolsSectionKey | null;
  onJump: (key: ToolsSectionKey) => void;
};

/**
 * ToolsSidebar — left rail for the Tools hub.
 *
 * Mirrors the `.panel` structure used by SetupSidebar / BrandKitSidebar
 * so the Tools tab feels like part of the same surface. Each row jumps
 * (smooth-scroll) to the matching `<Section>` in the board.
 */
export function ToolsSidebar({ brandName, activeKey, onJump }: Props) {
  return (
    <aside className="panel" aria-label="Brand tools">
      <div className="panel-top">
        <div className="panel-heading">
          <span className="panel-heading-eyebrow">Tools</span>
          <h1 className="panel-heading-title">{brandName}</h1>
        </div>
      </div>

      <nav className="panel-list">
        {TOOLS_SECTIONS.map((entry) => {
          const isActive = activeKey === entry.key;
          const Icon = entry.icon;
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
                <span className="panel-item-thumb" aria-hidden="true">
                  <Icon size={18} />
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

export default ToolsSidebar;
