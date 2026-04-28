// EditorAppRail — left rail with 4 tool entries.
//
// Variant 4 visual: 60px-wide column on the page background, four
// 46×50 cards (white surface, 10px radius, --border, --shadow-xs)
// stacked with the icon on top and the label inside the card.

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
      className="flex flex-col items-center gap-1.5 py-3"
      style={{
        width: 60,
        background: 'var(--background)',
        paddingLeft: 8,
        paddingRight: 4,
        flexShrink: 0,
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
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={isActive}
      data-rail-item={label.toLowerCase()}
      style={{
        width: 46,
        height: 50,
        background: isActive ? 'var(--accent-muted)' : 'var(--surface)',
        border: `1px solid ${isActive ? 'var(--border-strong)' : 'var(--border)'}`,
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        boxShadow: 'var(--shadow-xs)',
        cursor: 'pointer',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        transition:
          'background 180ms var(--ease), border-color 180ms var(--ease), transform 140ms var(--ease)',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'var(--surface-hover)';
          e.currentTarget.style.borderColor = 'var(--border-strong)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'var(--surface)';
          e.currentTarget.style.borderColor = 'var(--border)';
        }
      }}
    >
      <Icon size={15} strokeWidth={1.6} style={{ color: 'var(--text-primary)' }} />
      <span
        style={{
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: '-0.01em',
        }}
      >
        {label}
      </span>
    </button>
  );
}
