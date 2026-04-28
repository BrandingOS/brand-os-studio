// EditorAppRail — flat icon rail (Round 2 fix 3).
//
// Round 2 reset: drop the card surface from the rail. Each entry is
// a flat icon-and-label button sitting directly on the editor
// background. A subtle circle behind the icon picks up hover; a more
// pronounced circle marks the active entry. ONLY the Secondary
// Panel is a card now — the rail is intentionally lighter chrome.
//
// Typography: 24px lucide icon, full --text-primary color (no
// dimming). Bold xs label below at full strength. The active state
// is communicated by the circle behind the icon, not by changing
// icon/label opacity.

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
      className="flex flex-col items-center gap-4 px-2 py-4"
      style={{
        width: 80,
        flexShrink: 0,
        // No background, no border, no shadow — flat icons on the
        // editor background. Round 2 fix 3.
      }}
      aria-label="App rail"
    >
      {ITEMS.map(({ id, label, Icon }) => (
        <RailButton
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

function RailButton({
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
      aria-label={label}
      aria-pressed={isActive}
      data-rail-item={label.toLowerCase()}
      className="flex flex-col items-center gap-1.5"
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        // Full-strength color on both states; the circle behind
        // the icon does the visual work, not text dimming.
        color: 'var(--text-primary, #0d0d0d)',
      }}
    >
      <span
        data-rail-icon-circle
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Active: a more pronounced circle; idle: transparent.
          // Hover transitions add a soft circle (the inline mouse
          // handlers below).
          background: isActive
            ? 'var(--accent-muted, rgba(13, 13, 13, 0.07))'
            : 'transparent',
          transition: 'background 160ms var(--ease, ease)',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            (e.currentTarget as HTMLElement).style.background =
              'var(--surface-hover, rgba(13, 13, 13, 0.04))';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }
        }}
      >
        <Icon size={24} strokeWidth={2} aria-hidden />
      </span>
      <span
        className="text-xs font-semibold"
        style={{ letterSpacing: '-0.005em' }}
      >
        {label}
      </span>
    </button>
  );
}
