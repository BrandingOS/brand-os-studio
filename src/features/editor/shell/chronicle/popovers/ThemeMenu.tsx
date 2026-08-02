/* Theme popover — preset themes + "this chapter / whole document" scope.
 *
 *   ┌─────────────────────────────────────────┐
 *   │ [ This chapter ] [ Whole document ]     │
 *   ├─────────────────────────────────────────┤
 *   │ Preset themes                           │
 *   │ ▢ Chronicle                              │
 *   │ ▢ Minimal                                │
 *   │ ▢ New classic                            │
 *   │ ▢ Retro tech                             │
 *   │ ▢ Bold minimalist                        │
 *   ├─────────────────────────────────────────┤
 *   │ 🎨 Create theme                  [Pro]   │
 *   └─────────────────────────────────────────┘
 */

import { Palette } from "lucide-react";
import { useState } from "react";

export interface ThemePreset {
  id: string;
  label: string;
  /** Five swatches (or undefined) shown as a tiny palette preview. */
  swatch?: [string, string, string, string?, string?];
}

interface Props {
  presets: ThemePreset[];
  activeId?: string;
  onPick: (preset: ThemePreset, scope: "chapter" | "document") => void;
  onCreate?: () => void;
}

const DEFAULT_PRESETS: ThemePreset[] = [
  { id: "chronicle", label: "Chronicle", swatch: ["#0a0a0b", "#e8e8e8", "#7a7a7a"] },
  { id: "minimal", label: "Minimal", swatch: ["#ffffff", "#111111", "#999999"] },
  { id: "new-classic", label: "New classic", swatch: ["#f2eee5", "#222", "#8c6a3c"] },
  { id: "retro-tech", label: "Retro tech", swatch: ["#0c1126", "#7df9ff", "#ff7ac0"] },
  { id: "bold-minimalist", label: "Bold minimalist", swatch: ["#000", "#fff", "#ffc400"] },
];

export function ThemeMenu({
  presets = DEFAULT_PRESETS,
  activeId,
  onPick,
  onCreate,
}: Props) {
  const [scope, setScope] = useState<"chapter" | "document">("chapter");

  return (
    <div style={{ minWidth: 280, padding: 4 }}>
      <div
        style={{
          display: "inline-flex",
          padding: 4,
          gap: 4,
          background: "var(--ch-surface-hover)",
          borderRadius: "var(--ch-radius-outer)",
          margin: "4px 4px 10px",
        }}
      >
        <ScopeChip
          active={scope === "chapter"}
          onClick={() => setScope("chapter")}
          label="This chapter"
        />
        <ScopeChip
          active={scope === "document"}
          onClick={() => setScope("document")}
          label="Whole document"
        />
      </div>

      <div className="ch-popover-label">Preset themes</div>
      <div className="ch-popover-section">
        {presets.map((p) => (
          <button
            key={p.id}
            className="ch-popover-row"
            onClick={() => onPick(p, scope)}
            style={{ width: "100%", border: 0, background: "transparent", textAlign: "left" }}
            type="button"
          >
            <span
              className="lead"
              style={{
                width: 38,
                height: 28,
                borderRadius: 6,
                border: "1px solid var(--ch-border)",
                background: p.swatch
                  ? `linear-gradient(135deg, ${p.swatch[0]} 0%, ${p.swatch[0]} 50%, ${p.swatch[1]} 50%, ${p.swatch[1]} 100%)`
                  : "var(--ch-surface-hover)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {p.swatch?.[2] ? (
                <span
                  style={{
                    position: "absolute",
                    right: 4,
                    bottom: 4,
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: p.swatch[2],
                  }}
                />
              ) : null}
            </span>
            <span className="label">{p.label}</span>
            {activeId === p.id ? <span className="chev">✓</span> : null}
          </button>
        ))}
      </div>

      {onCreate ? (
        <>
          <div style={{ height: 1, background: "var(--ch-divider)", margin: "4px 0" }} />
          <button
            className="ch-popover-row"
            onClick={onCreate}
            type="button"
            style={{ width: "100%", border: 0, background: "transparent", textAlign: "left" }}
          >
            <span className="lead">
              <Palette size={16} />
            </span>
            <span className="label">Create theme</span>
            <span
              className="chev"
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 6,
                background: "var(--ch-surface-hover)",
                color: "var(--ch-text-muted)",
              }}
            >
              Pro
            </span>
          </button>
        </>
      ) : null}
    </div>
  );
}

function ScopeChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        padding: "5px 12px",
        borderRadius: "var(--ch-radius-inner)",
        background: active ? "var(--ch-surface-solid)" : "transparent",
        color: "var(--ch-text)",
        border: 0,
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        boxShadow: active ? "0 1px 2px rgba(0,0,0,.15)" : "none",
      }}
    >
      {label}
    </button>
  );
}
