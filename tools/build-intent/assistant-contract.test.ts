import { describe, expect, it } from 'vitest';
import { assistantInputSchema, assistantOutputSchema } from './assistant-contract';
import { seed } from './model';

describe('local assistant boundary', () => {
  it('rejects empty messages and unrecognized mutation instructions', () => {
    expect(() => assistantInputSchema.parse({ request: seed[0], message: '', locale: 'en' })).toThrow();
    expect(() => assistantOutputSchema.parse({ reply: 'Done', change: null, approvedRevision: 1 })).toThrow();
  });
  it('allows a discussion without an artificial draft change', () => {
    expect(assistantOutputSchema.parse({ reply: 'What result matters most?', change: null }).change).toBeNull();
  });
  it('rejects an implementation update without a tangible prototype and criteria', () => {
    expect(() => assistantOutputSchema.parse({ reply: 'Changed', change: { title: 'Title', intent: 'Intent', kind: 'feature', checks: [], prototypeTitle: 'Preview', prototypeHtml: '' } })).toThrow();
  });
});
