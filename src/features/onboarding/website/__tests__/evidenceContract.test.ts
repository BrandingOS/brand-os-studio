/**
 * The client's WebsiteEvidence and the Edge Function's must be the same type.
 *
 * Both assignments below are checked by `tsc` (this file is inside `src`, so
 * the type ratchet sees it); a field added on one side and not the other fails
 * the type check, which is the whole test.
 */
import { describe, expect, it } from 'vitest';
import type { WebsiteEvidence as ClientEvidence, ScanEvent as ClientEvent } from '../evidence';
import type { WebsiteEvidence as ServerEvidence } from '../../../../../supabase/functions/_shared/websiteEvidence.ts';
import type { ScanEvent as ServerEvent } from '../../../../../supabase/functions/_shared/scanWebsite.ts';

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

describe('the evidence contract', () => {
  it('is identical on both sides of the Deno boundary', () => {
    const evidence: Same<ClientEvidence, ServerEvidence> = true;
    const events: Same<ClientEvent, ServerEvent> = true;
    expect(evidence && events).toBe(true);
  });
});
