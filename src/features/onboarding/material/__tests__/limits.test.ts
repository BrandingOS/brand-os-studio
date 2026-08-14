/**
 * Intake limits.
 *
 * The behaviour that matters is the partial one: one oversized file inside a
 * dropped folder must cost the user that file, never the folder.
 */
import { describe, it, expect } from 'vitest';
import { MAX_FILES, MAX_FILE_BYTES, countUploads, describeLimits, partition, refuse } from '../limits';

const file = (name: string, bytes: number): File =>
  new File([new Uint8Array(Math.min(bytes, 1024))], name, { type: 'image/png' });

/** File.size is read-only, so a big file is faked at the property level. */
function sized(name: string, bytes: number): File {
  const f = file(name, 0);
  Object.defineProperty(f, 'size', { value: bytes });
  return f;
}

describe('refusal', () => {
  it('accepts a normal file', () => {
    expect(refuse(sized('a.png', 1024), 0)).toBeNull();
  });

  it('refuses the eleventh file, naming it', () => {
    const no = refuse(sized('k.png', 10), MAX_FILES);
    expect(no).toContain('k.png');
    expect(no).toContain(String(MAX_FILES));
  });

  it('refuses an oversized file, naming the real reason', () => {
    const no = refuse(sized('huge.png', MAX_FILE_BYTES + 1), 0);
    expect(no).toContain('huge.png');
    expect(no).toMatch(/5\.0 MB/);
  });

  it('accepts a file exactly at the limit', () => {
    expect(refuse(sized('edge.png', MAX_FILE_BYTES), 0)).toBeNull();
  });
});

describe('a batch loses only its overflow', () => {
  it('accepts what fits and names the rest', () => {
    const files = Array.from({ length: 12 }, (_, i) => sized(`f${i}.png`, 1024));
    const { accepted, refused } = partition(files, 0);
    expect(accepted).toHaveLength(MAX_FILES);
    expect(refused).toHaveLength(2);
  });

  it('counts as it goes, so the cap is respected mid-batch', () => {
    const files = [sized('a.png', 1024), sized('b.png', 1024)];
    const { accepted, refused } = partition(files, MAX_FILES - 1);
    expect(accepted).toHaveLength(1);
    expect(refused).toHaveLength(1);
  });

  it('an oversized file does not abort the batch around it', () => {
    const { accepted, refused } = partition(
      [sized('ok.png', 1024), sized('huge.png', MAX_FILE_BYTES + 1), sized('ok2.png', 1024)],
      0,
    );
    expect(accepted.map((f) => f.name)).toEqual(['ok.png', 'ok2.png']);
    expect(refused).toHaveLength(1);
  });
});

describe('the limits are stated before anything is dropped', () => {
  it('reads in plain language', () => {
    expect(describeLimits()).toBe('Up to 10 files · 5 MB each');
  });
});

describe('the limit counts files the USER brought, and nothing else', () => {
  const a = (over: Partial<{ kind: string; generated: boolean; fontSource: string; name: string }> = {}) => ({
    kind: 'image', name: 'x.png', ...over,
  });

  it('ignores the variants we generate ourselves', () => {
    // Three uploaded logos silently became six or nine, and the user hit a
    // limit they had not reached.
    expect(countUploads([a(), a({ generated: true }), a({ generated: true })])).toBe(1);
  });

  it('ignores links — a URL is not a file', () => {
    expect(countUploads([a(), a({ kind: 'link', name: 'kaafex.com' })])).toBe(1);
  });

  it('ignores colours — a swatch is a value, not an upload', () => {
    expect(countUploads([a(), a({ kind: 'color', name: '#1B4D3E' })])).toBe(1);
  });

  it('ignores a font we suggested, because nobody uploaded it', () => {
    expect(countUploads([a({ kind: 'font', fontSource: 'google', name: 'Space Grotesk' })])).toBe(0);
  });

  it('counts one uploaded typeface once, however many weights it has', () => {
    const weights = ['Sohne-Regular.ttf', 'Sohne-Medium.ttf', 'Sohne-Bold.ttf'].map((name) =>
      a({ kind: 'font', fontSource: 'upload', name }),
    );
    expect(countUploads(weights)).toBe(1);
  });

  it('counts two different uploaded typefaces as two', () => {
    expect(
      countUploads([
        a({ kind: 'font', fontSource: 'upload', name: 'Sohne-Regular.ttf' }),
        a({ kind: 'font', fontSource: 'upload', name: 'Tiempos-Regular.ttf' }),
      ]),
    ).toBe(2);
  });

  it('the screenshot case: six visible items are nowhere near the limit', () => {
    const state = [
      a({ kind: 'link', name: 'kaafex.com' }),
      a({ name: 'Artboard 261.png' }),
      a({ name: 'Artboard 26.png' }),
      a({ name: 'Asset 23.png' }),
      a({ kind: 'link', name: 'instagram.com' }),
      a({ kind: 'font', fontSource: 'google', name: 'Space Grotesk' }),
      // what the user never saw:
      a({ generated: true }), a({ generated: true }), a({ generated: true }),
      a({ generated: true }), a({ generated: true }), a({ generated: true }),
    ];
    expect(countUploads(state)).toBe(3);
    expect(countUploads(state)).toBeLessThan(MAX_FILES);
  });
});
