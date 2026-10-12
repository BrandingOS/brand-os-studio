import { describe, expect, it } from 'vitest';
import { approve, canComplete, complete, handoff, readWorkspace, revise, seed } from './model';

describe('review and completion contract', () => {
  it('invalidates approval and verification when the agreed outcome changes', () => {
    const approved = approve(structuredClone(seed[0]), 'Owner');
    const changed = revise({ ...approved, evidence: 'PR #12', checks: approved.checks.map(c => ({ ...c, done: true })) }, 'A different outcome');
    expect(changed.approvedRevision).toBeNull();
    expect(changed.evidence).toBe('');
    expect(changed.checks.every(c => !c.done)).toBe(true);
    expect(() => handoff(changed)).toThrow();
  });
  it('does not complete on approval or checked boxes alone', () => {
    const request = { ...approve(structuredClone(seed[0]), 'Owner'), status: 'review' as const };
    expect(canComplete(request)).toBe(false);
    const checked = { ...request, checks: request.checks.map(c => ({ ...c, done: true })) };
    expect(canComplete(checked)).toBe(false);
    expect(() => complete(checked)).toThrow();
    expect(complete({ ...checked, evidence: 'PR #12; manually reviewed on desktop and mobile' }).status).toBe('done');
  });
  it('rejects stale approvals even if all evidence exists', () => {
    const request = approve(structuredClone(seed[0]), 'Owner');
    expect(canComplete({ ...request, status: 'review', revision: 2, evidence: 'PR #12', checks: request.checks.map(c => ({ ...c, done: true })) })).toBe(false);
  });
  it('exports the exact approved outcome and corrections', () => {
    const request = approve(revise(structuredClone(seed[0]), 'User selects colors', 'No generated identity on registration'), 'Owner');
    expect(handoff(request)).toContain('No generated identity on registration');
    expect(handoff(request)).toContain('User selects colors');
  });
  it('validates saved records instead of trusting local storage', () => {
    expect(() => readWorkspace('{"version":1,"requests":[{"id":"bad"}]}')).toThrow();
    expect(readWorkspace(null)[0].id).toBe('BI-001');
  });
});
