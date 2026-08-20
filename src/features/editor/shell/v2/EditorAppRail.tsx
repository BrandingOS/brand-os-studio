// EditorAppRail — R4.2 (square, smaller label).
//
// Cards are now 48×48 squares with an 18px icon and an 8px label
// beneath. The label was 10px in R4.1 but the longer entries
// ("Templates", "Generate") wrapped past the card edge — dropping
// to 8px keeps every label inside the card. Square boxes per the
// reference. Active state still uses R4's purple border + accent
// glow.

import { LayoutGrid, Palette, Plus, Sparkles } from 'lucide-react';

export type RailItem = 'generate' | 'templates' | 'insert' | 'brand';

const ITEMS: ReadonlyArray<{
  id: RailItem;
  label: string;
  Icon: typeof Sparkles;
}> = [
  { id: 'generate', label: 'Generate', Icon: Sparkles },
  { id: 'templates', label: 'Templates', Icon: LayoutGrid },
  { id: 'insert', label: 'Insert', Icon: Plus },
  { id: 'brand', label: 'Brand', Icon: Palette },
];

interface Props {
  active: RailItem;
  onChange: (item: RailItem) => void;
  /**
   * Insert adds a LAYER to the page — meaningless for a renderer that
   * doesn't decompose its document into layers. Defaults to true so
   * every existing (Fabric) caller is unaffected.
   */
  supportsLayerEditing?: boolean;
}

export function EditorAppRail({ active, onChange, supportsLayerEditing = true }: Props) {
  const items = supportsLayerEditing ? ITEMS : ITEMS.filter((item) => item.id !== 'insert');
  return (
    <aside
      data-app-rail
      data-app-rail-flat="true"
      // No horizontal padding — the rail aside is sized to the
      // slot width (64px) and `items-center` handles horizontal
      // centering of the 48px cards. Earlier this had `px-2` on
      // a 76px-wide aside (12px wider than its 64px slot), which
      // pushed every card a few pixels right of true center.
      className="flex flex-col items-center gap-2 py-3"
      data-app-rail-variant="r4.2-labeled"
      style={{
        width: 64,
        flexShrink: 0,
      }}
      aria-label="App rail"
    >
      {items.map(({ id, label, Icon }) => (
        <RailCard
          key={id}
          Icon={Icon}
          label={label}
          isActive={id === active}
          onClick={() => onChange(id)}
        />
      ))}
    </aside>
  );
}

function RailCard({
  Icon,
  label,
  isActive,
  onClick,
}: {
  Icon: typeof Sparkles;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const idleBg = 'var(--surface, #ffffff)';
  const hoverBg = 'var(--surface-hover, #f8f8f7)';
  const idleBorder = 'var(--border, rgba(13, 13, 13, 0.10))';
  const activeBorder = 'var(--accent, #6366f1)';
  const idleShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
  // Active state — purple border + soft outer glow. Tuned to read
  // as "selected" without a heavy background tint.
  const activeShadow =
    '0 0 0 3px color-mix(in srgb, var(--accent, #6366f1) 16%, transparent), 0 1px 2px rgba(0, 0, 0, 0.04)';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={isActive}
      data-rail-item={label.toLowerCase()}
      title={label}
      style={{
        width: 48,
        height: 48,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        padding: '4px 2px',
        background: idleBg,
        border: `1px solid ${isActive ? activeBorder : idleBorder}`,
        borderRadius: 10,
        boxShadow: isActive ? activeShadow : idleShadow,
        cursor: 'pointer',
        color: isActive
          ? 'var(--accent, #6366f1)'
          : 'var(--text-primary, #0d0d0d)',
        transition:
          'background-color 160ms var(--ease, ease), border-color 160ms var(--ease, ease), box-shadow 160ms var(--ease, ease), color 160ms var(--ease, ease)',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.background = hoverBg;
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.background = idleBg;
        }
      }}
    >
      <Icon size={18} strokeWidth={2} aria-hidden />
      <span
        data-rail-label
        className="font-medium"
        style={{
          fontSize: 8,
          lineHeight: 1,
          letterSpacing: '-0.01em',
          // Belt-and-braces: clip if a future label is longer than
          // the card's content box.
          maxWidth: '100%',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'clip',
        }}
      >
        {label}
      </span>
    </button>
  );
}
