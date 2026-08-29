/**
 * "Export kit" — the whole Brand Kit, in one zip.
 *
 * Before this, the Export button shipped colours, fonts, logos and a
 * README, and **none of the deliverables** — no business card, no
 * letterhead, no invoice, no social system, no board. A brand kit export
 * that contains no applications of the brand is not a brand kit.
 *
 * Three ideas hold this together:
 *
 *  • **The catalog decides what is in the zip.** The walker is handed the
 *    ENTRIES the viewer can see (`visibleGroups`), so the export contains
 *    exactly what that person is looking at — an experimental capability
 *    does not leak into a customer's download, and a regrouped item is
 *    not silently missed. The per-group download calls this same function
 *    with one group's entries, which is why the two can never disagree.
 *
 *  • **The page stays alive.** Every unit yields to the browser before
 *    the next one starts, and the zip STOREs bytes that are already
 *    compressed instead of DEFLATEing them. See `exportScheduler.ts` for
 *    why a Web Worker is the wrong answer here.
 *
 *  • **A short export is never silent.** Anything that could not be
 *    included comes back in `skipped` with a reason the user can act on,
 *    rather than shipping a blank tile that looks like a bug in the
 *    brand.
 */
import type { ReactElement } from 'react';
import type { Brand } from '@/shared/types/brand';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import type { KitEntry } from '../catalog/catalog';
import { renderCosmosTemplate } from '../renderers';
import { StrategyView } from '../systems/StrategyView';
import { SocialSystemView } from '../systems/SocialSystemView';
import { PresentationSystemView } from '../systems/PresentationSystemView';
import { BrandBoardCanvas } from '@/features/brand-board/preview/BrandBoardCanvas';
import { useBrandBoardStore } from '@/features/brand-board/store/useBrandBoardStore';
import { variantsForCard } from './legacy-mapping';
import { contentForTemplate } from './savedContent';
import type { SavedCardCustomization } from './cardCustomizations';
import { aspectForLabel, featuredTemplates } from './cardPresentation';
import { addIconsToZip, type IconExportEntry } from './iconExport';
import { buildStrategyMarkdown, buildStrategyPdf } from './strategyDocument';
import {
  snapshotDocumentPng,
  snapshotTemplatePng,
  primeRenderEnvironment,
  withOffscreenMounts,
} from './templateSnapshot';
import {
  addColorsToZip,
  addFontsToZip,
  addLogosToZip,
  buildAboutMarkdown,
  lazyFolder,
  buildBrandJson,
  slugifyName,
  zipAdd,
  type ExportSkip,
  type ZipFolder,
} from './kitExport';
import { triggerBlobDownload } from './colorPaletteExport';
import { throwIfAborted, yieldToBrowser } from './exportScheduler';

/* ─── The plan ────────────────────────────────────────────────────── */

/**
 * What one step of an export produces.
 *
 * `assets` units write a folder of the brand's own material; `card` units
 * rasterize a deliverable at the shape its card is drawn in; `document`
 * units rasterize a page body that sizes itself; `board` is the poster,
 * which has its own fixed canvas.
 */
export type KitExportUnitKind =
  | 'logos'
  | 'colors'
  | 'fonts'
  | 'icons'
  | 'photos'
  | 'about'
  | 'card'
  | 'document'
  | 'board';

export type KitExportUnit = {
  /** The catalog entry this unit came from. */
  entry: KitEntry;
  kind: KitExportUnitKind;
  /** What the progress toast reads while this unit runs. */
  label: string;
  /** Folder or file this unit writes, relative to the zip root. */
  path: string;
};

const ASSET_KINDS: Record<string, KitExportUnitKind> = {
  Logos: 'logos',
  Colors: 'colors',
  Fonts: 'fonts',
  Icons: 'icons',
  Photos: 'photos',
  About: 'about',
};

/**
 * Turn catalog entries into the steps an export will run.
 *
 * Pure, ordered and total: every entry becomes exactly one unit, so the
 * count in the progress toast is the count of things the user asked for.
 */
export function planKitExport(entries: ReadonlyArray<KitEntry>): KitExportUnit[] {
  const units: KitExportUnit[] = [];
  for (const entry of entries) {
    const assetKind = entry.sectionKey === 'brand-assets' ? ASSET_KINDS[entry.storageLabel] : undefined;
    if (assetKind) {
      units.push({
        entry,
        kind: assetKind,
        label: entry.label,
        path: assetKind === 'about' ? 'strategy.pdf' : `${assetKind}/`,
      });
      continue;
    }
    const file = `deliverables/${slugifyName(entry.label)}.png`;
    if (entry.view === 'brand-board') {
      units.push({ entry, kind: 'board', label: entry.label, path: file });
    } else if (entry.view === 'social-system' || entry.view === 'presentation-system') {
      units.push({ entry, kind: 'document', label: entry.label, path: file });
    } else if (entry.view === 'strategy') {
      units.push({ entry, kind: 'about', label: entry.label, path: 'strategy.pdf' });
    } else {
      units.push({ entry, kind: 'card', label: entry.label, path: file });
    }
  }
  return units;
}

/* ─── Running it ──────────────────────────────────────────────────── */

export type KitExportProgress = {
  /** `collecting` while units run, `zipping` while JSZip assembles. */
  phase: 'collecting' | 'zipping';
  /** Units finished. During `zipping` this equals `total`. */
  done: number;
  total: number;
  /** What is being worked on right now, in the user's own words. */
  label: string;
};

export type KitExportInput = {
  brand: MockBrand;
  /** Renderers need the canonical brand; without it only assets export. */
  sourceBrand?: Brand;
  entries: ReadonlyArray<KitEntry>;
  /** The user's saved Quick Edits, so the export ships what they wrote. */
  saved?: Record<string, SavedCardCustomization>;
  /** The user's own featured picks, so the export ships what they see. */
  featuredIdsByLabel?: Record<string, string[]>;
  /**
   * Ship EVERY variant a card shows, not one representative.
   *
   * Off by default and deliberately so: a kit is a document you hand
   * someone, and a card showing thirty letterhead designs turns that into
   * three hundred PNGs and a minute of rendering. On, the deliverable
   * becomes a folder — which is what "everything in the Brand Kit" means
   * for anyone who actually wants all of it.
   */
  allVariants?: boolean;
  onProgress?: (progress: KitExportProgress) => void;
  signal?: AbortSignal;
};

export type KitExportResult = {
  blob: Blob;
  /** Units that produced something. */
  added: number;
  skipped: ExportSkip[];
};

/**
 * The designs a `card` unit rasterizes — the variants the card SHOWS.
 *
 * One by default (the card's own first pick), or all of them when the
 * user asked for every variant. Either way it is the same list the
 * drilldown paints, so the zip cannot contain a design the Brand Kit
 * does not, or miss one it does.
 */
function cardDesigns(
  unit: KitExportUnit,
  input: KitExportInput,
): Array<{ name: string; element: ReactElement }> {
  const { brand, sourceBrand, saved, featuredIdsByLabel, allVariants } = input;
  if (!sourceBrand) return [];
  const all = variantsForCard(unit.entry.sectionKey, unit.entry.storageLabel, brand);
  const shown = featuredTemplates(unit.entry.storageLabel, all, featuredIdsByLabel);
  const chosen = allVariants ? shown : shown.slice(0, 1);
  return chosen.map((template) => ({
    name: template.name,
    element: renderCosmosTemplate(
      template,
      sourceBrand,
      brand,
      saved ? contentForTemplate(saved, template, brand) : undefined,
    ),
  }));
}

/** The element a `document` unit rasterizes — a composed system view. */
function documentElement(unit: KitExportUnit, input: KitExportInput): ReactElement | null {
  const { brand, sourceBrand } = input;
  switch (unit.entry.view) {
    case 'social-system':
      return <SocialSystemView brand={brand} sourceBrand={sourceBrand} />;
    case 'presentation-system':
      return <PresentationSystemView brand={brand} sourceBrand={sourceBrand} />;
    case 'strategy':
      return <StrategyView brand={brand} />;
    default:
      return null;
  }
}

/** The brand's icons, rasterized through the glyph exporter. */
async function writeIcons(
  folder: ZipFolder,
  input: KitExportInput,
  slug: string,
): Promise<number> {
  const { brand, sourceBrand } = input;
  const templates = variantsForCard('brand-assets', 'Icons', brand).slice(0, brand.icons.length);
  if (templates.length === 0 || !sourceBrand) return 0;
  return withOffscreenMounts(
    templates.map((tpl) => (
      <span key={tpl.id} className="brand-asset-render--icon-host">
        {renderCosmosTemplate(tpl, sourceBrand, brand)}
      </span>
    )),
    96,
    96,
    async (hosts) => {
      const entries: IconExportEntry[] = hosts.map((el, i) => ({
        name: templates[i]?.name ?? `Icon ${i + 1}`,
        source: brand.icons[i] ?? '',
        element: el,
      }));
      return addIconsToZip(folder, entries, `${slug}-icons`, { lean: true });
    },
  );
}

/** The brand's photographs, fetched as their own bytes. */
async function writePhotos(
  folder: ZipFolder,
  brand: MockBrand,
  signal?: AbortSignal,
): Promise<{ added: number; skipped: ExportSkip[] }> {
  const photos = brand.photos.filter((p) => p.src);
  const skipped: ExportSkip[] = [];
  let added = 0;
  for (let i = 0; i < photos.length; i += 1) {
    throwIfAborted(signal);
    try {
      const res = await fetch(photos[i].src);
      if (!res.ok) throw new Error(`${res.status}`);
      const blob = await res.blob();
      zipAdd(folder, `photo-${i + 1}.${blob.type.split('/')[1] || 'png'}`, blob);
      added += 1;
    } catch {
      skipped.push({ label: `Photo ${i + 1}`, reason: "the file couldn't be read from storage" });
    }
    await yieldToBrowser(signal);
  }
  return { added, skipped };
}

/**
 * Write ONE catalog entry's files into a zip root.
 *
 * Extracted so the Export Kit and a single card's Download button run
 * the very same code. Before this they were separate switches, and they
 * disagreed: the kit shipped a Social Media System page and a Brand
 * Board while the cards for both answered "Nothing to export".
 *
 * Returns whether the unit produced anything; anything it could not
 * include is pushed onto `skipped` with a reason.
 */
export async function writeUnit(
  unit: KitExportUnit,
  root: ZipFolder,
  input: KitExportInput,
  skipped: ExportSkip[],
): Promise<boolean> {
  const { brand, signal } = input;
  const slug = slugifyName(brand.name);
  let added = false;
  const keep = () => {
    added = true;
  };
  try {
    switch (unit.kind) {
      case 'logos': {
        const dir = lazyFolder(root, 'logos');
        const result = await addLogosToZip(dir, brand, signal);
        skipped.push(...result.skipped);
        if (result.added > 0) keep();
        else skipped.push({ label: unit.label, reason: 'this brand has no logo yet' });
        break;
      }
      case 'colors': {
        const dir = lazyFolder(root, 'colors');
        if ((await addColorsToZip(dir, brand, signal)) > 0) keep();
        else skipped.push({ label: unit.label, reason: 'this brand has no colours yet' });
        break;
      }
      case 'fonts': {
        const dir = lazyFolder(root, 'fonts');
        const result = await addFontsToZip(dir, brand, signal);
        skipped.push(...result.skipped);
        if (result.added > 0) keep();
        else if (result.skipped.length === 0) {
          skipped.push({ label: unit.label, reason: 'this brand has no typefaces yet' });
        }
        break;
      }
      case 'icons': {
        const dir = lazyFolder(root, 'icons');
        if ((await writeIcons(dir, input, slug)) > 0) keep();
        else skipped.push({ label: unit.label, reason: 'this brand has no icons yet' });
        break;
      }
      case 'photos': {
        const dir = lazyFolder(root, 'photos');
        const result = await writePhotos(dir, brand, signal);
        skipped.push(...result.skipped);
        if (result.added > 0) keep();
        else if (result.skipped.length === 0) {
          skipped.push({ label: unit.label, reason: 'this brand has no photos yet' });
        }
        break;
      }
      case 'about': {
        // Three files, because the strategy is read three ways: as
        // notes, as a document you send someone, and as data.
        zipAdd(root, 'strategy.md', buildStrategyMarkdown(brand));
        zipAdd(root, 'about.md', buildAboutMarkdown(brand));
        keep();
      try {
          const pdf = await buildStrategyPdf(brand, input.sourceBrand, { signal });
          zipAdd(root, 'strategy.pdf', pdf);
        } catch (err) {
          if ((err as { name?: string })?.name === 'ExportCancelled') throw err;
          // The markdown is already in — a PDF that would not build must
          // not cost the user the strategy itself.
          skipped.push({
            label: 'Strategy (PDF)',
            reason: err instanceof Error ? err.message : 'the document could not be built',
          });
        }
        break;
      }
      case 'card': {
        const designs = cardDesigns(unit, input);
        if (designs.length === 0) {
          skipped.push({
            label: unit.label,
            reason: input.sourceBrand ? 'it has no variant to render' : 'the export needs a saved brand',
          });
          break;
        }
        const aspect = aspectForLabel(unit.entry.storageLabel);
        // One design lands as the file the plan named; several become a
        // folder, so a card is never a pile of loose numbered PNGs at the
        // root of `deliverables/`.
        const folder =
          designs.length > 1
            ? lazyFolder(
                lazyFolder(root, 'deliverables'),
                unit.path.replace(/^deliverables\//, '').replace(/\.png$/, ''),
              )
            : null;
        const used = new Set<string>();
        for (let n = 0; n < designs.length; n += 1) {
          throwIfAborted(signal);
          const blob = await snapshotTemplatePng(designs[n].element, 260, aspect);
          if (!blob) {
            skipped.push({ label: `${unit.label} — ${designs[n].name}`, reason: "it couldn't be rasterized" });
            continue;
          }
          if (folder) {
            let name = `${String(n + 1).padStart(2, '0')}-${slugifyName(designs[n].name)}.png`;
            while (used.has(name)) name = `x-${name}`;
            used.add(name);
            zipAdd(folder, name, blob);
          } else {
            zipAdd(root, unit.path, blob);
          }
          keep();
          if (designs.length > 1) await yieldToBrowser(signal);
        }
        break;
      }
      case 'document': {
        const element = documentElement(unit, input);
        if (!element) {
          skipped.push({ label: unit.label, reason: 'the export needs a saved brand' });
          break;
        }
        const blob = await snapshotDocumentPng(element);
        if (blob) {
          zipAdd(root, unit.path, blob);
          keep();
        } else {
          skipped.push({ label: unit.label, reason: "it couldn't be rasterized" });
        }
        break;
      }
      case 'board': {
        if (!input.sourceBrand) {
          skipped.push({ label: unit.label, reason: 'the export needs a saved brand' });
          break;
        }
        // The board's draft is in-memory; `ensureInitFromBrand` no-ops
        // when the store already holds this brand's, so exporting can
        // never cost the user unsaved board work.
        useBrandBoardStore.getState().ensureInitFromBrand(input.sourceBrand);
        const blob = await snapshotTemplatePng(<BrandBoardCanvas />, 1600, 1.6, 1);
        if (blob) {
          zipAdd(root, unit.path, blob);
          keep();
        } else {
          skipped.push({ label: unit.label, reason: "it couldn't be rasterized" });
        }
        break;
      }
    }
  } catch (err) {
    if ((err as { name?: string })?.name === 'ExportCancelled') throw err;
    skipped.push({
      label: unit.label,
      reason: err instanceof Error ? err.message : 'it failed to export',
    });
    }
  return added;
}

/**
 * Build the zip.
 *
 * Throws `ExportCancelled` when the caller's signal aborts — checked
 * between units and inside the long ones, so Cancel is felt within a
 * unit rather than at the end of the run.
 */
export async function buildKitZipBlob(input: KitExportInput): Promise<KitExportResult> {
  const { brand, signal, onProgress } = input;
  const units = planKitExport(input.entries);
  const slug = slugifyName(brand.name);
  const skipped: ExportSkip[] = [];
  let added = 0;

  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const root = zip as unknown as ZipFolder;

  // brand.json is not a unit — it is the manifest every bundle carries,
  // whatever the viewer can see.
  zipAdd(root, 'brand.json', buildBrandJson(brand));

  // Pay the font cushion once, before the first capture rather than
  // inside each of them.
  await primeRenderEnvironment();

  for (let i = 0; i < units.length; i += 1) {
    const unit = units[i];
    throwIfAborted(signal);
    onProgress?.({ phase: 'collecting', done: i, total: units.length, label: unit.label });
    if (await writeUnit(unit, root, input, skipped)) added += 1;
    await yieldToBrowser(signal);
  }

  onProgress?.({
    phase: 'zipping',
    done: units.length,
    total: units.length,
    label: 'Packing the zip',
  });
  const blob = await zip.generateAsync(
    // DEFLATE is the DEFAULT, not the policy: every binary file was added
    // with an explicit STORE (see `zipAdd`), so what is compressed here is
    // the markdown, the JSON and the SVGs, which is where compression pays.
    { type: 'blob', compression: 'DEFLATE', streamFiles: true },
    (meta) => {
      onProgress?.({
        phase: 'zipping',
        done: units.length,
        total: units.length,
        label: `Packing the zip — ${Math.round(meta.percent)}%`,
      });
    },
  );
  throwIfAborted(signal);
  return { blob, added, skipped };
}

/**
 * Download ONE catalog entry, through the same writer the kit uses.
 *
 * A card's Download and the Export Kit are now the same code, so a card
 * can never answer "Nothing to export" for something the kit happily
 * ships — which is exactly what Social Media System, Presentation System
 * and Brand Board did, because the card path looked for a TEMPLATE and a
 * composed view has none.
 *
 * One file comes down as that file; several come down as a zip. Wrapping
 * a single PNG in a zip is a second step for no reason.
 */
export async function downloadEntry(
  entry: KitEntry,
  input: KitExportInput,
): Promise<{ added: boolean; skipped: ExportSkip[] }> {
  const [unit] = planKitExport([entry]);
  if (!unit) return { added: false, skipped: [] };
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const skipped: ExportSkip[] = [];
  await primeRenderEnvironment();
  const added = await writeUnit(unit, zip as unknown as ZipFolder, input, skipped);
  if (!added) return { added: false, skipped };

  const base = `${slugifyName(input.brand.name)}-${slugifyName(entry.label)}`;
  const paths = Object.keys(zip.files).filter((path) => !zip.files[path].dir);
  if (paths.length === 1) {
    const only = paths[0];
    const ext = only.includes('.') ? only.slice(only.lastIndexOf('.') + 1) : 'png';
    triggerBlobDownload(await zip.files[only].async('blob'), `${base}.${ext}`);
  } else {
    triggerBlobDownload(
      await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }),
      `${base}.zip`,
    );
  }
  return { added: true, skipped };
}

/** Build it and hand it to the browser. */
export async function downloadEverything(
  input: KitExportInput & { fileName?: string },
): Promise<KitExportResult> {
  const result = await buildKitZipBlob(input);
  triggerBlobDownload(
    result.blob,
    input.fileName ?? `${slugifyName(input.brand.name)}-brand-kit.zip`,
  );
  return result;
}
