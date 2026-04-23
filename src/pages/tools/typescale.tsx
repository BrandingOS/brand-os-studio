/**
 * /tools/typescale — single-surface public route.
 *
 * Public, anonymous. The editor mounts directly; tool session
 * persistence and export gating come from the platform.
 */
import { useEffect, useMemo } from 'react';

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
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-4 text-2xl font-semibold">{meta?.name}</h1>
        <p className="mb-6 text-sm text-muted-foreground">{meta?.tagline}</p>
        <TypescaleEditor variant="full" initial={initial} />
      </div>
    </div>
  );
}
