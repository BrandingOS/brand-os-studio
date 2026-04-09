/**
 * ToolShell — flexible editor shell shared by every tool.
 *
 * Layout:
 *
 *   ┌─ EditorChrome ─────────────────────────────────────┐
 *   │ ← back   breadcrumb · Title    save · [actions]    │
 *   ├──────────────[ banner? ]──────────────────────────┤
 *   ├──────────┬─────────────────────────────┬──────────┤
 *   │          │ topBar?  (sticky toolbar)    │          │
 *   │  left?   ├─────────────────────────────┤  right?  │
 *   │  280px   │           center             │  360px   │
 *   └──────────┴─────────────────────────────┴──────────┘
 *
 * All side slots (`left`, `right`, `topBar`, `banner`) are optional.
 * Tools assemble whichever combination they need:
 *  - Variant Studio uses `left` (BrandContextRail) + `topBar` (EditBar)
 *    + `center` (gallery), no `right`.
 *  - A future tool that wants the classic three-pane editor layout
 *    can pass `left` + `center` + `right`.
 *
 * The chrome uses the canonical EditorChrome (`h-12`) so this matches
 * every other editor in BrandOS.
 */
import type { ReactNode } from 'react';
import { EditorChrome } from '@/features/editor/core';
import type { EditorSaveState } from '@/features/editor/core';
import { cn } from '@/lib/utils';

interface ToolShellProps {
  backTo: string;
  breadcrumb?: string[];
  title: ReactNode;
  saveState?: EditorSaveState;
  onRetry?: () => void;
  actions?: ReactNode;
  left?: ReactNode;
  center: ReactNode;
  right?: ReactNode;
  /** Sticky toolbar mounted above the center pane only. */
  topBar?: ReactNode;
  /** Optional banner under the chrome (signup nudge in public mode). */
  banner?: ReactNode;
  /** Override the left rail width. Defaults to 280px. */
  leftWidth?: number;
  /** Override the right rail width. Defaults to 360px. */
  rightWidth?: number;
  className?: string;
}

export function ToolShell({
  backTo,
  breadcrumb,
  title,
  saveState,
  onRetry,
  actions,
  left,
  center,
  right,
  topBar,
  banner,
  leftWidth = 280,
  rightWidth = 360,
  className,
}: ToolShellProps) {
  return (
    <div className={cn('flex h-screen flex-col bg-background', className)}>
      <EditorChrome
        backTo={backTo}
        breadcrumb={breadcrumb}
        title={title}
        saveState={saveState}
        onRetry={onRetry}
        actions={actions}
      />
      {banner}
      <div className="flex min-h-0 flex-1">
        {left && (
          <aside
            className="hidden shrink-0 overflow-y-auto border-r bg-muted/20 md:block"
            style={{ width: leftWidth }}
          >
            {left}
          </aside>
        )}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {topBar && (
            <div className="sticky top-0 z-10 shrink-0 border-b bg-background/95 backdrop-blur">
              {topBar}
            </div>
          )}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{center}</div>
        </main>
        {right && (
          <aside
            className="hidden shrink-0 overflow-y-auto border-l bg-muted/20 lg:block"
            style={{ width: rightWidth }}
          >
            {right}
          </aside>
        )}
      </div>
    </div>
  );
}
