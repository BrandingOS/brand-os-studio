import { describe, it, expect } from 'vitest';
import { typescaleMaterializer } from '../materializer';
import type { ToolSession } from '@/features/tools/core/types';
import type { TypescaleSessionPayload } from '../hooks/useTypescaleDraft';
import { seedTypescale } from '../hooks/useSeedTypescale';

describe('typescaleMaterializer', () => {
  it('produces a CreateBrandInput with the heading family as primary font', () => {
    const typescale = seedTypescale(null);
    const session: ToolSession<TypescaleSessionPayload> = {
      id: 'test',
      slug: 'typescale',
      mode: 'public',
      anonymousToken: 'anon-xyz',
      payload: { typescale },
      createdAt: '2026-04-23T00:00:00.000Z',
      updatedAt: '2026-04-23T00:00:00.000Z',
    };
    const { create, patch } = typescaleMaterializer(session);
    expect(create.fonts?.primary).toContain(typescale.fonts.heading.family);
    expect(patch?.typescale).toBe(typescale);
    expect(patch?.typography?.primary?.family).toBe(typescale.fonts.heading.family);
  });
});
