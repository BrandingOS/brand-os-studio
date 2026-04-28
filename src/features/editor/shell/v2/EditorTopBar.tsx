// EditorTopBar — cosmos top-nav for the unified editor.
//
// Variant 4 (approved Step 5 direction). Three-column layout:
//   • LEFT  — brand picker (current brand + chevron). 5a is mocked:
//             the dropdown opens but only shows the current brand;
//             5b wires `IBrandsService.list()` and route navigation.
//   • CENTER — segmented Edit / Preview / Comments pill. Only "Edit"
//             is functional in 5a; the others are visual placeholders.
//   • RIGHT — Export pill-btn--primary + theme toggle.
//
// Save state lives inline left of the Export button so the user can
// always see whether their changes are persisted.

import { ArrowRight } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import {
  SaveStateIndicator,
  type EditorSaveState,
} from '@/features/editor/core';
import { SegmentedNav } from '@/shared/ui/SegmentedNav';
import { BrandPicker } from './BrandPicker';

export type EditorMode = 'edit' | 'preview' | 'comments';

const MODES: ReadonlyArray<{ id: EditorMode; label: string }> = [
  { id: 'edit', label: 'Edit' },
  { id: 'preview', label: 'Preview' },
  { id: 'comments', label: 'Comments' },
];

interface Props {
  /** Current brand being edited. Optional — when absent the picker
   *  shows a placeholder mark and the dropdown still lists brands. */
  brand?: Brand;
  /**
   * Fired when the user picks a different brand from the dropdown.
   * Brand switching is fully wired in Phase 4.5 (canonical
   * `/b/:brandSlug/design/:designSlug` route). The parent component
   * is responsible for handling brand changes via this callback.
   */
  onBrandSwitch?: (slug: string) => void;
  /**
   * Fired when the user picks "Re-apply brand kit" from the brand
   * dropdown. Editor wires this to applyBrandToDocument inside
   * adapter.batch.
   */
  onReapplyBrand?: () => void;
  /** Current editor mode. Only 'edit' is functional in 5a. */
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  /** Auto-save state — feeds the inline indicator. */
  saveState: EditorSaveState;
  onRetrySave?: () => void;
  /** When false, the topbar replaces the live save indicator with a
   *  small "Dev — saves disabled" badge. Used by /_dev/editor. */
  saveEnabled?: boolean;
  /** Theme — driven by the cosmos data-theme attribute on the wrapper. */
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  /** Optional Export click handler. 5a fires a placeholder; real
   *  export wiring is part of Phase 4 (templates). */
  onExport?: () => void;
}

export function EditorTopBar({
  brand,
  onBrandSwitch,
  onReapplyBrand,
  mode,
  onModeChange,
  saveState,
  onRetrySave,
  saveEnabled = true,
  theme,
  onToggleTheme,
  onExport,
}: Props) {
  return (
    <header className="top-nav-wrap" role="banner">
      <div className="top-nav-left">
        <BrandPicker
          brand={brand}
          onBrandSwitch={onBrandSwitch}
          onReapplyBrand={onReapplyBrand}
        />
      </div>

      {/* Step 5/7 fix 2 — uses the shared SegmentedNav so this nav
          stays visually identical to the workspace nav at /setup,
          /brand-kit, /guideline, /design, /tools. The cosmos
          `.segmented-nav-*` styling, the moving active pill, and
          the open keyframe all live in one place now. */}
      <SegmentedNav
        mode="state"
        ariaLabel="Editor mode"
        items={MODES.map((m) => ({ id: m.id, label: m.label }))}
        activeId={mode}
        onChange={(id) => onModeChange(id as EditorMode)}
      />

      <div className="top-nav-right">
        {saveEnabled ? (
          <SaveStateIndicator state={saveState} onRetry={onRetrySave} />
        ) : (
          <span
            data-save-disabled-badge
            className="rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{
              background: 'var(--surface-sunken, #f2f1f0)',
              color: 'var(--text-secondary, #6e6a69)',
              border: '1px solid var(--border, rgba(13, 13, 13, 0.12))',
            }}
            title="Auto-save is disabled in this dev harness."
          >
            Dev — saves disabled
          </span>
        )}
        <button
          type="button"
          className="pill-btn pill-btn--primary"
          onClick={onExport}
        >
          <span>Export</span>
          <ArrowRight size={14} className="pill-btn-arrow" />
        </button>
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label="Toggle light and dark mode"
          title="Toggle theme"
        >
          {/* Both icons render — cosmos CSS hides one based on
              [data-theme] on the workspace root. */}
          <svg
            className="theme-icon theme-icon-sun"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
          <svg
            className="theme-icon theme-icon-moon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <span className="sr-only">{theme}</span>
        </button>
      </div>
    </header>
  );
}

