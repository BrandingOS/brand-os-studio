import { beforeEach, describe, expect, it } from 'vitest';
import { parseModelReply, readBrief, readByKeywords, understand, type UnderstandDeps } from '../engine/understand';
import { useLogoFlow } from '../model/flowStore';
import { readIntake } from '../model/intake';
import { traitsFromMetrics, findingsFor } from '../engine/logoRead';
import type { EnrichmentResult } from '@/features/onboarding/website/enrich';
import type { WebsiteEvidence } from '@/features/onboarding/website/evidence';

const BRIEF = `Brand Summary: Northwind makes accounting software for small design studios.
Industry: SaaS
Audience: Small businesses
Positioning: Challenger
Personality: Bold, Confident
Colors: #1d4ed8, #f59e0b`;

const site = (fields: EnrichmentResult['fields']): EnrichmentResult => ({ fields, unclear: [], routing: { tier: 'haiku', thin: false, skip: false, reason: '' } as never, calls: 1, ms: 1 });

describe('reading a labelled brief — no model call', () => {
  it('maps every answer onto the vocabularies', () => {
    const p = readBrief(BRIEF);
    expect(p).toMatchObject({ industry: 'saas', audience: 'small-business', positioning: 'challenger' });
    expect(p.personality).toEqual(['bold', 'confident']);
    expect(p.oneLiner).toMatch(/accounting software/);
  });

  it('a brief from another tool, with other labels, still fills the gaps', async () => {
    const r = await understand('Industry: SaaS\nTarget audience: small businesses and freelancers\nPositioning: Challenger\nPersonality: Bold', 'N');
    expect(r.patch.audience).toBe('small-business');
    expect(r.sources.audience).toBe('brief');
  });

  it('turns the brief’s colours into loved hue families', () => {
    expect(readBrief(BRIEF).loveHues).toEqual(expect.arrayContaining(['blue']));
  });
});

describe('reading prose without a model', () => {
  it('finds the industry, audience and feel from ordinary words', () => {
    const p = readByKeywords('We run a cozy coffee shop for families in the neighbourhood. Warm and friendly.');
    expect(p.industry).toBe('food-beverage');
    expect(['families', 'local-community']).toContain(p.audience);
    expect(p.personality).toEqual(expect.arrayContaining(['warm', 'friendly']));
  });

  it('a model reply outside the vocabulary is dropped, not stored', () => {
    const p = parseModelReply('{"industry":"Underwater basket weaving","audience":"Startups","personality":["Bold","Sparkly"]}');
    expect(p.industry).toBeUndefined();
    expect(p.audience).toBe('startups');
    expect(p.personality).toEqual(['bold']);
  });

  it('a malformed reply is an empty reading', () => {
    expect(parseModelReply('sorry, no')).toEqual({});
  });
});

describe('understand — one box, any input', () => {
  const evidence = {} as WebsiteEvidence;

  it('reads a website when the text names one', async () => {
    const deps: UnderstandDeps = {
      scanSite: async () => ({ evidence }),
      enrichSite: async () => site({ industry: { value: 'Finance', basis: 'inferred' }, positioning: { value: 'Premium', basis: 'inferred' } }),
    };
    const r = await understand('northwind.com', 'Northwind', deps);
    expect(r.site).toBe('northwind.com');
    expect(r.patch).toMatchObject({ industry: 'finance', positioning: 'premium' });
    expect(r.sources.industry).toBe('website');
  });

  it('what the owner wrote outranks what the website implies', async () => {
    const deps: UnderstandDeps = {
      scanSite: async () => ({ evidence }),
      enrichSite: async () => site({ industry: { value: 'Finance', basis: 'inferred' } }),
      askModel: async () => '{"industry":"SaaS"}',
    };
    const r = await understand('northwind.com — we build software for studios', 'Northwind', deps);
    expect(r.patch.industry).toBe('saas');
    expect(r.sources.industry).toBe('text');
  });

  it('a site that will not open says so and the text still counts', async () => {
    const deps: UnderstandDeps = { scanSite: async () => ({ evidence: null, reason: 'Sign in to read a website.' }) };
    const r = await understand('northwind.com a bold fintech for startups', 'Northwind', deps);
    expect(r.note).toMatch(/northwind\.com/);
    expect(r.patch.industry).toBe('finance');
  });

  it('a failing model falls back to keywords', async () => {
    const r = await understand('Luxury fashion house for discerning clients', 'Maison', { askModel: async () => { throw new Error('offline'); } });
    expect(r.patch.industry).toBe('fashion');
    expect(r.patch.positioning).toBe('luxury');
  });

  it('empty text reads nothing', async () => {
    expect(await understand('   ', 'X')).toEqual({ patch: {}, sources: {} });
  });
});

describe('readIntake — writing into the draft', () => {
  beforeEach(() => {
    useLogoFlow.getState().reset();
    const metrics = { ratio: 1, coverage: 0.7, symmetry: 0.9, straightness: 0.7, detail: 0.1, inkSaturation: 0, inkHue: null, hadTransparency: true };
    const traits = traitsFromMetrics(metrics, 'symbol');
    useLogoFlow.setState({ read: { metrics, traits, findings: findingsFor(traits, metrics) } });
  });

  it('never overwrites an answer the owner chose', async () => {
    useLogoFlow.getState().updateContext({ name: 'Northwind', about: BRIEF, industry: 'finance', sources: { industry: 'you' } });
    await readIntake({});
    const c = useLogoFlow.getState().context;
    expect(c.industry).toBe('finance');
    expect(c.audience).toBe('small-business');
    expect(c.sources.audience).toBe('brief');
  });

  it('an empty box still gives the brand a feel — from the logo', async () => {
    useLogoFlow.getState().updateContext({ name: 'Northwind' });
    await readIntake({});
    const c = useLogoFlow.getState().context;
    expect(c.personality.length).toBeGreaterThan(0);
    expect(c.sources.personality).toBe('logo');
  });

  it('does not read the same text twice', async () => {
    let calls = 0;
    const deps: UnderstandDeps = { askModel: async () => { calls++; return '{}'; } };
    useLogoFlow.getState().updateContext({ name: 'N', about: 'a bold bakery for families' });
    await readIntake(deps);
    await readIntake(deps);
    expect(calls).toBe(1);
  });
});
