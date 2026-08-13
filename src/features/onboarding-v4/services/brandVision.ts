/**
 * Legacy store-routing half of the classifier (deleted with this folder).
 * The pure request + mapping now lives in `@/shared/upload/classify`.
 */
import { useV4Store } from '../store/onboardingV4Store';
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';
import { genId } from '@/shared/upload/intake';
import { classifyImage, verdictToPatch } from '@/shared/upload/classify';

const MAX_PALETTE_COLORS = 4;
const MIN_CONFIDENCE = 0.5;

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
