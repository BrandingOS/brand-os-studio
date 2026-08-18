/**
 * The floating app rail.
 *
 * Three entries, because there are three things to do: read the document,
 * change what the brand looks like inside it, and add to it. Anything that
 * belongs to ONE page lives in that page's panel, not here.
 *
 * Same shape as the design editor's rail — square cards, icon over an 8px
 * label — so the two editors do not disagree about what a rail is. It reads
 * `--ds-*` directly rather than the editor rail's `--surface` aliases, which
 * are the temporary bridge.
 */
import { LayoutList, Palette, Plus } from 'lucide-react';

export type RailMode = 'content' | 'brand' | 'add';

const ITEMS: ReadonlyArray<{ id: RailMode; label: string; Icon: typeof Plus }> = [
  { id: 'content', label: 'Content', Icon: LayoutList },
  { id: 'brand', label: 'Brand', Icon: Palette },
  { id: 'add', label: 'Add page', Icon: Plus },
];

export function GuidelineRail({
  active,
  onChange,
}: {
  /** Undefined when the sidebar is closed — no card reads as pressed. */
  active?: RailMode;
  onChange: (mode: RailMode) => void;
}) {
  return (
    <aside className="gl-rail" aria-label="Guideline tools">
      {ITEMS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className="gl-rail-card"
          data-active={id === active || undefined}
          aria-pressed={id === active}
          onClick={() => onChange(id)}
          title={label}
        >
          <Icon size={18} strokeWidth={1.8} aria-hidden />
          <span className="gl-rail-label">{label}</span>
        </button>
      ))}
    </aside>
  );
}
