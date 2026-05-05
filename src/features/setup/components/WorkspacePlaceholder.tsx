import type { ReactNode } from 'react';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';

/**
 * Reusable placeholder for workspace sibling tabs (Brand Kit, Guideline,
 * Design, Tools). Mirrors the Setup shell's typography and rhythm so the
 * five tabs feel like one system; content will be migrated tab-by-tab from
 * existing pages in subsequent passes.
 */
export function WorkspacePlaceholder({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <WorkspaceShell>
      <div className="workspace-empty" role="main">
        <span className="workspace-empty-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        {actions ? <div style={{ marginTop: 6, display: 'inline-flex', gap: 8 }}>{actions}</div> : null}
      </div>
    </WorkspaceShell>
  );
}

export default WorkspacePlaceholder;
