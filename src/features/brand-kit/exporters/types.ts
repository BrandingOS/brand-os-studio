/**
 * What every exporter in this folder hands back.
 *
 * An exporter is a PURE BUILDER: content + brand (+ rasters someone else
 * already made) in, files out. It never touches the DOM of the running
 * app, never reads a store, never triggers a download and never decides
 * where in a zip its files belong beyond its own relative names.
 *
 * That is the whole point. The kit had one export path per surface — the
 * card menu, the drilldown header, the tile, Export Kit — and each one
 * assembled its payload from whatever was on screen at the time, so the
 * same deliverable came out differently depending on which button you
 * pressed. A builder that takes the MODEL and returns bytes can be called
 * by all four, and by a test.
 */

/** One file, at a path relative to whatever folder the caller writes into. */
export type ExportFile = {
  /** `favicon.ico`, `icons/icon-512.png` — never absolute, never `../`. */
  path: string;
  blob: Blob;
};

/**
 * A raster handed in by the caller.
 *
 * Exporters do not rasterize: `rasterizeLogo`, `snapshotTemplatePng` and
 * `html2canvas` all need a live document, and an exporter that needed one
 * could not run in a worker, a test, or the middle of a zip build. The
 * caller does that work once and passes the result here — as a `Blob`, or
 * as the `data:` URL `rasterizeLogo` already returns.
 */
export type RasterInput = Blob | string;
