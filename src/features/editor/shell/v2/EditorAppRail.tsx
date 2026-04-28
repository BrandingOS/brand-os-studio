// EditorAppRail — Round 4 (icon-only cards).
//
// Each rail entry is its own small ~44×44 white card holding ONLY
// the 20px icon. The label that lived under the icon (R3 fix 1) is
// gone — the active panel's title bar now communicates the section
// name, so the rail icon doesn't need to repeat it. The active
// state shows a purple border + soft accent glow instead of a
// background tint; that matches the reference (Relume-style
// minimal rail).

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
        width: 44,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
      <Icon size={18} strokeWidth={1.8} aria-hidden />
    </button>
  );
}
