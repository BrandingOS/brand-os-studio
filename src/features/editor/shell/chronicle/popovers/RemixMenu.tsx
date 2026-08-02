/* Remix popover — a grid of layout variants for the current page, with
 * a footer toggle for "Generate images" and a primary Remix CTA.
 */

interface Props {
  /** 12 layout placeholders is the Chronicle default. */
  count?: number;
  generateImages: boolean;
  onToggleGenerateImages: (v: boolean) => void;
  onRemix: () => void;
}

export function RemixMenu({
  count = 12,
  generateImages,
  onToggleGenerateImages,
  onRemix,
}: Props) {
  return (
    <div style={{ minWidth: 360, maxWidth: 460 }}>
      <div className="ch-popover-label" style={{ textAlign: "center" }}>
        Text only layouts
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          padding: 6,
          maxHeight: 320,
          overflow: "auto",
        }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <button
            key={i}
            className="ch-tile"
            type="button"
            style={{ background: "var(--ch-surface-hover)" }}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 8px 4px",
          borderTop: "1px solid var(--ch-divider)",
          marginTop: 4,
          gap: 10,
        }}
      >
        <span style={{ fontSize: 13 }}>Generate images</span>
        <Switch checked={generateImages} onChange={onToggleGenerateImages} />
        <span style={{ flex: 1 }} />
        <button
          type="button"
          onClick={onRemix}
          style={{
            padding: "8px 18px",
            borderRadius: "var(--ch-radius-inner)",
            background: "var(--ch-text)",
            color: "var(--ch-text-on-accent)",
            fontWeight: 500,
            fontSize: 13.5,
            border: 0,
            cursor: "pointer",
          }}
        >
          Remix
        </button>
      </div>
    </div>
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
