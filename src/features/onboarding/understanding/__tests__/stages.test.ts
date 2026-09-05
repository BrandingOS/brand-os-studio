/**
 * The processing stage machine.
 *
 * The property under test is structural: a stage EXISTS only when the work it
 * names is scheduled. That is what makes honest copy a fact about the code
 * rather than a promise — copy for work that will not happen is unrepresentable,
 * not merely unused.
 */
import { describe, it, expect } from 'vitest';
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';
import { MINIMUM_BEAT_MS, findingsFrom, planStages, screenDuration } from '../stages';

const image = (id: string): OnboardingAsset => ({
  id, name: `${id}.svg`, sub: '', kind: 'image',
  previewUrl: `blob:${id}`, uploadStatus: 'done', uploadProgress: 1,
});
const font = (id: string): OnboardingAsset => ({
  id, name: `${id}.ttf`, sub: '', kind: 'font',
  previewUrl: null, uploadStatus: 'done', uploadProgress: 1,
});

const labels = (s: ReturnType<typeof planStages>) => s.map((x) => x.label);

describe('a stage exists only when its work does', () => {
  it('a name-only brand narrates no files, no logos, no colours, no type', () => {
    const l = labels(planStages({ brandName: 'M', hasText: false, hasBrief: false, items: [] }));
    expect(l).not.toContain('Organising your brand files');
    expect(l).not.toContain('Finding your logo system');
    expect(l).not.toContain('Extracting your colours');
    expect(l).not.toContain('Identifying your typography');
    expect(l).not.toContain('Checking your website');
    expect(l).not.toContain('Understanding your brand');
  });

  it('images bring the logo and colour stages with them', () => {
    const l = labels(planStages({ brandName: 'M', hasText: false, hasBrief: false, items: [image('a')] }));
    expect(l).toContain('Finding your logo system');
    expect(l).toContain('Extracting your colours');
  });

  it('a font file brings the typography stage', () => {
    const l = labels(planStages({ brandName: 'M', hasText: false, hasBrief: false, items: [font('f')] }));
    expect(l).toContain('Identifying your typography');
  });

  it('a website makes the plan the eight-stage Brand Scan, and nothing narrates work that never runs', () => {
    const l = labels(planStages({ brandName: 'M', hasText: false, hasBrief: false, website: 'https://www.x.co', items: [] }));
    expect(l).toEqual([
      'Opening x.co', 'Reading brand signals', 'Finding your identity', 'Exploring key pages',
      'Understanding your voice', 'Analysing visual language', 'Building your brand profile', 'Saving your brand',
    ]);
    expect(l).not.toContain('Checking your website');
  });

  it('a scan stage resolves on its event, not on a timer', async () => {
    const { createStageSignals } = await import('../stages');
    const signals = createStageSignals();
    const stages = planStages({ brandName: 'M', hasText: false, hasBrief: false, website: 'x.co', items: [], awaitStage: signals.promiseFor });
    let settled = false;
    const p = Promise.resolve(stages[2].run()).then((f) => { settled = true; return f; });
    await new Promise((r) => setTimeout(r, 5));
    expect(settled).toBe(false);
    signals.resolve('site-identity', { label: 'Logo', value: 'found' });
    expect(await p).toEqual({ label: 'Logo', value: 'found' });
    // Ending the work closes every stage still open, with nothing invented.
    signals.resolveAll();
    expect(await stages[7].run()).toBeNull();
    expect(signals.resolved('site-saving')).toBe(true);
  });

  it('the copy differs because the WORK differs', () => {
    const brief = labels(planStages({ brandName: 'M', hasText: true, hasBrief: true, items: [] }));
    const prose = labels(planStages({ brandName: 'M', hasText: true, hasBrief: false, items: [] }));
    expect(brief).toContain('Reading your brand brief');
    expect(prose).toContain('Understanding your brand');
  });

  it('always narrates the two things that always happen', () => {
    const l = labels(planStages({ brandName: 'M', hasText: false, hasBrief: false, items: [] }));
    expect(l).toEqual(['Structuring your brand information', 'Mapping your visual direction']);
  });

  it('every stage owns a distinct node of the mark', () => {
    const s = planStages({
      brandName: 'M', hasText: true, hasBrief: false, website: 'x.co',
      items: [image('a'), font('f')],
    });
    const nodes = s.map((x) => x.node);
    expect(new Set(nodes).size).toBe(nodes.length);
    for (const n of nodes) expect(n).toBeGreaterThanOrEqual(0);
    for (const n of nodes) expect(n).toBeLessThanOrEqual(7);
  });
});

describe('findings are real or absent', () => {
  it('emits nothing for work that produced nothing', () => {
    expect(findingsFrom({})).toEqual({});
  });

  it('reports what was actually found', () => {
    const f = findingsFrom({ logoGroups: 3, logoVariants: 2, colors: 5, typeface: 'Söhne', industryLabel: 'Real Estate' });
    expect(f.logos).toEqual({ label: 'Logos', value: '3 · 2 variations' });
    expect(f.colors).toEqual({ label: 'Colours', value: '5 identified' });
    expect(f.fonts).toEqual({ label: 'Typeface', value: 'Söhne' });
    expect(f.structure).toEqual({ label: 'Industry', value: 'Real Estate' });
  });

  it('a stage with no finding returns null rather than inventing one', async () => {
    const s = planStages({ brandName: 'M', hasText: false, hasBrief: false, items: [] });
    for (const stage of s) expect(await stage.run()).toBeNull();
  });
});

describe('the beat is a floor, never an addition', () => {
  it('holds instant work to one clean beat', () => {
    expect(screenDuration(180)).toBe(MINIMUM_BEAT_MS);
  });

  it('never extends work that already took longer', () => {
    expect(screenDuration(4600)).toBe(4600);
  });
});
