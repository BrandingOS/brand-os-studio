// EditorAppRail — R4 hybrid (icon + tiny label, fixed sizing).
//
// Each rail entry is a 48×56 white card holding a 20px icon +
// a tiny 10px font-medium label. Earlier 52px height left no
// safety margin once the line-box rounded up; both icon AND
// label now sit cleanly inside the card. Active treatment is
// unchanged from R4 — purple border + soft accent glow +
// accent-tinted icon.

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
}

export function EditorAppRail({ active, onChange }: Props) {
  return (
    <aside
      data-app-rail
      data-app-rail-flat="true"
      className="flex flex-col items-center gap-2 px-2 py-3"
      style={{
        width: 76,
        flexShrink: 0,
        // No background, no border, no shadow on the rail itself.
      }}
      aria-label="App rail"
    >
      {ITEMS.map(({ id, label, Icon }) => (
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
        height: 56,
        flexShrink: 0,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        // Some default browser button styles add font-family /
        // line-height that bleed into the label's line-box. Reset
        // here so the inline fontSize / lineHeight on the span are
        // the source of truth.
        font: 'inherit',
        background: idleBg,
        border: `1px solid ${isActive ? activeBorder : idleBorder}`,
        borderRadius: 10,
        boxShadow: isActive ? activeShadow : idleShadow,
        cursor: 'pointer',
        overflow: 'visible',
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
      <Icon size={20} strokeWidth={2} aria-hidden />
      <span
        style={{
          fontSize: 10,
          lineHeight: 1,
          fontWeight: 500,
          letterSpacing: '-0.005em',
          // Don't let the span shrink the icon (would happen if the
          // button were ever sized below content); pins this row to
          // its intrinsic height instead.
          flexShrink: 0,
          // Defensive — a parent text-anchor rule could otherwise
          // hijack this label.
          color: 'inherit',
        }}
      >
        {label}
      </span>
    </button>
  );
}
