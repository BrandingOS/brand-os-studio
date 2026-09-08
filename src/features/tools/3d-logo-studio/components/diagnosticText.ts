/**
 * Import diagnostics, in words.
 *
 * Separate from the importer so the wording can change without touching the
 * parser, and so the severity of each case is decided in one place. Severity is
 * not cosmetic: `blocking` means nothing was imported, `warning` means the
 * result is not what the file described, and `info` means we did something the
 * user should know about but would probably have wanted.
 *
 * It sits in `components/` rather than beside the importer because it is UI
 * text, and because `render/` has to stay behind the lazy boundary — a module
 * of strings living there would have been enough to make the empty state
 * download the renderer.
 */

import type { ImportDiagnostic } from '../render/svgImport';

export type DiagnosticTone = 'blocking' | 'warning' | 'info';

export function describeDiagnostic(d: ImportDiagnostic): { tone: DiagnosticTone; message: string } {
  switch (d.code) {
    case 'parse-failed':
      return { tone: 'blocking', message: `That file could not be read as SVG. ${d.message}` };
    case 'too-complex':
      return {
        tone: 'blocking',
        message:
          `This file has ${d.points.toLocaleString()} points, past the ${d.limit.toLocaleString()} limit. ` +
          'Simplify the paths in your vector editor and try again.',
      };
    case 'no-fillable-geometry':
      return {
        tone: 'blocking',
        message: 'Nothing in this file has a fill. 3D geometry is built from filled shapes — try converting strokes to outlines first.',
      };
    case 'live-text':
      return {
        tone: 'warning',
        message:
          `${count(d.count, 'text element')} could not be used. Convert text to outlines in your vector editor, ` +
          'then re-import — fonts are not embedded in an SVG and cannot be reconstructed here.',
      };
    case 'raster-image':
      return {
        tone: 'warning',
        message: `${count(d.count, 'embedded image')} was skipped. Only vector shapes can become 3D geometry.`,
      };
    case 'unsupported-paint':
      return {
        tone: 'warning',
        message: `${count(d.count, `${label(d.kind)}`)} was ignored. The shapes underneath were imported as they are.`,
      };
    case 'external-reference':
      return {
        tone: 'warning',
        message:
          `${count(d.count, 'reference')} points at another server and was not loaded — nothing here contacts the network. ` +
          `First one: ${d.samples[0] ?? ''}`,
      };
    case 'script-removed':
      return { tone: 'info', message: `${count(d.count, 'script')} was removed from the file before it was read.` };
    case 'event-handler-removed':
      return { tone: 'info', message: `${count(d.count, 'event handler')} was removed from the file before it was read.` };
    case 'stroke-not-outlined':
      return {
        tone: 'warning',
        message:
          `${count(d.count, 'stroked path')} has no fill and was skipped. Outline the strokes in your vector editor to include them.`,
      };
    case 'background-rect-skipped':
      return {
        tone: 'info',
        message: 'A full-artboard rectangle was treated as a background and left out. Re-import with backgrounds kept if it is part of the design.',
      };
    case 'degenerate-path':
      return { tone: 'info', message: `${count(d.count, 'path')} had too few points to form a shape and was skipped.` };
    default: {
      // Exhaustiveness: adding a diagnostic without wording is a type error
      // here rather than an empty banner in production.
      const never: never = d;
      return { tone: 'info', message: String(never) };
    }
  }
}

function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

function label(kind: 'mask' | 'filter' | 'pattern' | 'clip-path'): string {
  return kind === 'clip-path' ? 'clip path' : kind;
}
