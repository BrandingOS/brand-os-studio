/* Background popover — tabs (Backgrounds · Overlays · Upload · Generate).
 *
 * The Backgrounds tab shows solid color swatches + gradient tiles + a "Blur
 * background" switch + a strip of "Background style" frame styles. Overlays
 * shows a grid of 16:10 tiles. Upload shows a dropzone. Generate shows a
 * prompt textarea + Generate button.
 *
 * The host wires only the picked color / style / prompt; the menu is dumb.
 */

import { Sparkles, Upload as UploadIcon } from "lucide-react";
import { useState } from "react";

export interface BackgroundMenuProps {
  /** Solid color palette — first row are dark/neutral, second row brand-tinted. */
  colors: string[];
  gradients: Array<{ id: string; css: string }>;
  onPickColor: (hex: string) => void;
  onPickGradient: (gradient: { id: string; css: string }) => void;
  onBlurChange: (blurred: boolean) => void;
  onGenerate?: (prompt: string) => void;
  onReset?: () => void;
  /** Overlay tiles (each rendered as a 16:10 tile with the given css). */
  overlays?: Array<{ id: string; css: string }>;
}

type Tab = "backgrounds" | "overlays" | "upload" | "generate";

const DEFAULT_COLORS = [
  "#000000",
  "#0a2a6c",
  "#0e3a32",
  "#1b3a17",
  "#5a4f1f",
  "#a14a1f",
  "#8a1a1f",
  "#7a3a3f",
  "#5a2a6a",
  "#ffffff",
];

const DEFAULT_GRADIENTS = [
  { id: "g1", css: "linear-gradient(135deg, #b07a73 0%, #2b1e1a 100%)" },
  { id: "g2", css: "linear-gradient(135deg, #5a6a9a 0%, #2a2a45 100%)" },
  { id: "g3", css: "linear-gradient(135deg, #7a3a5a 0%, #2a1a25 100%)" },
  { id: "g4", css: "linear-gradient(135deg, #a5811f 0%, #2a1d05 100%)" },
  { id: "g5", css: "linear-gradient(135deg, #1e6a4a 0%, #0a1f17 100%)" },
  { id: "g6", css: "linear-gradient(135deg, #4a2a8a 0%, #0a0517 100%)" },
];

export function BackgroundMenu({
  colors = DEFAULT_COLORS,
  gradients = DEFAULT_GRADIENTS,
  onPickColor,
  onPickGradient,
  onBlurChange,
  onGenerate,
  onReset,
  overlays = [],
}: BackgroundMenuProps) {
  const [tab, setTab] = useState<Tab>("backgrounds");
  const [blurred, setBlurred] = useState(false);
  const [prompt, setPrompt] = useState("");

  return (
    <div style={{ minWidth: 360, maxWidth: 420 }}>
      <div className="ch-tabs">
        <TabButton id="backgrounds" active={tab === "backgrounds"} onClick={() => setTab("backgrounds")}>
          Backgrounds
        </TabButton>
        <TabButton id="overlays" active={tab === "overlays"} onClick={() => setTab("overlays")}>
          Overlays
        </TabButton>
        <TabButton id="upload" active={tab === "upload"} onClick={() => setTab("upload")}>
          Upload
        </TabButton>
        <TabButton id="generate" active={tab === "generate"} onClick={() => setTab("generate")}>
          Generate
        </TabButton>
        {onReset ? (
          <button className="ch-tab-reset" type="button" onClick={onReset}>
            Reset
          </button>
        ) : null}
      </div>

      <div style={{ height: 1, background: "var(--ch-divider)", marginBottom: 6 }} />

      {tab === "backgrounds" ? (
        <div style={{ padding: 6 }}>
          <div className="ch-popover-label" style={{ padding: "4px 6px" }}>
            Color
          </div>
          <div className="ch-swatch-row">
            {colors.map((c) => (
              <button
                key={c}
                className="ch-swatch"
                style={{ background: c }}
                onClick={() => onPickColor(c)}
                aria-label={c}
                type="button"
              />
            ))}
          </div>
          <div className="ch-popover-label" style={{ padding: "10px 6px 4px" }}>
            Gradients
          </div>
          <div className="ch-tile-grid">
            {gradients.map((g) => (
              <button
                key={g.id}
                className="ch-tile"
                style={{ background: g.css }}
                onClick={() => onPickGradient(g)}
                aria-label={g.id}
                type="button"
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 8px 4px",
              borderTop: "1px solid var(--ch-divider)",
              marginTop: 8,
            }}
          >
            <span style={{ fontSize: 13.5 }}>Blur background</span>
            <span style={{ flex: 1 }} />
            <Switch
              checked={blurred}
              onChange={(v) => {
                setBlurred(v);
                onBlurChange(v);
              }}
            />
          </div>
        </div>
      ) : null}

      {tab === "overlays" ? (
        <div style={{ padding: 6 }}>
          {overlays.length === 0 ? (
            <div
              style={{
                padding: 24,
                color: "var(--ch-text-faint)",
                fontSize: 13,
                textAlign: "center",
              }}
            >
              No overlays loaded.
            </div>
          ) : (
            <div className="ch-tile-grid">
              {overlays.map((o) => (
                <button key={o.id} className="ch-tile" style={{ background: o.css }} type="button" />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === "upload" ? (
        <div style={{ padding: 6 }}>
          <button
            type="button"
            style={{
              width: "100%",
              padding: "28px 12px",
              borderRadius: 12,
              border: "1.5px dashed var(--ch-border-strong)",
              background: "var(--ch-surface-hover)",
              color: "var(--ch-text)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <UploadIcon size={16} />
            <span>Drop an image or click to upload</span>
          </button>
        </div>
      ) : null}

      {tab === "generate" ? (
        <div style={{ padding: 6 }}>
          <div className="ch-popover-label" style={{ padding: "4px 6px" }}>
            <Sparkles size={12} style={{ display: "inline-block", marginRight: 6 }} />
            Generate Image
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe an image..."
            rows={4}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--ch-border-strong)",
              background: "transparent",
              color: "var(--ch-text)",
              resize: "none",
              fontFamily: "inherit",
              fontSize: 13.5,
              outline: "none",
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 0 4px" }}>
            <button
              type="button"
              onClick={() => onGenerate?.(prompt.trim())}
              disabled={!prompt.trim()}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--ch-radius-inner)",
                background: prompt.trim() ? "var(--ch-text)" : "var(--ch-surface-hover)",
                color: prompt.trim() ? "var(--ch-text-on-accent)" : "var(--ch-text-muted)",
                fontWeight: 500,
                fontSize: 13.5,
                border: 0,
                cursor: prompt.trim() ? "pointer" : "not-allowed",
              }}
            >
              Generate
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TabButton({
  id,
  active,
  onClick,
  children,
}: {
  id: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button className="ch-tab" data-active={active ? "true" : "false"} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      style={{
        width: 34,
        height: 20,
        borderRadius: 999,
        background: checked ? "var(--ch-text)" : "var(--ch-surface-active)",
        border: 0,
        cursor: "pointer",
        position: "relative",
        transition: "background 160ms var(--ch-ease)",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 16 : 2,
          width: 16,
          height: 16,
          borderRadius: 999,
          background: checked ? "var(--ch-text-on-accent)" : "var(--ch-text)",
          transition: "left 180ms var(--ch-ease)",
        }}
      />
    </button>
  );
}
