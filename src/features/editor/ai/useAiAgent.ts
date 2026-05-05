// useAiAgent — Phase 5 unified AI-agent accessor.
//
// Closes Phase 4.3's skipped E2E debt. Before this hook each
// consumer (Editor topbar, TemplatesPanel, GenerateWithAiSection)
// constructed its OWN `createEdgeFunctionAgent({ brandKit })`. That
// makes test injection messy — each panel needs a separate stub.
//
// New rule: every consumer reads from this hook. The hook checks
// the DI container for `SERVICE_KEYS.AI_AGENT` first (test
// override), then falls back to the production
// `createEdgeFunctionAgent(brandKit)`. Same agent identity across
// all panels per render, memoized on brandKit.

import { useMemo } from 'react';
import { SERVICE_KEYS } from '@/core';
import { container as serviceContainer } from '@/core/container/ServiceContainer';
import type { BrandKit } from '@/features/editor/brand/BrandKit';
import type { AIAgent } from './types';
import type { IBrandMemoryService } from '@/core/services/IBrandMemoryService';
import { createEdgeFunctionAgent } from './applyCommand';

export function useAiAgent(brandKit: BrandKit | null | undefined): AIAgent | null {
  return useMemo<AIAgent | null>(() => {
    // DI override — tests register a stub via
    //   serviceContainer.register(SERVICE_KEYS.AI_AGENT, () => stub);
    // and skip the brandKit dependency entirely.
    if (serviceContainer.has(SERVICE_KEYS.AI_AGENT)) {
      return serviceContainer.get<AIAgent>(SERVICE_KEYS.AI_AGENT);
    }
    if (!brandKit) return null;

    // Phase 6.6 — wire brand memory into the prompt when the
    // BRAND_MEMORY service is registered (always true in production
    // boot; absent in some test environments). Getter is per-call so
    // the snapshot stays fresh after a save.
    const getBrandMemory = serviceContainer.has(SERVICE_KEYS.BRAND_MEMORY)
      ? () => {
          const svc = serviceContainer.get<IBrandMemoryService>(
            SERVICE_KEYS.BRAND_MEMORY,
          );
          return svc.getSnapshot(brandKit.id);
        }
      : undefined;

    return createEdgeFunctionAgent({ brandKit, getBrandMemory });
  }, [brandKit]);
}
