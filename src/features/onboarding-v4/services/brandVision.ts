/**
 * Brand Vision integration — our trained classifier places uploads into the
 * right Review-your-uploads section automatically.
 *
 * Every image queued through enqueueFile() is sent (non-blocking) to the
 * local Brand Vision service (brand-vision/, FastAPI). When the verdict
 * arrives, the asset's kind/isLogo/logoSlot are patched in the store; the
 * existing filename/alpha heuristics remain as the instant first guess and
 * as the silent fallback when the service isn't running.
 */
import { useV4Store } from '../store/onboardingV4Store';
import type { LogoSlot, OnboardingAsset } from '../types';
import { genId } from '../utils/assetUpload';

const BASE_URL: string =
  (import.meta as any).env?.VITE_BRAND_VISION_URL || 'http://localhost:8300';
const ENGINE: string = (import.meta as any).env?.VITE_BRAND_VISION_ENGINE || 'custom';
const TIMEOUT_MS = 25_000;
const MIN_CONFIDENCE = 0.5;
const MAX_PALETTE_COLORS = 4;

export interface BrandVisionVerdict {
  category: string;
  confidence: number;
  placement: 'logos' | 'images' | 'colors' | 'fonts' | 'files';
  is_logo: boolean;
  logo_slot: LogoSlot | null;
  reasoning: string;
  needs_review: boolean;
  signals?: { dominant_colors?: string[] };
}

/** Circuit breaker: when the service is down, stop retrying for a while so a
 *  20-file drop doesn't fire 20 doomed requests. */
let disabledUntil = 0;

export async function classifyImage(
  file: File,
  fetchImpl: typeof fetch = fetch
): Promise<BrandVisionVerdict | null> {
  if (Date.now() < disabledUntil) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('engine', ENGINE);
    const res = await fetchImpl(`${BASE_URL}/classify`, {
      method: 'POST',
      body: fd,
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as BrandVisionVerdict;
  } catch {
    disabledUntil = Date.now() + 60_000;
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Map a verdict onto an OnboardingAsset patch. Pure — unit-tested.
 *
 *  The model only ever ADDS certainty. It can promote an unrecognized image
 *  to a logo and pick its slot, but it must never take "logo" away: the
 *  upload heuristics (SVG, transparency, filename) are conservative and
 *  right far more often than a single misread — and a wrong demotion loses
 *  the user's logo entirely, while a wrong promotion is one drag to undo.
 */
export function verdictToPatch(
  verdict: BrandVisionVerdict,
  current: Pick<OnboardingAsset, 'kind' | 'sub' | 'isLogo'>
): Partial<OnboardingAsset> {
  const aiTag = ` · ✨ ${verdict.category.replace(/_/g, ' ')}`;
  const sub = current.sub.includes(' · ✨') ? current.sub : `${current.sub}${aiTag}`;
  const aiPlacement = verdict.placement;

  // Already known to be a logo and the model disagrees → label only.
  if (current.isLogo && verdict.placement !== 'logos') {
    return { sub, aiPlacement };
  }

  switch (verdict.placement) {
    case 'logos':
      // aiLogoSlot (a hint), NOT logoSlot: assigning a real slot here would
      // make the dropzone hide the tile (it filters out placed logos).
      return {
        kind: 'image',
        isLogo: true,
        aiLogoSlot: verdict.logo_slot ?? undefined,
        sub,
        aiPlacement,
      };
    case 'colors':
      // A palette IMAGE stays an image card; its colors are added separately.
      return { kind: 'image', isLogo: false, sub, aiPlacement };
    case 'images':
      return { kind: 'image', isLogo: false, sub, aiPlacement };
    case 'fonts':
      // A type-specimen IMAGE can't become a font file — keep it an image.
      return current.kind === 'font' ? { sub, aiPlacement } : { kind: 'image', isLogo: false, sub, aiPlacement };
    case 'files':
      return current.kind === 'image'
        ? { kind: 'file', isLogo: false, sub, aiPlacement }
        : { isLogo: false, sub, aiPlacement };
    default:
      return { sub };
  }
}

function addPaletteColors(colors: string[]): void {
  const { assets, addAsset } = useV4Store.getState();
  const existing = assets.filter((a) => a.kind === 'color' && a.value);
  let added = 0;
  for (const raw of colors) {
    if (added >= MAX_PALETTE_COLORS) break;
    const hex = raw.toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(hex)) continue;
    if (existing.some((a) => a.value === hex)) continue;
    // Collapse near-identical extracted swatches (same rule as addColor).
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const near = existing.some((a) => {
      const v = (a.value ?? '').replace('#', '');
      if (v.length !== 6) return false;
      const dr = parseInt(v.slice(0, 2), 16) - r;
      const dg = parseInt(v.slice(2, 4), 16) - g;
      const db = parseInt(v.slice(4, 6), 16) - b;
      return dr * dr + dg * dg + db * db <= 24 * 24;
    });
    if (near) continue;
    addAsset({
      id: genId(),
      name: hex,
      sub: 'Extracted',
      kind: 'color',
      value: hex,
      previewUrl: null,
      uploadStatus: 'done',
      uploadProgress: 1,
    });
    existing.push({ value: hex } as OnboardingAsset);
    added++;
  }
}

/** Fire-and-forget: classify an already-queued image asset and route it. */
export function classifyAndRoute(assetId: string, file: File): void {
  void classifyImage(file).then((verdict) => {
    if (!verdict || verdict.confidence < MIN_CONFIDENCE) return;
    const { assets, updateAsset } = useV4Store.getState();
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return; // removed while we were classifying

    // The model advises; it never overrules a placement. Once an upload sits
    // in a logo slot, demoting it here would delete the user's logo at save
    // time (the brand only stores assets that are still flagged as logos) —
    // and a single misread ("pattern" on a detailed mark) was enough to do
    // it. Placed assets get the label only; the user moves them, not us.
    if (asset.logoSlot) {
      const { sub } = verdictToPatch(verdict, asset);
      if (sub) updateAsset(assetId, { sub });
      return;
    }
    updateAsset(assetId, verdictToPatch(verdict, asset));
    if (verdict.placement === 'colors' && verdict.signals?.dominant_colors?.length) {
      addPaletteColors(verdict.signals.dominant_colors);
    }
  });
}
