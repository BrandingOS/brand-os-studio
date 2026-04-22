/**
 * /tools/ui-color-system — single-surface public route.
 *
 * No landing page. The seed is either decoded from a share link
 * (`?p=<base64>`) or initialised to a default. The full generator
 * mounts directly underneath the Cosmos workspace shell.
 */
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ColorSystemGenerator } from '@/features/tools/ui-color-system';
import { decodePalette } from '@/features/tools/ui-color-system/hooks/usePaletteShareUrl';
import { TOOL_REGISTRY } from '@/features/tools/core';
import { isValidHex, normalizeHex } from '@/lib/color-engine';

const DEFAULT_SEED = '#801132';

export default function PublicUiColorSystemPage() {
  const meta = TOOL_REGISTRY['ui-color-system' as keyof typeof TOOL_REGISTRY];
  const [params] = useSearchParams();

  const { seed, secondary } = useMemo(() => {
    const encoded = params.get('p');
    if (encoded) {
      const decoded = decodePalette(encoded);
      if (decoded && isValidHex(decoded.seed)) {
        return {
          seed: normalizeHex(decoded.seed),
          secondary:
            decoded.roles.secondary && isValidHex(decoded.roles.secondary)
              ? normalizeHex(decoded.roles.secondary)
              : null,
        };
      }
    }
    const raw = params.get('seed');
    if (raw) {
      const hex = raw.startsWith('#') ? raw : `#${raw}`;
      if (isValidHex(hex)) return { seed: normalizeHex(hex), secondary: null };
    }
    return { seed: DEFAULT_SEED, secondary: null };
  }, [params]);

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
    <ColorSystemGenerator
      initialSeed={seed}
      initialSecondary={secondary}
      forcedMode="standalone"
    />
  );
}
