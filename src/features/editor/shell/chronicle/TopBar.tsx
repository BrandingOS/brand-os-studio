/* Chronicle-style top bar — two pills floating over the canvas.
 *
 * Left pill: project-name chip with a sidebar toggle (icon flips between
 * "close" and "open" based on the sidebar state).
 * Right pill: small cluster — avatar · Share · Export · Present · ⋯
 *
 * The bar is absolute-positioned by chronicle.css; this component just
 * decides what goes inside each pill.
 */

import {
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  Sun,
} from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  projectName: string;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  mode: "light" | "dark";
  onToggleMode: () => void;
  onShare?: () => void;
  onExport?: () => void;
  onPresent?: () => void;
  /** Right-side avatar (initial or src). */
  avatar?: ReactNode;
}

export function TopBar({
  projectName,
  sidebarCollapsed,
  onToggleSidebar,
  mode,
  onToggleMode,
  onShare,
  onExport,
  onPresent,
  avatar,
}: Props) {
  return (
    <header className="ch-topbar">
      <div className="ch-pill" style={{ padding: "4px 6px 4px 8px", gap: 6 }}>
        <button
          className="ch-icon-btn"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
          type="button"
        >
          {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
        <span style={{ paddingRight: 10, fontWeight: 500 }}>{projectName}</span>
      </div>

      <div className="ch-pill" style={{ padding: 4, gap: 0 }}>
        {avatar ? (
          <span
            className="ch-avatar"
            aria-hidden
            style={{ width: 26, height: 26, fontSize: 12, marginRight: 2 }}
          >
            {avatar}
          </span>
        ) : null}
        {onShare ? (
          <button className="ch-pill-btn" onClick={onShare} type="button">
            Share
          </button>
        ) : null}
        {onExport ? (
          <button className="ch-pill-btn" onClick={onExport} type="button">
            Export
          </button>
        ) : null}
        {onPresent ? (
          <button className="ch-pill-btn" onClick={onPresent} type="button">
            Present
          </button>
        ) : null}
        <span className="ch-pill-divider" />
        <button
          className="ch-icon-btn"
          onClick={onToggleMode}
          aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          type="button"
        >
          {mode === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <button className="ch-icon-btn" aria-label="More" type="button">
          <MoreHorizontal size={16} />
        </button>
      </div>
    </header>
  );
}
