// Phase 5.4 — exportFamily tests.
import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { buildFamilyZip, type FamilyMember } from './exportFamily';
import type { BrandOSDocument } from '../schema';
import type { DesignSummary } from '@/core/types/services';

const docOf = (id: string, w: number, h: number): BrandOSDocument => ({
  schemaVersion: 1,
  id,
  contentType: 'social-post',
  brandId: 'brand-raqm',
  masterPages: [],
  metadata: {},
  pages: [
    { id: 'p-1', name: 'Page 1', width: w, height: h, background: { fill: '#fff' }, layers: [] },
  ],
} as BrandOSDocument);

const summaryOf = (id: string, name: string, opts: Partial<DesignSummary> = {}): DesignSummary => ({
  id,
  name,
  ...opts,
});

describe('buildFamilyZip', () => {
  it('throws on empty family', async () => {
    await expect(buildFamilyZip([])).rejects.toThrow(/empty family/);
  });

  it('emits one .brandos.json per member + manifest + README', async () => {
    const members: FamilyMember[] = [
      {
        summary: summaryOf('s', 'Source', { familyId: 'fam' }),
        doc: docOf('s', 1080, 1080),
      },
      {
        summary: summaryOf('v1', 'Source — Story', { familyId: 'fam', sourceDesignId: 's' }),
        doc: docOf('v1', 1080, 1920),
      },
    ];
    const { blob } = await buildFamilyZip(members);
    const zip = await JSZip.loadAsync(blob);
    const filenames = Object.keys(zip.files).sort();
    expect(filenames).toContain('manifest.json');
    expect(filenames).toContain('README.txt');
    // Two design files, one prefixed source-, one variant-.
    const designFiles = filenames.filter((n) => n.endsWith('.brandos.json'));
    expect(designFiles).toHaveLength(2);
    expect(designFiles.some((n) => n.startsWith('source-'))).toBe(true);
    expect(designFiles.some((n) => n.startsWith('variant-'))).toBe(true);
  });

  it('manifest declares family + member roles in correct order', async () => {
    const members: FamilyMember[] = [
      // Source second to verify the manifest still tags it as source.
      {
        summary: summaryOf('v1', 'Source — Story', { familyId: 'fam', sourceDesignId: 's' }),
        doc: docOf('v1', 1080, 1920),
      },
      {
        summary: summaryOf('s', 'Source', { familyId: 'fam' }),
        doc: docOf('s', 1080, 1080),
      },
    ];
    const { manifest } = await buildFamilyZip(members);
    expect(manifest.familyId).toBe('fam');
    expect(manifest.sourceDesignId).toBe('s');
    expect(manifest.members).toHaveLength(2);
    const roleById = Object.fromEntries(manifest.members.map((m) => [m.id, m.role]));
    expect(roleById['s']).toBe('source');
    expect(roleById['v1']).toBe('variant');
  });

  it('roundtrips full BrandOSDocument bodies — JSON parses back to the source shape', async () => {
    const sourceDoc = docOf('s', 1000, 1000);
    const members: FamilyMember[] = [
      { summary: summaryOf('s', 'Source', { familyId: 'fam' }), doc: sourceDoc },
    ];
    const { blob } = await buildFamilyZip(members);
    const zip = await JSZip.loadAsync(blob);
    const designFile = Object.keys(zip.files).find((n) => n.endsWith('.brandos.json'))!;
    const text = await zip.file(designFile)!.async('text');
    const parsed = JSON.parse(text);
    expect(parsed).toEqual(sourceDoc);
  });

  it('handles orphan family (no source) by tagging all as variants', async () => {
    const members: FamilyMember[] = [
      {
        summary: summaryOf('v1', 'Orphan', { familyId: 'fam', sourceDesignId: 'missing' }),
        doc: docOf('v1', 1080, 1920),
      },
    ];
    const { manifest, blob } = await buildFamilyZip(members);
    expect(manifest.sourceDesignId).toBeNull();
    expect(manifest.members[0].role).toBe('variant');
    const zip = await JSZip.loadAsync(blob);
    const designFiles = Object.keys(zip.files).filter((n) => n.endsWith('.brandos.json'));
    expect(designFiles[0]).toMatch(/^variant-/);
  });

  it('sanitizes filenames — special chars stripped, spaces dashed', async () => {
    const members: FamilyMember[] = [
      {
        summary: summaryOf('s', 'Spring Campaign / 2026!', { familyId: 'fam' }),
        doc: docOf('s', 1080, 1080),
      },
    ];
    const { blob } = await buildFamilyZip(members);
    const zip = await JSZip.loadAsync(blob);
    const filenames = Object.keys(zip.files);
    const designFile = filenames.find((n) => n.endsWith('.brandos.json'))!;
    // No slashes, no exclamation marks; spaces collapsed to dashes.
    expect(designFile).not.toContain('/');
    expect(designFile).not.toContain('!');
    expect(designFile).toMatch(/source-Spring-Campaign-2026/);
  });
});
