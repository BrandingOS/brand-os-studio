// EditorPageNavigatorCollapsed — Round 3 fix 3.
//
// Collapsed state of the PageNavigator. A thin vertical strip
// (~36px wide) with a left-pointing chevron + a vertically-rotated
// "PAGES · N" label. Click anywhere on the strip expands the
// navigator. Subtle background so it reads as clickable.

import { ChevronLeft } from 'lucide-react';

interface Props {
  pageCount: number;
  onExpand: () => void;
}

export function EditorPageNavigatorCollapsed({
  pageCount,
  onExpand,
}: Props) {
  return (
    <button
      type="button"
      onClick={onExpand}
      data-page-navigator-collapsed
      aria-label="Expand pages panel"
      className="flex h-full flex-col items-center justify-between py-3"
      style={{
        width: 36,
        background: 'var(--surface, #ffffff)',
        borderLeft: '1px solid var(--border, rgba(13, 13, 13, 0.12))',
        color: 'var(--text-secondary, #6e6a69)',
        cursor: 'pointer',
        transition: 'background-color 160ms var(--ease, ease)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--surface-hover, #f5f5f4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--surface, #ffffff)';
      }}
    >
      <ChevronLeft size={16} aria-hidden />

      {/* Vertically-rotated "PAGES · N" label. writing-mode lets the
          glyphs flow top-to-bottom while keeping their orientation
          natural (no upside-down letters). */}
      <span
        data-page-navigator-collapsed-label
        className="text-[10px] font-semibold uppercase"
        style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          letterSpacing: '0.14em',
          color: 'var(--text-secondary, #6e6a69)',
        }}
      >
        Pages · {pageCount}
      </span>

      {/* Bottom spacer keeps the chevron + label visually balanced. */}
      <span aria-hidden style={{ width: 1, height: 16 }} />
    </button>
  );
}
