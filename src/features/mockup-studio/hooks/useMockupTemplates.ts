/**
 * useMockupTemplates — small hook that fetches the template list from
 * the injected service once on mount. Keeps the pages free of
 * async/loading ceremony while still running through the DI container.
 */

import { useEffect, useState } from 'react';

import type { IMockupTemplatesService } from '@/core/types/services';

import type { TemplateMeta } from '../engine/types';

export function useMockupTemplates(service: IMockupTemplatesService): TemplateMeta[] {
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);

  useEffect(() => {
    let cancelled = false;
    service
      .list()
      .then((list) => {
        if (!cancelled) setTemplates(list);
      })
      .catch((err) => console.error('[useMockupTemplates] list failed', err));
    return () => {
      cancelled = true;
    };
  }, [service]);

  return templates;
}
