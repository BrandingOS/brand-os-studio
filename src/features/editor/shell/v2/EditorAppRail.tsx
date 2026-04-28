// EditorAppRail — R4.1 (hybrid: compact card + tiny label).
//
// Slight expansion of the R4 icon-only card. The card is 48×52
// instead of 44×44, with the 20px icon sitting near the top and a
// tiny `text-[10px]` label centered below it. The active state
// keeps R4's purple border + soft accent glow (no background-tint
// swap), and idle/hover stays the same. The label is small enough
// not to compete visually with the active panel's header bar but
// makes the rail self-explanatory at a glance.

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
      data-app-rail-variant="r4.1-labeled"
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
        gap: 3,
        paddingTop: 6,
        paddingBottom: 4,
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
        data-rail-label
        className="text-[10px] font-medium"
        style={{ lineHeight: 1, letterSpacing: '-0.005em' }}
      >
        {label}
      </span>
    </button>
  );
}
