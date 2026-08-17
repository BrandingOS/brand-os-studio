// useImageModelAvailability — asks the server which models are unlocked
// (keys set) and exposes a selectable() predicate for the picker.

import { useEffect, useState } from 'react';
import type { ImageModelAvailability, ImageModelInfo } from '@/features/editor/ai/imageModels';
import { fetchImageModelAvailability } from '@/features/editor/ai/generateImage';

export function useImageModelAvailability(): { byId: Map<string, ImageModelAvailability>; auto: string; loaded: boolean } {
  const [state, setState] = useState<{ byId: Map<string, ImageModelAvailability>; auto: string; loaded: boolean }>({
    byId: new Map(), auto: 'pollinations:flux', loaded: false,
  });
  useEffect(() => {
    let alive = true;
    void fetchImageModelAvailability().then((res) => {
      if (!alive) return;
      setState({ byId: new Map(res.models.map((m) => [m.id, m])), auto: res.auto, loaded: true });
    });
    return () => { alive = false; };
  }, []);
  return state;
}

export function isModelSelectable(info: ImageModelInfo, byId: Map<string, ImageModelAvailability>, loaded: boolean): boolean {
  if (!loaded) return info.tier === 'free' || info.vendor === 'mock';
  const a = byId.get(info.id);
  return a ? a.available : info.tier === 'free';
}

