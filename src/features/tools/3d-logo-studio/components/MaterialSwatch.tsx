/**
 * The circle beside a material's name.
 *
 * It renders a flat chip immediately and swaps in the real sphere when it
 * arrives. That order matters: the thumbnails need a WebGL context and one
 * frame of work, and a picker that shows nothing until then reads as broken —
 * while a picker that shows only the chip on a machine without WebGL is merely
 * less informative, which is the right failure.
 *
 * The renderer is reached through a dynamic import so that Three.js stays out
 * of the page chunk. The properties panel is eagerly loaded; a static import
 * here would put the whole renderer back in front of the empty state, which is
 * the exact regression the boundary tests were added to catch.
 */
import { useEffect, useState } from 'react';

// Its own stylesheet, not a neighbour's. The circular crop lives here, and
// relying on `Studio3dEditor` to have imported it meant the swatch was a square
// anywhere the editor was not also mounted — which is every place a picker
// might reasonably be reused.
import '../studio3d.css';
import type { MaterialPreset } from '../materials/types';
import { MATERIAL_PRESETS } from '../materials/presets';

const SIZE = 96;

let thumbnails: Map<string, string> | null = null;
let inFlight: Promise<Map<string, string>> | null = null;
const listeners = new Set<() => void>();

function ensureThumbnails(): void {
  if (thumbnails || inFlight) return;
  inFlight = import('../render/materialThumbnails')
    .then((m) => m.materialThumbnails(MATERIAL_PRESETS, SIZE))
    .then((map) => {
      thumbnails = map;
      for (const notify of listeners) notify();
      return map;
    })
    .catch(() => new Map<string, string>());
}

export interface MaterialSwatchProps {
  preset: MaterialPreset;
  /** Rendered size in CSS pixels. */
  size?: number;
}

export function MaterialSwatch({ preset, size = 22 }: MaterialSwatchProps) {
  const [, bump] = useState(0);

  useEffect(() => {
    ensureThumbnails();
    const notify = () => bump((n) => n + 1);
    listeners.add(notify);
    return () => { listeners.delete(notify); };
  }, []);

  const url = thumbnails?.get(preset.id);

  return (
    <span
      className="l3d-swatch"
      style={{ width: size, height: size, background: url ? undefined : chipBackground(preset) }}
      aria-hidden="true"
    >
      {url && <img src={url} alt="" width={size} height={size} />}
    </span>
  );
}

/**
 * The stand-in shown before the render arrives.
 *
 * Deliberately crude — a lit sphere approximated with two gradients. It exists
 * to hold the shape and the rough tone, not to be mistaken for the material:
 * the whole reason the thumbnails are rendered is that colour alone cannot tell
 * chrome from brushed aluminium.
 */
function chipBackground(preset: MaterialPreset): string {
  const { color, metalness, roughness, transmission, emissive, emissiveIntensity } = preset.params;
  if (transmission > 0.5) {
    return `radial-gradient(circle at 34% 28%, rgba(255,255,255,0.95), rgba(255,255,255,0.35) 45%, ${color}22 70%, ${color}55)`;
  }
  if (emissiveIntensity > 0) {
    return `radial-gradient(circle at 40% 34%, ${emissive}, ${color} 70%)`;
  }
  // A sharper highlight for a smoother, more metallic surface.
  const highlight = 0.9 - roughness * 0.55;
  const stop = 12 + roughness * 40;
  const shade = metalness > 0.5 ? 0.55 : 0.75;
  return (
    `radial-gradient(circle at 34% 28%, rgba(255,255,255,${highlight.toFixed(2)}), ` +
    `rgba(255,255,255,0) ${stop.toFixed(0)}%), ` +
    `linear-gradient(160deg, ${color}, color-mix(in srgb, ${color} ${(shade * 100).toFixed(0)}%, #000))`
  );
}

/** Options for a `DsSelect`, each carrying its own rendered swatch. */
export function materialOptions(presets: readonly MaterialPreset[] = MATERIAL_PRESETS) {
  return presets.map((preset) => ({
    value: preset.id,
    label: preset.name,
    icon: <MaterialSwatch preset={preset} />,
  }));
}
