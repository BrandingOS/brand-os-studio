/**
 * /tools/logo-variant-generator — public landing + studio for the
 * Logo Variant Studio.
 *
 * State machine:
 *   - No source loaded → render <ToolLanding>
 *   - Source loaded     → render <VariantStudio mode="public">
 *
 * The transition is purely client-side. The landing's `onLaunch`
 * handler creates a `SourceLogo` from the file/sample and stashes it
 * in component state, which the studio picks up via its `initialSource`
 * prop.
 */
import { useCallback, useState } from 'react';
import { ToolLanding, TOOL_REGISTRY, type LandingSource } from '@/features/tools/core';
import { VariantStudio } from '@/features/tools/variant-studio';
// Side effect: register the materializer for claim flow.
import '@/features/tools/variant-studio/materializer';
import type { SourceLogo } from '@/features/tools/variant-studio/engine/types';

const TOOL_SLUG = 'logo-variant-generator' as const;

export default function PublicVariantStudioPage() {
  const meta = TOOL_REGISTRY[TOOL_SLUG];
  const [source, setSource] = useState<SourceLogo | null>(null);

  const handleLaunch = useCallback(async (input: LandingSource) => {
    if (input.kind === 'file' && input.file) {
      const next = await fileToSource(input.file);
      setSource(next);
      return;
    }
    if (input.kind === 'svg' && input.svg) {
      setSource({
        id: `paste-${Date.now()}`,
        kind: 'uploaded',
        original: { svg: input.svg, width: 512, height: 512 },
        wordmark: { text: 'Brand', fontFamily: 'Inter, sans-serif' },
      });
      return;
    }
    if (input.kind === 'sample') {
      setSource(SAMPLE);
    }
  }, []);

  if (!source) {
    return (
      <ToolLanding
        meta={meta}
        onLaunch={handleLaunch}
        samples={[{ id: 'demo', label: 'Try a sample' }]}
      />
    );
  }

  return (
    <VariantStudio
      mode="public"
      backTo={`/tools/${TOOL_SLUG}`}
      initialSource={source}
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────

const SAMPLE: SourceLogo = {
  id: 'sample-bolt',
  kind: 'uploaded',
  original: {
    svg:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#0EA5E9"/><path d="M55 20 L30 55 L48 55 L42 80 L70 42 L52 42 Z" fill="white"/></svg>',
    width: 100,
    height: 100,
  },
  wordmark: { text: 'Acme', fontFamily: 'Inter, sans-serif' },
};

async function fileToSource(file: File): Promise<SourceLogo> {
  const isSvg = file.type === 'image/svg+xml' || file.name.endsWith('.svg');
  if (isSvg) {
    const text = await file.text();
    return {
      id: `upload-${Date.now()}`,
      kind: 'uploaded',
      original: { svg: text, width: 512, height: 512 },
      wordmark: { text: file.name.replace(/\.[^.]+$/, ''), fontFamily: 'Inter, sans-serif' },
    };
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const dims = await new Promise<{ width: number; height: number }>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 512, height: 512 });
    img.src = dataUrl;
  });
  return {
    id: `upload-${Date.now()}`,
    kind: 'uploaded',
    original: { raster: dataUrl, width: dims.width, height: dims.height },
    wordmark: { text: file.name.replace(/\.[^.]+$/, ''), fontFamily: 'Inter, sans-serif' },
  };
}
