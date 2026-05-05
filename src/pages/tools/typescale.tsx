/**
 * /tools/typescale — single-surface public route.
 *
 * Public, anonymous. The editor mounts directly; tool session
 * persistence and export gating come from the platform.
 *
 * The whole page is wrapped in <WorkspaceShell> so the tool
 * inherits the same top nav + theme toggle as every other workspace
 * page. The editor itself renders the cosmos `.shell` grid.
 */
import { useEffect, useMemo } from 'react';

import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';
import { TypescaleEditor, seedTypescale } from '@/features/tools/typescale';
import { TOOL_REGISTRY } from '@/features/tools/core';

export default function PublicTypescalePage() {
  const meta = TOOL_REGISTRY['typescale' as keyof typeof TOOL_REGISTRY];
  const initial = useMemo(() => seedTypescale(null), []);

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
      <TypescaleEditor variant="full" initial={initial} />
    </WorkspaceShell>
  );
}
