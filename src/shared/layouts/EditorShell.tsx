/**
 * EditorShell — Unified editor layout for all editor experiences.
 *
 * Supports three view modes:
 * 1. 'fixed'    — Single design view, no scroll (logo animation, single template)
 * 2. 'slides'   — Multi-page/slide scroll view (guidelines, presentations)
 * 3. 'freeform' — Infinite canvas / zoom (Figma-like, design editor)
 *
 * All modes share the same toolbar philosophy and panel system.
 */
import { ReactNode, createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils';
import { AppShell } from './AppShell';

export type EditorViewMode = 'fixed' | 'slides' | 'freeform';

interface EditorContext {
  viewMode: EditorViewMode;
  setViewMode: (mode: EditorViewMode) => void;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  zoom: number;
  setZoom: (zoom: number) => void;
}

const EditorCtx = createContext<EditorContext | null>(null);

export function useEditorShell() {
  const ctx = useContext(EditorCtx);
  if (!ctx) throw new Error('useEditorShell must be used within EditorShell');
  return ctx;
}

interface EditorShellProps {
  viewMode?: EditorViewMode;
  topbar?: ReactNode;
  leftPanel?: ReactNode;
  rightPanel?: ReactNode;
  bottombar?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function UnifiedEditorShell({
  viewMode: initialMode = 'fixed',
  topbar,
  leftPanel,
  rightPanel,
  bottombar,
  className,
  children,
}: EditorShellProps) {
  const [viewMode, setViewMode] = useState<EditorViewMode>(initialMode);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [zoom, setZoom] = useState(100);

  const ctx: EditorContext = {
    viewMode,
    setViewMode,
    leftPanelOpen,
    rightPanelOpen,
    toggleLeftPanel: () => setLeftPanelOpen((p) => !p),
    toggleRightPanel: () => setRightPanelOpen((p) => !p),
    zoom,
    setZoom,
  };

  return (
    <EditorCtx.Provider value={ctx}>
      <AppShell mode="canvas" topbar={topbar} bottombar={bottombar}>
        <div className="flex h-full overflow-hidden">
          {/* Left Panel */}
          {leftPanel && leftPanelOpen && (
            <aside className="w-64 border-r bg-background overflow-y-auto shrink-0 animate-slide-in-right">
              {leftPanel}
            </aside>
          )}

          {/* Canvas Area */}
          <div
            className={cn(
              'flex-1 relative',
              viewMode === 'fixed' && 'overflow-hidden flex items-center justify-center bg-muted',
              viewMode === 'slides' && 'overflow-y-auto bg-muted',
              viewMode === 'freeform' && 'overflow-hidden bg-muted cursor-grab',
              className,
            )}
          >
            {children}
          </div>

          {/* Right Panel */}
          {rightPanel && rightPanelOpen && (
            <aside className="w-72 border-l bg-background overflow-y-auto shrink-0">
              {rightPanel}
            </aside>
          )}
        </div>
      </AppShell>
    </EditorCtx.Provider>
  );
}

// ─── Editor TopBar ───────────────────────────────────────────────────
interface EditorTopBarProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export function EditorTopBar({ left, center, right, className }: EditorTopBarProps) {
  return (
    <header className={cn(
      'h-12 border-b bg-background flex items-center justify-between px-3 shrink-0',
      className,
    )}>
      <div className="flex items-center gap-2">{left}</div>
      <div className="flex items-center gap-2">{center}</div>
      <div className="flex items-center gap-2">{right}</div>
    </header>
  );
}

// ─── Editor BottomBar ────────────────────────────────────────────────
interface EditorBottomBarProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export function EditorBottomBar({ left, center, right, className }: EditorBottomBarProps) {
  return (
    <footer className={cn(
      'h-8 border-t bg-background flex items-center justify-between px-3 text-xs text-muted-foreground shrink-0',
      className,
    )}>
      <div className="flex items-center gap-2">{left}</div>
      <div className="flex items-center gap-2">{center}</div>
      <div className="flex items-center gap-2">{right}</div>
    </footer>
  );
}

// ─── Panel Section ───────────────────────────────────────────────────
interface PanelSectionProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}

export function PanelSection({ title, action, children, className, defaultOpen = true }: PanelSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('border-b border-border', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>{title}</span>
        <div className="flex items-center gap-1">
          {action}
          <svg
            className={cn('w-3.5 h-3.5 transition-transform', isOpen && 'rotate-180')}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {isOpen && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}
