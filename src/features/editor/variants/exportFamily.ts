// Phase 5.4 — Bulk export of design families.
//
// Fetches every design in a family (source + variants) from
// IDesignStorage and builds a ZIP: one .brandos.json per design plus
// a manifest.json describing the family. Returns a Blob the caller
// triggers download for.
//
// JSON-only in 5.4a. PNG / PDF rendering is 5.4b and needs headless
// canvas infrastructure that doesn't exist yet (Phase 6 / vendor
// decision territory). Even the JSON bundle is genuinely useful —
// it's a complete portable backup of the family, opens in any text
// editor, can be re-imported by IDesignStorage.saveDesign.
import JSZip from 'jszip';
import type { BrandOSDocument } from '../schema';
import type { DesignSummary, IDesignStorage } from '@/core/types/services';

export interface FamilyManifest {
  familyId: string;
  sourceDesignId: string | null;
  exportedAt: string;
  members: Array<{
    id: string;
    name: string;
    width?: number;
    height?: number;
    role: 'source' | 'variant';
    filename: string;
  }>;
}

/**
 * Pure builder — given a list of family members (already fetched +
 * loaded), produces a ZIP Blob with one .brandos.json per design and
 * a manifest. The members array is the result of pairing each
 * DesignSummary with its full BrandOSDocument body.
 */
export interface FamilyMember {
  summary: DesignSummary;
  doc: BrandOSDocument;
}

export async function buildFamilyZip(members: FamilyMember[]): Promise<{ blob: Blob; manifest: FamilyManifest }> {
  if (members.length === 0) {
    throw new Error('buildFamilyZip: cannot export an empty family.');
  }
  const zip = new JSZip();

  // Pick the family head: any member without sourceDesignId, or the
  // first member if everyone is a variant (orphan cluster).
  const source = members.find((m) => !m.summary.sourceDesignId) ?? null;
  const familyId =
    members.find((m) => m.summary.familyId)?.summary.familyId ?? 'untitled-family';

  const manifest: FamilyManifest = {
    familyId,
    sourceDesignId: source?.summary.id ?? null,
    exportedAt: new Date().toISOString(),
    members: [],
  };

  for (const m of members) {
    const role: 'source' | 'variant' = !m.summary.sourceDesignId ? 'source' : 'variant';
    const safeName = sanitizeForFilename(m.summary.name ?? m.summary.id);
    const filename = `${role}-${safeName}.brandos.json`;
    zip.file(filename, JSON.stringify(m.doc, null, 2));
    manifest.members.push({
      id: m.summary.id,
      name: m.summary.name ?? 'Untitled',
      width: m.summary.width,
      height: m.summary.height,
      role,
      filename,
    });
  }

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file(
    'README.txt',
    [
      `BrandOS family export — ${familyId}`,
      `Exported at ${manifest.exportedAt}`,
      ``,
      `${members.length} design${members.length === 1 ? '' : 's'} in this family.`,
      `Each *.brandos.json is a complete, portable design document.`,
      `Re-import via IDesignStorage.saveDesign in another BrandOS workspace.`,
    ].join('\n'),
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  return { blob, manifest };
}

/**
 * High-level convenience wrapper used by the topbar button. Fetches
 * the family from the design storage adapter, loads every doc, builds
 * the ZIP. Throws on missing source/storage.
 */
export async function exportFamilyAsZip(opts: {
  designStorage: IDesignStorage;
  brandId: string;
  familyId: string;
}): Promise<{ blob: Blob; manifest: FamilyManifest }> {
  const all = await opts.designStorage.listDesigns(opts.brandId);
  const family = all.filter((d) => d.familyId === opts.familyId);
  if (family.length === 0) {
    throw new Error(`No designs found in family ${opts.familyId}.`);
  }

  const members: FamilyMember[] = [];
  for (const summary of family) {
    const doc = await opts.designStorage.loadDesign(opts.brandId, summary.id);
    if (!doc) continue;
    members.push({ summary, doc: doc as BrandOSDocument });
  }
  if (members.length === 0) {
    throw new Error(`Family ${opts.familyId} has summaries but no loadable docs.`);
  }
  return buildFamilyZip(members);
}

/** Filesystem-safe slug for filenames. */
function sanitizeForFilename(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'untitled';
}

/** Triggers a browser download for an in-memory blob. */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Defer revoke so the browser has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
