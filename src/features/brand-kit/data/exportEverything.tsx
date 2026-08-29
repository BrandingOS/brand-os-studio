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
import {
  NATIVE_FORMATS,
  PRINT_PAGE_MM,
  SOCIAL_PACK_SLOTS,
  nativeFormatFor,
  pngToJpg,
  pngToPdf,
  resizePng,
  type CustomSize,
  type DownloadFormat,
  type KitNativeFormat,
} from './exportFormats';
import {
  buildDeckPptx,
  buildFaviconSet,
  buildKitReadmeFile,
  buildSignatureHtml,
  buildSocialSizePack,
  type ExportFile,
  type KitManifestEntry,
} from '../exporters';
import { dataUrlToBlob, planLogoExport } from './logoExport';
import { rasterizeLogo } from '@/shared/brand/rasterizeLogo';
import { brandColors } from '../renderers/brandStyle';
import {
  hydrateContent,
  type DeckContent,
  type PersonContent,
} from '@/features/brandkit/content/kinds';
import { buildPhotoFiles, directionForMock } from './photoExport';
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
  /**
   * Which formats travel beside the universal PNG.
   *
   * PNG is not a choice — every deliverable ships one, because it is the
   * one format that opens anywhere. `native` is the family's real file
   * (PPTX, ICO, HTML, a platform size pack) and is ON by default: it is
   * what makes the zip a kit rather than a folder of screenshots. `pdf` is
   * OFF by default because a print sheet per deliverable is a real cost
   * for people who only wanted the artwork.
   */
  formats?: KitExportFormats;
  onProgress?: (progress: KitExportProgress) => void;
  signal?: AbortSignal;
};

export type KitExportFormats = {
  /** The family's own file — PPTX · ICO · HTML · platform sizes. */
  native?: boolean;
  /** A print sheet at the deliverable's real paper size, per raster. */
  pdf?: boolean;
};

export const DEFAULT_FORMATS: KitExportFormats = { native: true, pdf: false };

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

/**
 * The brand's photography — every file proven to be one, and the rules.
 *
 * This function shipped D1. It fetched each source, checked `res.ok`, and
 * zipped whatever came back under a name it INVENTED from the mime type
 * (`photo-1.<blob.type>`). SKAM's only image is `/images/grain.png`, which
 * does not exist — and a single-page app answers a missing path with its own
 * `index.html` at status **200, text/html**. So `res.ok` passed, the type
 * split to `html`, and the download was a 2.9 KB zip holding the application
 * itself named `photo-1.html`.
 *
 * Every part of that is now `photoExport`'s job and none of it is guessed:
 * the response must claim `image/*` AND carry a real image signature
 * (`verifyImageBytes`), the extension comes from the bytes a decoder will
 * read, and the filename comes from the asset's own name in the Library.
 * Anything that fails is SKIPPED with a reason the user can act on.
 *
 * It also answers D12 — "the download produced no file". The art direction is
 * a document in its own right, so a brand that has written down how its
 * photography must look exports that even before it owns a photograph; only a
 * brand with neither pictures nor rules writes nothing, and then `writeUnit`
 * says so in the skip list.
 */
async function writePhotos(
  folder: ZipFolder,
  brand: MockBrand,
  signal?: AbortSignal,
): Promise<{ added: number; skipped: ExportSkip[] }> {
  throwIfAborted(signal);
  const direction = directionForMock(brand);
  const { files, skipped } = await buildPhotoFiles(brand, { direction, signal });
  // The rules document rides along whenever there is anything to SAY: a written
  // art direction, a photograph that went in, or a photograph that could not.
  // A brand with none of the three writes nothing, and `writeUnit` says so —
  // an `art-direction.md` reading "none yet" is an empty folder wearing a
  // filename. A brand whose only picture is broken gets the document, and the
  // document names the picture and the reason, which is the user-facing half
  // of D1.
  const worthSaying =
    direction.note.trim().length > 0 || files.length > 1 || skipped.length > 0;
  let added = 0;
  for (const file of files) {
    if (file.path === 'art-direction.md' && !worthSaying) continue;
    throwIfAborted(signal);
    zipAdd(folder, file.path, file.blob);
    added += 1;
    await yieldToBrowser(signal);
  }
  return { added, skipped };
}

/* ─── Native formats ──────────────────────────────────────────────── */

/**
 * The formats a family owes BEYOND the picture of itself.
 *
 * A PNG of a deck is a picture of a presentation: nobody can present it and
 * nobody can fix a typo in it. A PNG of a favicon is not a favicon — a
 * browser asks for `/favicon.ico` and gets a 404. A PNG of an email
 * signature cannot be pasted into a mail client, and a 1040px square is not
 * an Instagram Story. So every one of those families writes its real file
 * as well, out of `exporters/`, from the same content the picture was drawn
 * from.
 *
 * PNG stays universal. This is additive: nothing that used to be in the zip
 * leaves it, and a family with no native format is untouched.
 */

/** Every file an exporter handed back, into the folder it belongs in. */
function writeFiles(folder: ZipFolder, files: ReadonlyArray<ExportFile>): number {
  for (const file of files) zipAdd(folder, file.path, file.blob);
  return files.length;
}

/**
 * The brand's own logo as a PNG data URL, rasterized ONCE per brand.
 *
 * Three natives want it (deck, favicon, signature) and rasterizing a logo
 * is a canvas round trip, so a whole-kit export would otherwise pay for it
 * three times. `planLogoExport` is the same plan the `logos/` folder is
 * built from, so the mark in the deck is the mark in the zip.
 */
const LOGO_PNG_CACHE = new WeakMap<object, Promise<string | null>>();

function brandLogoPngUrl(brand: MockBrand): Promise<string | null> {
  const cached = LOGO_PNG_CACHE.get(brand);
  if (cached) return cached;
  const work = (async () => {
    const [variant] = planLogoExport(brand);
    if (!variant) return null;
    // Padding kept small: these grounds are chosen by the exporter, and a
    // logo that arrives pre-padded is padded twice.
    return rasterizeLogo(variant.url, { size: 1024, padding: 0.04 });
  })();
  LOGO_PNG_CACHE.set(brand, work);
  return work;
}

/** The first design a card shows — the one the PNG was drawn from. */
function firstTemplateFor(unit: KitExportUnit, input: KitExportInput) {
  const all = variantsForCard(unit.entry.sectionKey, unit.entry.storageLabel, input.brand);
  return featuredTemplates(unit.entry.storageLabel, all, input.featuredIdsByLabel)[0];
}

/**
 * The structured content this unit's native file is written from.
 *
 * The user's saved Quick Edit when there is one for the design the picture
 * came from, the brand's own defaults otherwise. `hydrateContent` refuses a
 * record belonging to a different kind, so a person saved against a card
 * can never end up as a deck.
 */
function nativeContent<T>(
  kind: 'deck' | 'person',
  unit: KitExportUnit,
  input: KitExportInput,
): T {
  const template = firstTemplateFor(unit, input);
  const stored = template ? input.saved?.[template.id]?.content : undefined;
  return hydrateContent(kind, input.brand, stored) as unknown as T;
}

/** `deliverables/business-card.png` → `business-card`. */
function stemOf(unit: KitExportUnit): string {
  return unit.path.replace(/^deliverables\//, '').replace(/\.[a-z0-9]+$/i, '');
}

/**
 * Write the family's native file(s) beside the picture.
 *
 * Single-file natives sit next to the PNG under the same stem; a native
 * that is a SET (the favicon files, a size pack) gets a folder of its own
 * named for the deliverable, so a zip listing never becomes a pile of
 * loose files whose names only make sense together.
 *
 * A native that cannot be built is a SKIP with a reason, never a throw: the
 * picture is already in the zip and a missing PPTX must not cost the user
 * the export they were waiting for.
 */
async function writeNative(
  unit: KitExportUnit,
  root: ZipFolder,
  input: KitExportInput,
  skipped: ExportSkip[],
  png: Blob | null,
): Promise<void> {
  const native = nativeFormatFor(unit.entry);
  if (!native) return;
  const { brand, signal } = input;
  const stem = stemOf(unit);
  const deliverables = () => lazyFolder(root, 'deliverables');
  try {
    throwIfAborted(signal);
    switch (native) {
      case 'pptx': {
        const files = await buildDeckPptx(
          nativeContent<DeckContent>('deck', unit, input),
          brand,
          { logo: await brandLogoPngUrl(brand), fileName: `${stem}.pptx` },
        );
        writeFiles(deliverables(), files);
        break;
      }
      case 'html': {
        const files = buildSignatureHtml(
          nativeContent<PersonContent>('person', unit, input),
          brand,
          await brandLogoPngUrl(brand),
        );
        // `signature.html` → `email-signature.html`: the file is named for
        // the deliverable it came from, like every other file in the zip.
        writeFiles(
          deliverables(),
          files.map((f) => ({ ...f, path: f.path.replace(/^signature/, stem) })),
        );
        break;
      }
      case 'ico': {
        const url = await brandLogoPngUrl(brand);
        const logo = url ? dataUrlToBlob(url) : null;
        if (!logo) {
          skipped.push({
            label: `${unit.label} (${NATIVE_FORMATS.ico.chip})`,
            reason: 'this brand has no logo to build icons from',
          });
          break;
        }
        writeFiles(
          lazyFolder(deliverables(), stem),
          await buildFaviconSet(logo, {
            brandColor: brandColors(brand).primary,
            name: brand.name,
          }),
        );
        break;
      }
      case 'sizes': {
        if (!png) break;
        const slots = SOCIAL_PACK_SLOTS[unit.entry.storageLabel] ?? [];
        if (slots.length === 0) break;
        writeFiles(lazyFolder(deliverables(), stem), await buildSocialSizePack(png, slots));
        break;
      }
    }
  } catch (err) {
    if ((err as { name?: string })?.name === 'ExportCancelled') throw err;
    skipped.push({
      label: `${unit.label} (${NATIVE_FORMATS[native].chip})`,
      reason: err instanceof Error ? err.message : 'the native file could not be built',
    });
  }
}

/**
 * The print sheet, for the families the Formats section asked for it.
 *
 * `pngToPdf` wraps the raster on the deliverable's real paper size — the
 * honest meaning of "For print" until a family's vector exporter lands.
 */
async function writePrintPdf(
  unit: KitExportUnit,
  root: ZipFolder,
  input: KitExportInput,
  skipped: ExportSkip[],
  png: Blob | null,
): Promise<void> {
  if (!png) return;
  try {
    throwIfAborted(input.signal);
    const page = PRINT_PAGE_MM[unit.entry.storageLabel] ?? 'fit';
    zipAdd(lazyFolder(root, 'deliverables'), `${stemOf(unit)}.pdf`, await pngToPdf(png, page));
  } catch (err) {
    if ((err as { name?: string })?.name === 'ExportCancelled') throw err;
    skipped.push({
      label: `${unit.label} (PDF)`,
      reason: err instanceof Error ? err.message : 'the print sheet could not be built',
    });
  }
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
  // The picture this unit drew, kept so the native formats and the print
  // sheet are made from the SAME raster the zip ships rather than from a
  // second render that could differ.
  let primary: Blob | null = null;
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
          primary ??= blob;
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
          primary = blob;
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
          primary = blob;
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

  // The native file comes AFTER the picture, and only when the picture
  // arrived — a unit that produced nothing has nothing to be native about,
  // and the raster is what half of these are built from.
  if (added) {
    const formats = input.formats ?? DEFAULT_FORMATS;
    if (formats.native !== false) await writeNative(unit, root, input, skipped, primary);
    if (formats.pdf) await writePrintPdf(unit, root, input, skipped, primary);
  }
  return added;
}

/**
 * Every file in the finished zip, told who it belongs to.
 *
 * Read back out of the ARCHIVE rather than assembled from the plan: a unit
 * writes between zero and forty files depending on the brand, the depth and
 * whether its native exporter worked, so a list built from intentions is a
 * list that goes stale the first time anything is skipped. Ownership is by
 * longest matching stem, which is what makes `deliverables/business-card`
 * claim its `.png`, its `.pptx` and its variants folder while leaving
 * `deliverables/business-card-stack.png` to the mockup that drew it.
 */
function manifestOf(
  zip: { files: Record<string, { dir: boolean }> },
  units: ReadonlyArray<KitExportUnit>,
): KitManifestEntry[] {
  const owners = units
    .map((unit) => ({
      unit,
      stem: unit.path.endsWith('/') ? unit.path : unit.path.replace(/\.[a-z0-9]+$/i, ''),
    }))
    .sort((a, b) => b.stem.length - a.stem.length);
  return Object.keys(zip.files)
    .filter((path) => !zip.files[path].dir)
    .sort()
    .map((path) => {
      const owner = owners.find((o) => path.startsWith(o.stem));
      return owner ? { path, label: owner.unit.label, kind: owner.unit.kind } : { path };
    });
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

  // The README is written LAST and from the zip itself, so it cannot claim
  // a file that is not there or miss one that is — which is exactly what a
  // README assembled from the plan would do the moment a unit skipped, a
  // native failed, or a card turned out to have three variants.
  zipAdd(
    root,
    'README.md',
    buildKitReadmeFile(brand, {
      // Itself included: a table of contents that omits the one file the
      // reader is holding is a table of contents with a hole in it.
      files: [{ path: 'README.md', label: 'This file' }, ...manifestOf(zip, units)],
      skipped,
      generatedAt: new Date(),
    }).blob,
  );

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
 * Which files in a unit's output ARE a given native format.
 *
 * Matched on the path rather than tracked as a second list, because the
 * zip is the only record of what was actually written — a native that
 * failed leaves no file and the download falls back to the raster instead
 * of handing the user an empty archive.
 */
const NATIVE_PATTERN: Record<KitNativeFormat, RegExp> = {
  pptx: /\.pptx$/i,
  // The whole set: the container, the PNG ladder, the manifest, the
  // snippet. An `.ico` on its own is not an answer to "add a favicon".
  ico: /^deliverables\/[^/]+\/(favicon|apple-touch-icon|icon-|site\.webmanifest|snippet\.html)/i,
  html: /\.(html|txt)$/i,
  sizes: /^deliverables\/[^/]+\/[a-z0-9-]+-\d+x\d+\.png$/i,
};

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
  choice: { format?: DownloadFormat; size?: CustomSize } = {},
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
  const format = choice.format ?? 'png';

  const send = async (picked: string[], keepName = false): Promise<void> => {
    if (picked.length === 1) {
      const only = picked[0];
      // A native file is already named for what it IS — `pitch-deck.pptx`,
      // `instagram-post-1080x1080.png` — and that name carries the size,
      // which is the whole reason someone asked for a size pack. Renaming
      // it to the generic base would throw that away.
      if (keepName) {
        const leaf = only.slice(only.lastIndexOf('/') + 1);
        triggerBlobDownload(
          await zip.files[only].async('blob'),
          `${slugifyName(input.brand.name)}-${leaf}`,
        );
        return;
      }
      const ext = only.includes('.') ? only.slice(only.lastIndexOf('.') + 1) : 'png';
      triggerBlobDownload(await zip.files[only].async('blob'), `${base}.${ext}`);
      return;
    }
    // Several files are one deliverable in several parts, so they travel
    // together. Wrapping a SINGLE file in a zip is a second step for
    // nothing, which is why the branch above exists.
    const out = new JSZip();
    for (const path of picked) out.file(path, await zip.files[path].async('blob'));
    triggerBlobDownload(await out.generateAsync({ type: 'blob', compression: 'DEFLATE' }), `${base}.zip`);
  };

  // A native format hands over exactly the files that format names — the
  // deck itself, the icon set, the markup, the size pack. Nothing is
  // derived here: `writeUnit` already built them, from the same content the
  // picture was drawn from.
  const wanted = NATIVE_PATTERN[format as KitNativeFormat];
  if (wanted) {
    const picked = paths.filter((path) => wanted.test(path));
    if (picked.length > 0) {
      await send(picked, true);
      return { added: true, skipped };
    }
    // Nothing native was produced — fall through to the raster rather than
    // handing the user an empty download.
  }

  // The format menu, for a rasterized deliverable. PDF wraps the raster on
  // the family's real paper size; JPG flattens it; custom resizes it. An
  // asset FOLDER (logos, colors, fonts) is exempt: it already contains its
  // own PDFs and vectors, and converting one PNG out of it would be a
  // worse answer than the folder.
  const rasterUnit = unit.kind === 'card' || unit.kind === 'document' || unit.kind === 'board';
  const png = paths.includes(unit.path) && unit.path.endsWith('.png')
    ? unit.path
    : paths.find((path) => path.endsWith('.png'));
  if (rasterUnit && png && (format === 'pdf' || format === 'jpg' || format === 'custom')) {
    const raster = await zip.files[png].async('blob');
    if (format === 'pdf') {
      const page = PRINT_PAGE_MM[entry.storageLabel] ?? 'fit';
      triggerBlobDownload(await pngToPdf(raster, page), `${base}.pdf`);
    } else if (format === 'jpg') {
      triggerBlobDownload(await pngToJpg(raster), `${base}.jpg`);
    } else if (choice.size) {
      triggerBlobDownload(await resizePng(raster, choice.size), `${base}-${choice.size.width}px.png`);
    } else {
      triggerBlobDownload(raster, `${base}.png`);
    }
    return { added: true, skipped };
  }
  if (rasterUnit && png && format === 'png') {
    triggerBlobDownload(await zip.files[png].async('blob'), `${base}.png`);
    return { added: true, skipped };
  }
  if (format === 'svg') {
    const vectors = paths.filter((path) => path.endsWith('.svg'));
    if (vectors.length > 0) {
      await send(vectors);
      return { added: true, skipped };
    }
  }
  await send(paths);
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
