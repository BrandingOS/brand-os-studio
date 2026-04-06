/**
 * jsPDF font loader
 *
 * jsPDF only ships with helvetica/times/courier. To render slides in the
 * actual brand font, we have to register the font's TTF with the document
 * via addFileToVFS + addFont.
 *
 * Strategy (in priority order):
 *   1. Check if the family is bundled in /fonts/pdf/{family}-{weight}.ttf
 *      → fetch from public folder, register
 *   2. Otherwise, fetch the Google Fonts CSS, extract the TTF URL, fetch the
 *      TTF binary, register
 *   3. If both fail, the family is unavailable and the emitter falls back
 *      to helvetica with a console warning
 *
 * The cache is process-global so subsequent exports in the same session are
 * instant. The cache key is `${family}-${weight}` lower-cased.
 */

import type jsPDFType from 'jspdf';
import { useBrandStore } from '@/shared/store/brandStore';

type Weight = 400 | 700;

const TTF_CACHE = new Map<string, ArrayBuffer>();

const SYSTEM_FONTS = new Set([
  'arial', 'helvetica', 'helvetica neue', 'times', 'times new roman',
  'georgia', 'courier', 'courier new', 'monaco', 'menlo', 'consolas',
  'system-ui', '-apple-system', 'sans-serif', 'serif', 'monospace',
]);

export interface RegisterFontsResult {
  /** Lowercased family names that were successfully registered. */
  available: Set<string>;
  warnings: string[];
}

/**
 * Registers the active brand's primary + secondary fonts (regular + bold)
 * with the given jsPDF document. Safe to call repeatedly per document.
 */
export async function registerBrandFontsForPdf(doc: jsPDFType): Promise<RegisterFontsResult> {
  const result: RegisterFontsResult = { available: new Set(), warnings: [] };
  const brand = useBrandStore.getState().current;
  if (!brand?.fonts) return result;

  const families = [brand.fonts.primary, brand.fonts.secondary]
    .filter(Boolean)
    .map((f) => (f as string).trim())
    .filter((f) => !SYSTEM_FONTS.has(f.toLowerCase()));

  for (const family of families) {
    let registeredAny = false;
    for (const weight of [400, 700] as Weight[]) {
      try {
        const buf = await loadTTF(family, weight);
        if (!buf) continue;
        const base64 = arrayBufferToBase64(buf);
        const filename = `${family.replace(/\s+/g, '')}-${weight}.ttf`;
        doc.addFileToVFS(filename, base64);
        doc.addFont(filename, family, weight === 700 ? 'bold' : 'normal');
        registeredAny = true;
      } catch (err) {
        // try next weight
      }
    }
    if (registeredAny) {
      result.available.add(family.toLowerCase());
    } else {
      result.warnings.push(`Could not load font "${family}" — falling back to Helvetica`);
    }
  }

  return result;
}

/**
 * Resolves a font family from the IR text-node CSS stack to a registered
 * jsPDF family name. Falls back to 'helvetica' when nothing matches.
 */
export function resolvePdfFontFamily(cssStack: string, available: Set<string>): string {
  const families = cssStack.split(',').map((f) => f.trim().replace(/^["']|["']$/g, ''));
  for (const f of families) {
    if (available.has(f.toLowerCase())) return f;
    if (SYSTEM_FONTS.has(f.toLowerCase())) {
      // Map to jsPDF built-ins
      const lower = f.toLowerCase();
      if (lower.includes('times') || lower.includes('serif')) return 'times';
      if (lower.includes('courier') || lower.includes('mono')) return 'courier';
      return 'helvetica';
    }
  }
  return 'helvetica';
}

// ── Loading ─────────────────────────────────────────────────

async function loadTTF(family: string, weight: Weight): Promise<ArrayBuffer | null> {
  const cacheKey = `${family.toLowerCase()}-${weight}`;
  const cached = TTF_CACHE.get(cacheKey);
  if (cached) return cached;

  // 1. Try bundled file
  try {
    const bundledUrl = `/fonts/pdf/${family.replace(/\s+/g, '')}-${weight}.ttf`;
    const res = await fetch(bundledUrl);
    if (res.ok) {
      const buf = await res.arrayBuffer();
      TTF_CACHE.set(cacheKey, buf);
      return buf;
    }
  } catch {
    /* fall through to Google Fonts */
  }

  // 2. Try Google Fonts via the CSS API
  try {
    const ttfUrl = await resolveGoogleFontTTF(family, weight);
    if (!ttfUrl) return null;
    const res = await fetch(ttfUrl);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    TTF_CACHE.set(cacheKey, buf);
    return buf;
  } catch (err) {
    console.warn('[vector-export] Google Fonts fetch failed for', family, weight, err);
    return null;
  }
}

async function resolveGoogleFontTTF(family: string, weight: Weight): Promise<string | null> {
  // Google's CSS endpoint returns @font-face rules with one src URL per format.
  // We have to spoof an old User-Agent to get TTF (modern UAs get woff2 by default).
  // Since browsers can't override User-Agent, we use the css1 endpoint which prefers TTF.
  const familyParam = family.replace(/\s+/g, '+');
  const cssUrl = `https://fonts.googleapis.com/css?family=${familyParam}:${weight}`;
  const res = await fetch(cssUrl);
  if (!res.ok) return null;
  const css = await res.text();

  // Extract first url(...) — css1 endpoint serves .ttf
  const m = css.match(/url\((https:\/\/[^)]+\.ttf)\)/);
  if (m) return m[1];

  // Fallback: any url(...) — may be woff/woff2 but try anyway
  const any = css.match(/url\((https:\/\/[^)]+)\)/);
  return any ? any[1] : null;
}

// ── Utils ───────────────────────────────────────────────────

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}
