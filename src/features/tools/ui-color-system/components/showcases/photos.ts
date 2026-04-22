/**
 * Curated Unsplash photo URLs for showcase tiles.
 *
 * Each entry is a stable, widely-used photo ID from Unsplash that
 * matches the editorial tone of the uicolors.app reference screenshot.
 * We request small, cropped variants (`?w=640&h=640&fit=crop&auto=format`)
 * so the download is <80kB per tile and looks sharp on 2x displays.
 *
 * Replacing these with a different photography pack is a single-file
 * change — showcases consume `PHOTOS.trackExpenses`, not raw URLs.
 */
export type PhotoKey =
  | 'trackExpenses'
  | 'vrHeadset'
  | 'womenAtLaptop'
  | 'macbook'
  | 'blogNomad'
  | 'blogProductivity'
  | 'blogDesign'
  | 'budgets';

function unsplash(id: string, w: number, h: number): string {
  return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=70`;
}

export const PHOTOS: Record<PhotoKey, string> = {
  // Man holding phone/book — Blaz Photo
  trackExpenses: unsplash('1512428559087-560fa5ceab42', 640, 640),
  // VR headset closeup — Minh Pham
  vrHeadset: unsplash('1622979135225-d2ba269cf1ac', 640, 640),
  // Women with laptop — Brooke Cagle
  womenAtLaptop: unsplash('1557804506-669a67965ba0', 640, 800),
  // MacBook Pro on desk — Clay Banks
  macbook: unsplash('1517336714731-489689fd1ca8', 640, 400),
  // Digital nomad — Avi Richards
  blogNomad: unsplash('1522071820081-009f0129c71c', 160, 160),
  // Productivity / notebook — Andrew Neel
  blogProductivity: unsplash('1507003211169-0a1dd7228f2d', 160, 160),
  // Design team meeting — Mapbox
  blogDesign: unsplash('1524758631624-e2822e304c36', 160, 160),
  // Budgets / planning hero — Brooke Cagle alt
  budgets: unsplash('1552664730-d307ca884978', 640, 800),
};
