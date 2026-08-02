/* Chronicle-style left workspace sidebar.
 *
 * Open (288px): workspace header → "+ New design" CTA → utility nav →
 *   "Brand" section with sections list → "Workspace" section with other
 *   brands.
 * Collapsed (56px): only the avatar + icon-only rail of the utility nav,
 *   plus a single chevron-out toggle at the top.
 *
 * Brand list is intentionally limited to the props passed in by the caller
 * — this component does no fetching. Section nav is also caller-driven so
 * the same sidebar works for the editor (Design active) and for the
 * case-study viewer (Guideline active).
 */

import {
  ChevronsLeft,
  ChevronsRight,
  Gift,
  HelpCircle,
  Plus,
  Settings,
  Sparkles as SparkleIcon,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";

export interface SidebarSection {
  id: string;
  label: string;
  icon: ReactNode;
  href?: string;
}

export interface SidebarBrand {
  id: string;
  name: string;
  slug: string;
  initial: string;
  active?: boolean;
}

interface Props {
  workspaceName: string;
  workspacePlan?: string;
  avatar?: string;
  brandSections: SidebarSection[];
  activeSectionId: string;
  onSectionClick: (id: string) => void;
  otherBrands: SidebarBrand[];
  onBrandClick: (b: SidebarBrand) => void;
  onNewDesign: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Optional current brand name shown as a section header. */
  currentBrandName?: string;
}

export function WorkspaceSidebar({
  workspaceName,
  workspacePlan,
  avatar,
  brandSections,
  activeSectionId,
  onSectionClick,
  otherBrands,
  onBrandClick,
  onNewDesign,
  collapsed,
  onToggleCollapsed,
  currentBrandName,
}: Props) {
  const initial = workspaceName.trim().slice(0, 1).toUpperCase() || "•";

  return (
    <aside className="ch-sidebar" data-collapsed={collapsed ? "true" : "false"}>
      <div className="ch-sidebar-header">
        <button
          className="ch-avatar"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Open sidebar" : "Collapse sidebar"}
          style={{ cursor: "pointer", border: 0 }}
          type="button"
        >
          {avatar ? <img src={avatar} alt="" /> : initial}
        </button>
        {!collapsed ? (
          <>
            <div className="ch-sidebar-title">
              <span className="ch-sidebar-title-name">{workspaceName}</span>
              {workspacePlan ? (
                <span className="ch-sidebar-title-sub">{workspacePlan}</span>
              ) : null}
            </div>
            <button
              className="ch-icon-btn"
              onClick={onToggleCollapsed}
              aria-label="Collapse sidebar"
              type="button"
            >
              <ChevronsLeft size={16} />
            </button>
          </>
        ) : null}
      </div>

      <div className="ch-sidebar-body">
        {!collapsed ? (
          <button className="ch-cta" onClick={onNewDesign} type="button">
            <Plus size={16} />
            <span>New design</span>
          </button>
        ) : (
          <button
            className="ch-icon-btn"
            onClick={onNewDesign}
            aria-label="New design"
            type="button"
            style={{ width: "100%", height: 32 }}
          >
            <Plus size={16} />
          </button>
        )}

        <UtilityNav collapsed={collapsed} />

        {!collapsed && currentBrandName ? (
          <div className="ch-section-label">{currentBrandName}</div>
        ) : null}

        {brandSections.map((s) => (
          <button
            key={s.id}
            className="ch-nav-item"
            data-active={s.id === activeSectionId ? "true" : "false"}
            onClick={() => onSectionClick(s.id)}
            type="button"
          >
            <span className="ch-nav-item-icon" aria-hidden>
              {s.icon}
            </span>
            {!collapsed ? (
              <span className="ch-nav-item-label">{s.label}</span>
            ) : null}
          </button>
        ))}

        {!collapsed && otherBrands.length > 0 ? (
          <div className="ch-section-label">Workspace</div>
        ) : null}

        {!collapsed
          ? otherBrands.map((b) => (
              <button
                key={b.id}
                className="ch-nav-item"
                data-active={b.active ? "true" : "false"}
                onClick={() => onBrandClick(b)}
                type="button"
              >
                <span
                  className="ch-nav-item-icon"
                  aria-hidden
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: "var(--ch-surface-hover)",
                    color: "var(--ch-text)",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  {b.initial}
                </span>
                <span className="ch-nav-item-label">{b.name}</span>
              </button>
            ))
          : null}
      </div>
    </aside>
  );
}

function UtilityNav({ collapsed }: { collapsed: boolean }) {
  const items = [
    { id: "settings", label: "Settings", icon: <Settings size={18} /> },
    { id: "refer", label: "Refer & earn", icon: <Gift size={18} /> },
    { id: "trash", label: "Trash", icon: <Trash2 size={18} /> },
    { id: "whats-new", label: "What's new", icon: <SparkleIcon size={18} /> },
    { id: "help", label: "Help & support", icon: <HelpCircle size={18} /> },
  ];

  return (
    <div style={{ paddingTop: 6 }}>
      {items.map((it) => (
        <button key={it.id} className="ch-nav-item" type="button">
          <span className="ch-nav-item-icon" aria-hidden>
            {it.icon}
          </span>
          {!collapsed ? (
            <span className="ch-nav-item-label">{it.label}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export { ChevronsLeft, ChevronsRight };
