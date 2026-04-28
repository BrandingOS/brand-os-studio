// EditorAppRail — Round 3 fix 1.
//
// Each rail entry is its own small ~56×56 card containing a 20px
// icon and a tiny font-medium label. The rail itself has NO outer
// container — it's just a vertical stack of these cards floating on
// the editor background. This is the variant 4 mockup pattern
// (round 1 of 5/7 fixes added a card around the rail; round 2 then
// stripped all chrome including the per-icon cards; this round
// restores the per-icon cards while keeping the rail itself flat).

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
      className="flex flex-col items-center gap-2.5 px-2 py-3"
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
  // Idle / hover / active backgrounds — picked off the cosmos
  // surface tokens so light + dark themes both look right.
  const idleBg = 'var(--surface, #ffffff)';
  const hoverBg = 'var(--surface-hover, #f8f8f7)';
  const activeBg = 'var(--surface-sunken, #f2f1f0)';
  const idleShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
  const activeShadow = '0 2px 6px rgba(0, 0, 0, 0.08)';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={isActive}
      data-rail-item={label.toLowerCase()}
      style={{
        width: 56,
        height: 56,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        background: isActive ? activeBg : idleBg,
        border: 'none',
        borderRadius: 12,
        boxShadow: isActive ? activeShadow : idleShadow,
        cursor: 'pointer',
        // Full-strength text on every state — the active/hover
        // states are communicated by background tint + shadow,
        // never by dimming the icon or label.
        color: 'var(--text-primary, #0d0d0d)',
        // Animate background + shadow only — no scale transform
        // (the spec explicitly forbids it; matches the variant 4
        // intent of "stable icon, subtle surface change").
        transition:
          'background-color 160ms var(--ease, ease), box-shadow 160ms var(--ease, ease)',
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
        style={{ letterSpacing: '-0.005em', lineHeight: 1 }}
      >
        {label}
      </span>
    </button>
  );
}
