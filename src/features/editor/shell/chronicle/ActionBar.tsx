/* Chronicle-style floating bottom action bar.
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │ + Insert │ ↻ Remix ▾ │ 🎨 Theme │ ◫ Background │  ⋯    │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Each entry opens a Radix popover above the bar. The bar itself is
 * dumb — it just renders the trigger row and owns no state. Each
 * popover's `content` slot is the menu body (see ./popovers/*).
 */

import * as Popover from "@radix-ui/react-popover";
import {
  ImageIcon,
  MoreHorizontal,
  Palette,
  Plus,
  Shuffle,
} from "lucide-react";
import type { ReactNode } from "react";

interface ActionDef {
  id: string;
  label: string;
  icon: ReactNode;
  content?: ReactNode;
  /** When true, renders a chevron after the label to signal a dropdown. */
  hasChevron?: boolean;
}

interface Props {
  /** Light/Dark mode — forwarded to portaled popovers so they inherit the
   * Chronicle CSS tokens. Radix portals mount under <body>, outside the
   * `[data-chronicle][data-mode]` root, so each popover sets the data
   * attributes on its own Content element. */
  mode: "light" | "dark";
  /** Pass null to hide a slot (e.g. case-study viewer suppresses Insert). */
  insert?: ReactNode;
  remix?: ReactNode;
  theme?: ReactNode;
  background?: ReactNode;
  /** Optional extra actions injected after the four primary slots. */
  extras?: ActionDef[];
}

export function ActionBar({ mode, insert, remix, theme, background, extras }: Props) {
  const slots: Array<{ key: string; def: ActionDef | null }> = [
    {
      key: "insert",
      def: insert
        ? {
            id: "insert",
            label: "Insert",
            icon: <Plus size={16} />,
            content: insert,
          }
        : null,
    },
    {
      key: "remix",
      def: remix
        ? {
            id: "remix",
            label: "Remix",
            icon: <Shuffle size={16} />,
            hasChevron: true,
            content: remix,
          }
        : null,
    },
    {
      key: "theme",
      def: theme
        ? {
            id: "theme",
            label: "Theme",
            icon: <Palette size={16} />,
            content: theme,
          }
        : null,
    },
    {
      key: "background",
      def: background
        ? {
            id: "background",
            label: "Background",
            icon: <ImageIcon size={16} />,
            content: background,
          }
        : null,
    },
  ];

  const visible = slots.filter((s) => s.def !== null);

  return (
    <div className="ch-actionbar" role="toolbar" aria-label="Editor actions">
      {visible.map((s, i) => (
        <ActionItem
          key={s.key}
          mode={mode}
          def={s.def as ActionDef}
          showLeftDivider={false}
          showRightDivider={i < visible.length - 1}
        />
      ))}
      {extras?.map((d) => (
        <ActionItem
          key={d.id}
          mode={mode}
          def={d}
          showLeftDivider={false}
          showRightDivider={false}
        />
      ))}
      <span className="ch-actionbar-sep" />
      <button className="ch-action" aria-label="More" type="button" style={{ padding: "8px 12px" }}>
        <MoreHorizontal size={16} />
      </button>
    </div>
  );
}

function ActionItem({
  def,
  mode,
  showLeftDivider: _l,
  showRightDivider,
}: {
  def: ActionDef;
  mode: "light" | "dark";
  showLeftDivider: boolean;
  showRightDivider: boolean;
}) {
  if (!def.content) {
    return (
      <>
        <button className="ch-action" type="button">
          {def.icon}
          <span>{def.label}</span>
        </button>
        {showRightDivider ? <span className="ch-actionbar-sep" /> : null}
      </>
    );
  }
  return (
    <>
      <Popover.Root>
        <Popover.Trigger asChild>
          <button className="ch-action" type="button" aria-label={def.label}>
            {def.icon}
            <span>{def.label}</span>
            {def.hasChevron ? <ChevronDown /> : null}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            data-chronicle="true"
            data-mode={mode}
            className="ch-popover"
            side="top"
            sideOffset={12}
            align="center"
            collisionPadding={16}
          >
            {def.content}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {showRightDivider ? <span className="ch-actionbar-sep" /> : null}
    </>
  );
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
