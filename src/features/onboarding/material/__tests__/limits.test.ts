/**
 * Intake limits.
 *
 * The behaviour that matters is the partial one: one oversized file inside a
 * dropped folder must cost the user that file, never the folder.
 */
import { describe, it, expect } from 'vitest';
import { MAX_FILES, MAX_FILE_BYTES, describeLimits, partition, refuse } from '../limits';

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
