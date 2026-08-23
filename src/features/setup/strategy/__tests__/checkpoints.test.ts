import { afterEach, describe, expect, it } from 'vitest';
import {
  saveCheckpoint,
  listCheckpoints,
  getCheckpoint,
  deleteCheckpoint,
  clearCheckpoints,
  snapshotFonts,
  type BrandingSnapshot,
} from '../checkpoints';
import { EMPTY_STRATEGY } from '../../data/mockBrand';

const BRAND = 'b-test';

const snap = (marker = 'x'): BrandingSnapshot => ({
  colors: { core: [{ hex: '#111111', name: marker }], accent: [] },
  fonts: [{ id: 'f1', family: 'Inter', role: 'Text', weights: '400' }],
  strategy: { ...EMPTY_STRATEGY, mission: marker },
  about: [],
  icons: ['fi-rr-star'],
});

afterEach(() => clearCheckpoints(BRAND));

describe('checkpoints', () => {
  it('saves and lists newest first', () => {
    saveCheckpoint(BRAND, snap('first'), ['colors']);
    saveCheckpoint(BRAND, snap('second'), ['fonts'], 'go premium');
    const list = listCheckpoints(BRAND);
    expect(list).toHaveLength(2);
    expect(list[0].before.strategy.mission).toBe('second');
    expect(list[0].direction).toBe('go premium');
    expect(list[1].applied).toEqual(['colors']);
  });

  it('caps the list at 20', () => {
    for (let i = 0; i < 25; i++) saveCheckpoint(BRAND, snap(String(i)), ['colors']);
    const list = listCheckpoints(BRAND);
    expect(list).toHaveLength(20);
    // The newest survive the cap.
    expect(list[0].before.strategy.mission).toBe('24');
  });

  it('finds and deletes by id', () => {
    const c = saveCheckpoint(BRAND, snap(), ['strategy']);
    expect(getCheckpoint(BRAND, c.id)?.id).toBe(c.id);
    deleteCheckpoint(BRAND, c.id);
    expect(getCheckpoint(BRAND, c.id)).toBeUndefined();
  });

  it('is per brand', () => {
    saveCheckpoint(BRAND, snap(), ['colors']);
    expect(listCheckpoints('someone-else')).toHaveLength(0);
  });

  it('survives garbage under its key', () => {
    localStorage.setItem(`brandos:branding-checkpoints:${BRAND}`, '{not json');
    expect(listCheckpoints(BRAND)).toEqual([]);
    saveCheckpoint(BRAND, snap(), ['colors']);
    expect(listCheckpoints(BRAND)).toHaveLength(1);
  });
});

describe('snapshotFonts', () => {
  // The rule that keeps this list from repeating the 1.5 MB history incident.
  it('strips uploaded font bytes and remembers they existed', () => {
    const stripped = snapshotFonts([
      {
        id: 'f1',
        family: 'Custom Sans',
        role: 'Display',
        weights: 'Bold',
        files: [
          { name: 'c.ttf', weight: 'Bold', format: 'ttf', dataUrl: 'data:font/ttf;base64,AAAA', size: 4 },
        ],
      },
      { id: 'f2', family: 'Inter', role: 'Text', weights: '400' },
    ]);
    expect('files' in stripped[0]).toBe(false);
    expect(stripped[0].hadFiles).toBe(true);
    expect(stripped[1].hadFiles).toBeUndefined();
    expect(JSON.stringify(stripped)).not.toContain('base64');
  });
});
