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

import { useNavigate } from 'react-router-dom';
import { ArrowRight, Share2 } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import {
  SaveStateIndicator,
  type EditorSaveState,
} from '@/features/editor/core';
import { SegmentedNav } from '@/shared/ui/SegmentedNav';
import { BrandPicker } from './BrandPicker';

// Round 2 fix 2 — the editor's top nav now mirrors /setup, /brand-kit,
// /guideline, /tools (the brand-section tabs) so the editor reads as
// a sibling page in the brand workspace. The active "Design" tab is
// the editor itself; clicking other tabs navigates to the matching
// brand-section page. Edit/Preview/Comments was a 5a mockup decision
// that felt bespoke against the rest of the workspace — it's gone.
//
// `EditorMode` stays exported for now (other call sites may import
// it) but reduces to a single value: 'edit'. Phase 4.5's preview /
// comments work will re-introduce mode switching as a sub-nav above
// the canvas, NOT in the top bar.
export type EditorMode = 'edit';

type WorkspaceSectionId =
  | 'setup'
  | 'brand-kit'
  | 'guideline'
  | 'design'
  | 'tools';

const WORKSPACE_SECTIONS: ReadonlyArray<{
  id: WorkspaceSectionId;
  label: string;
}> = [
  { id: 'setup', label: 'Setup' },
  { id: 'brand-kit', label: 'Brand Kit' },
  { id: 'guideline', label: 'Guideline' },
  { id: 'design', label: 'Design' },
  { id: 'tools', label: 'Tools' },
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
  /**
   * @deprecated EditorMode (Edit/Preview/Comments) was dropped in
   * round 2 fix 2 in favor of the workspace section nav. Kept on
   * the prop list for now so existing call sites don't error; the
   * value is ignored. Phase 4.5's preview / comments work will
   * surface as a sub-nav inside the canvas region instead.
   */
  mode?: EditorMode;
  onModeChange?: (mode: EditorMode) => void;
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
  /** Phase 4.5 — Share button. Copies the canonical share URL to
   *  clipboard. When undefined, the Share button is hidden. */
  onShare?: () => void;
  /**
   * Phase 3.5 — slot for the AI prompt bar. The Editor passes
   * <EditorAiPromptBar /> here. Sits between the workspace section
   * nav and the right cluster (save indicator + Export + theme),
   * matching the vision §3 top-chrome layout. The slot is optional
   * so callers without an AI agent (tests, dev harnesses) can still
   * render the topbar.
   */
  aiPromptSlot?: React.ReactNode;
  /**
   * Phase 4.2 — slot for the "Save as template" button. The Editor
   * passes <EditorSaveAsTemplateButton/> here. Sits in the right
   * cluster, left of Export, only when the editor has a brandKit.
   */
  saveAsTemplateSlot?: React.ReactNode;
  /**
   * Phase 5.1a — slot for the "Generate variants" button. The Editor
   * passes <EditorGenerateVariantsButton/> here. Sits in the right
   * cluster, left of Save-as-template, only when the active doc has
   * a content type with non-trivial dimension presets.
   */
  generateVariantsSlot?: React.ReactNode;
  /**
   * Phase 5.4 — slot for the "Export family" button. The Editor passes
   * <EditorExportFamilyButton/> here. Renders only when the active doc
   * has a familyId (so the button never appears on lone designs).
   */
  exportFamilySlot?: React.ReactNode;
}

export function EditorTopBar({
  brand,
  onBrandSwitch,
  onReapplyBrand,
  saveState,
  onRetrySave,
  saveEnabled = true,
  theme,
  onToggleTheme,
  onExport,
  onShare,
  aiPromptSlot,
  saveAsTemplateSlot,
  generateVariantsSlot,
  exportFamilySlot,
}: Props) {
  const navigate = useNavigate();

  // Section paths — brand-scoped when we know the slug, otherwise
  // the legacy global routes. Mirrors `buildBrandTabs` in
  // WorkspaceShell so the editor's nav navigates to the same
  // pages /setup uses.
  const sectionPath = (id: WorkspaceSectionId): string => {
    if (id === 'design') return ''; // editor IS the design surface
    if (brand?.slug) return `/b/${brand.slug}/${id}`;
    // Fallback global routes — same names WorkspaceShell uses.
    switch (id) {
      case 'setup':
        return '/setup';
      case 'brand-kit':
        return '/brand-kit';
      case 'guideline':
        return '/guideline';
      case 'tools':
        return '/tools-workspace';
      default:
        return '/';
    }
  };

  return (
    <header className="top-nav-wrap" role="banner">
      <div className="top-nav-left">
        <BrandPicker
          brand={brand}
          onBrandSwitch={onBrandSwitch}
          onReapplyBrand={onReapplyBrand}
        />
      </div>

      {/* Round 2 fix 2 — workspace section nav (Setup / Brand Kit /
          Guideline / Design / Tools). Same shared SegmentedNav
          primitive /setup uses. "Design" is always active because
          the editor IS the Design surface; clicking another section
          navigates away from the editor to that brand-section page. */}
      <SegmentedNav
        mode="state"
        ariaLabel="Brand sections"
        items={WORKSPACE_SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
        activeId="design"
        onChange={(id) => {
          const path = sectionPath(id as WorkspaceSectionId);
          if (path) navigate(path);
        }}
      />

      {aiPromptSlot ? (
        <div data-ai-prompt-slot className="flex items-center mx-2">
          {aiPromptSlot}
        </div>
      ) : null}

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
        {exportFamilySlot}
        {generateVariantsSlot}
        {saveAsTemplateSlot}
        {onShare ? (
          <button
            type="button"
            data-share-button
            onClick={onShare}
            aria-label="Copy share link"
            title="Copy share link"
            className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted/30"
            style={{ borderColor: 'var(--border)' }}
          >
            <Share2 size={14} aria-hidden />
            <span className="hidden sm:inline">Share</span>
          </button>
        ) : null}
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

