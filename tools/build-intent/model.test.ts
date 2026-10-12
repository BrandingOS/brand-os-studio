import { describe, expect, it } from 'vitest';
import { approve, canComplete, complete, editRequest, handoff, readWorkspace, revise, seed, undoRequest } from './model';

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
  it('allows direct editing and restores the prior draft without restoring approval', () => {
    const approved = approve(structuredClone(seed[0]), 'Owner');
    const edited = editRequest(approved, { title: 'Changed title', intent: 'A new result' }, 'Direct edit');
    expect(edited.approvedRevision).toBeNull();
    const restored = undoRequest(edited);
    expect(restored.title).toBe(approved.title);
    expect(restored.intent).toBe(approved.intent);
    expect(restored.approvedRevision).toBeNull();
    expect(restored.revision).toBeGreaterThan(edited.revision);
  });
  it('prevents approving a prototype that belongs to an older intent', () => {
    const request = { ...structuredClone(seed[0]), artifact: { title: 'Preview', html: '<p>Old</p>', revision: 1 } };
    const edited = editRequest(request, { intent: 'Changed outcome' }, 'Direct edit');
    expect(() => approve(edited, 'Owner')).toThrow();
    expect(approve(undoRequest(edited), 'Owner').status).toBe('ready');
  });
});
