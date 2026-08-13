/**
 * Optional image classification.
 *
 * Moved out of the onboarding feature (spec 002): this is a pure request +
 * verdict-to-patch mapping with no store coupling, so it belongs beside the
 * other intake utilities. The caller decides what to do with a verdict.
 *
 * Every image queued through enqueueFile() is sent (non-blocking) to the
 * local Brand Vision service (brand-vision/, FastAPI). When the verdict
 * arrives, the asset's kind/isLogo/logoSlot are patched in the store; the
 * existing filename/alpha heuristics remain as the instant first guess and
 * as the silent fallback when the service isn't running.
 */
import type { LogoSlot, OnboardingAsset } from './intakeTypes';

// Opt-in only: the classifier runs ONLY when an env override is configured —
// `VITE_CLASSIFIER_URL` (or the legacy `VITE_BRAND_VISION_URL`). When neither
// is set (the default, dev included) the fetch is skipped entirely and the
// filename/alpha heuristics are the answer — no doomed request to a
// hard-coded localhost:8300. Deliberately not in .env.example: it's a
// local-tooling override, not app configuration. Read lazily so tests can
// stub the env per-case.
function classifierBaseUrl(): string {
  const env = (import.meta as any).env ?? {};
  // process.env fallback: import.meta.env is per-module under Vitest, so
  // vi.stubEnv can only reach this module through process.env. Guarded —
  // `process` doesn't exist in the browser.
  const nodeEnv: Record<string, string | undefined> =
    typeof process !== 'undefined' ? process.env ?? {} : {};
  return (
    env.VITE_CLASSIFIER_URL ||
    nodeEnv.VITE_CLASSIFIER_URL ||
    env.VITE_BRAND_VISION_URL ||
    nodeEnv.VITE_BRAND_VISION_URL ||
    ''
  );
}
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
  const baseUrl = classifierBaseUrl();
  if (!baseUrl) return null; // no env override configured → heuristics only
  if (Date.now() < disabledUntil) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('engine', ENGINE);
    const res = await fetchImpl(`${baseUrl}/classify`, {
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

