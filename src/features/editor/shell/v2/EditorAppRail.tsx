// EditorAppRail — R4 hybrid (icon + tiny label).
//
// Each rail entry is a 48×52 white card holding a 20px icon +
// a tiny 10px font-medium label. The R4 active treatment is
// preserved: purple border + soft accent glow + accent-colored
// icon. Labels make the rail self-explanatory at first glance
// without sacrificing the compact width.

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
        height: 52,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        // 6px from top before the icon, 3px gap to the label.
        // Padding handles the top inset; the inline gap below the
        // icon handles the icon→label spacing.
        paddingTop: 6,
        gap: 3,
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
      <Icon size={20} strokeWidth={2} aria-hidden />
      <span
        className="text-[10px] font-medium"
        style={{ lineHeight: 1, letterSpacing: '-0.005em' }}
      >
        {label}
      </span>
    </button>
  );
}
