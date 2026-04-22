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

/**
 * Pools of Unsplash IDs by shape — used by the photo-swap UI so the
 * user can cycle through alternatives that are sized/cropped for the
 * slot they're replacing.
 */
export const PHOTO_POOLS = {
  /** 1:1 portrait product / editorial shots. */
  square: [
    unsplash('1512428559087-560fa5ceab42', 640, 640), // hand & phone
    unsplash('1622979135225-d2ba269cf1ac', 640, 640), // VR headset
    unsplash('1557804506-669a67965ba0', 640, 640), // laptop work
    unsplash('1517336714731-489689fd1ca8', 640, 640), // macbook
    unsplash('1465101046530-73398c7f28ca', 640, 640), // mountain neon
    unsplash('1545239351-ef35f43d514b', 640, 640), // iridescent glass
    unsplash('1557672172-298e090bd0f1', 640, 640), // abstract pastel
    unsplash('1529108190281-9a4f620bc2d8', 640, 640), // blue architecture
  ],
  /** Taller product / lifestyle. */
  tall: [
    unsplash('1552664730-d307ca884978', 640, 800), // budgets / planning
    unsplash('1557804506-669a67965ba0', 640, 800), // collaboration
    unsplash('1521791136064-7986c2920216', 640, 800), // whiteboard team
    unsplash('1494790108377-be9c29b29330', 640, 800), // portrait 1
    unsplash('1506794778202-cad84cf45f1d', 640, 800), // portrait 2
    unsplash('1544005313-94ddf0286df2', 640, 800), // portrait 3
  ],
  /** Wide 4:3. */
  wide: [
    unsplash('1551288049-bebda4e38f71', 1000, 700), // laptop/analytics
    unsplash('1517336714731-489689fd1ca8', 1000, 700), // macbook desk
    unsplash('1498050108023-c5249f4df085', 1000, 700), // code
    unsplash('1481349518771-20055b2a7b24', 1000, 700), // sunset city
    unsplash('1524758631624-e2822e304c36', 1000, 700), // office
  ],
} as const;

/** Photography specifically for the Website showcase hero + sections. */
export const WEB_PHOTOS = {
  // Hero: analytics screen on a laptop — Carlos Muza
  heroDashboard: unsplash('1551288049-bebda4e38f71', 1000, 700),
  // Feature 3: team working at whiteboard — KOBU Agency
  featureTeam: unsplash('1521791136064-7986c2920216', 640, 480),
  // Avatars for the testimonial stack
  avatar1: unsplash('1494790108377-be9c29b29330', 96, 96),
  avatar2: unsplash('1507003211169-0a1dd7228f2d', 96, 96),
  avatar3: unsplash('1524250502761-1ac6f2e30d43', 96, 96),
  avatar4: unsplash('1506794778202-cad84cf45f1d', 96, 96),
};

