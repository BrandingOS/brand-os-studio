/**
 * /tools/3d-logo-studio — public, anonymous, no Brand required.
 *
 * The same shape as every other public tool page: `WorkspaceShell` supplies the
 * top nav, the brand mark and the theme, and the editor renders the workspace
 * grid inside it. SEO metadata comes from the tool registry so the directory
 * listing and the document title cannot disagree.
 */
import { useEffect } from 'react';

import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';
import { TOOL_REGISTRY } from '@/features/tools/core';
import { Studio3dEditor } from '@/features/tools/3d-logo-studio';

export default function PublicStudio3dPage() {
  const meta = TOOL_REGISTRY['3d-logo-studio' as keyof typeof TOOL_REGISTRY];

  useEffect(() => {
    if (!meta) return;
    const prevTitle = document.title;
    document.title = meta.seo.title;
    let descTag = document.querySelector('meta[name="description"]');
    if (!descTag) {
      descTag = document.createElement('meta');
      descTag.setAttribute('name', 'description');
      document.head.appendChild(descTag);
    }
    const prevDesc = descTag.getAttribute('content');
    descTag.setAttribute('content', meta.seo.description);
    return () => {
      document.title = prevTitle;
      if (descTag && prevDesc !== null) descTag.setAttribute('content', prevDesc);
    };
  }, [meta]);

  return (
    <WorkspaceShell>
      <Studio3dEditor />
    </WorkspaceShell>
  );
}
