/**
 * ToolShell — three-pane editor shell shared by every tool.
 *
 * Layout:
 *
 *   ┌─ EditorChrome ─────────────────────────────────────┐
 *   │ ← back   breadcrumb · Title    save · [actions]    │
 *   ├──────────┬─────────────────────────────┬──────────┤
 *   │  left    │           center            │   right  │
 *   │  320px   │           flex-1            │   360px  │
 *   └──────────┴─────────────────────────────┴──────────┘
 *
 * The shell is identical in in-app and public mode — what changes is
 * the chrome (back link, signup nudge) and the gates wired into the
 * actions slot. The body slots are the tool's own UI.
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
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  /** Optional banner under the chrome (signup nudge in public mode). */
  banner?: ReactNode;
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
  banner,
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
        <aside className="hidden w-[320px] shrink-0 overflow-y-auto border-r bg-muted/20 md:block">
          {left}
        </aside>
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{center}</main>
        <aside className="hidden w-[360px] shrink-0 overflow-y-auto border-l bg-muted/20 lg:block">
          {right}
        </aside>
      </div>
    </div>
  );
}
