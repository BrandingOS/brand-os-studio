/**
 * /tools/ui-color-system — public landing + studio.
 *
 * State machine:
 *   - No seed committed → render <PublicLanding>
 *   - Seed committed     → render <ColorSystemGenerator initialSeed>
 *
 * The URL also accepts ?seed=#abc123 which skips the landing.
 */
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ColorSystemGenerator } from '@/features/tools/ui-color-system';
import { PublicLanding } from '@/features/tools/ui-color-system/public/PublicLanding';
import { decodePalette } from '@/features/tools/ui-color-system/hooks/usePaletteShareUrl';
import { TOOL_REGISTRY } from '@/features/tools/core';
import { isValidHex, normalizeHex } from '@/lib/color-engine';

export default function PublicUiColorSystemPage() {
  const meta = TOOL_REGISTRY['ui-color-system' as keyof typeof TOOL_REGISTRY];
  const [params, setParams] = useSearchParams();
  const [seed, setSeed] = useState<string | null>(null);

  useEffect(() => {
    // ?p=<base64> takes precedence over ?seed=<hex>.
    const encoded = params.get('p');
    if (encoded) {
      const decoded = decodePalette(encoded);
      if (decoded && isValidHex(decoded.seed)) {
        setSeed(normalizeHex(decoded.seed));
      }
    } else {
      const raw = params.get('seed');
      if (raw) {
        const hex = raw.startsWith('#') ? raw : `#${raw}`;
        if (isValidHex(hex)) setSeed(normalizeHex(hex));
      }
    }
    // SEO: keep title in sync with the in-tool state.
    if (meta) {
      document.title = meta.seo.title;
      let descTag = document.querySelector('meta[name="description"]');
      if (!descTag) {
        descTag = document.createElement('meta');
        descTag.setAttribute('name', 'description');
        document.head.appendChild(descTag);
      }
      descTag.setAttribute('content', meta.seo.description);
    }
  }, [params, meta]);

  const launch = useCallback(
    (hex: string) => {
      setSeed(normalizeHex(hex));
      setParams({ seed: hex.replace('#', '') });
    },
    [setParams],
  );

  if (!seed) {
    return <PublicLanding onLaunch={launch} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-none items-center justify-between gap-3 px-4">
          <a href="/tools/ui-color-system" className="flex items-center gap-2 text-sm font-semibold">
            ← UI Color System
          </a>
          <div className="flex items-center gap-2 text-sm">
            <a
              href="/?signup=1"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Save & sync with a brand →
            </a>
          </div>
        </div>
      </header>
      <ColorSystemGenerator initialSeed={seed} forcedMode="standalone" />
    </div>
  );
}
