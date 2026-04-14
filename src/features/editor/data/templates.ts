/**
 * Design templates — Fabric.js JSON that can be loaded onto the canvas.
 * Each template targets a common use-case (social media, presentation, etc.)
 * and includes placeholder text, shapes, and colors.
 */

export interface DesignTemplate {
  id: string;
  name: string;
  category: 'social' | 'presentation' | 'marketing' | 'card';
  width: number;
  height: number;
  /** Fabric.js canvas JSON — pass to canvas.loadFromJSON() */
  json: object;
  /** Tiny inline color for the thumbnail card */
  accent: string;
}

// Helper: build a full canvas JSON envelope
function canvasJSON(w: number, h: number, bg: string, objects: object[]) {
  return {
    version: '6.0.0',
    objects,
    background: bg,
  };
}

export const DESIGN_TEMPLATES: DesignTemplate[] = [
  // ─── Social Media ─────────────────────────────────────────────
  {
    id: 'ig-post-bold',
    name: 'Bold Statement',
    category: 'social',
    width: 1080,
    height: 1080,
    accent: '#6366f1',
    json: canvasJSON(1080, 1080, '#6366f1', [
      { type: 'rect', left: 0, top: 0, width: 1080, height: 1080, fill: '#6366f1' },
      { type: 'textbox', text: 'MAKE IT\nHAPPEN.', left: 80, top: 320, width: 920, fontSize: 120, fontWeight: '800', fontFamily: 'Inter', fill: '#ffffff', textAlign: 'left', lineHeight: 1.05 },
      { type: 'textbox', text: 'Your brand tagline goes here', left: 80, top: 700, width: 600, fontSize: 28, fontWeight: '400', fontFamily: 'Inter', fill: 'rgba(255,255,255,0.7)', textAlign: 'left' },
      { type: 'rect', left: 80, top: 920, width: 180, height: 6, fill: '#ffffff', rx: 3, ry: 3 },
    ]),
  },
  {
    id: 'ig-post-minimal',
    name: 'Minimal Quote',
    category: 'social',
    width: 1080,
    height: 1080,
    accent: '#1a1a1a',
    json: canvasJSON(1080, 1080, '#fafafa', [
      { type: 'rect', left: 0, top: 0, width: 1080, height: 1080, fill: '#fafafa' },
      { type: 'textbox', text: '"', left: 60, top: 200, width: 100, fontSize: 200, fontWeight: '700', fontFamily: 'Georgia', fill: '#e5e5e5', textAlign: 'left' },
      { type: 'textbox', text: 'Design is not just what it\nlooks like and feels like.\nDesign is how it works.', left: 100, top: 340, width: 880, fontSize: 48, fontWeight: '500', fontFamily: 'Inter', fill: '#1a1a1a', textAlign: 'left', lineHeight: 1.4 },
      { type: 'textbox', text: '— Steve Jobs', left: 100, top: 680, width: 400, fontSize: 24, fontWeight: '400', fontFamily: 'Inter', fill: '#999999', textAlign: 'left' },
      { type: 'rect', left: 100, top: 640, width: 60, height: 3, fill: '#1a1a1a' },
    ]),
  },
  {
    id: 'ig-story-gradient',
    name: 'Gradient Story',
    category: 'social',
    width: 1080,
    height: 1920,
    accent: '#ec4899',
    json: canvasJSON(1080, 1920, '#0f172a', [
      { type: 'rect', left: 0, top: 0, width: 1080, height: 1920, fill: '#0f172a' },
      { type: 'rect', left: 0, top: 960, width: 1080, height: 960, fill: '#ec4899', opacity: 0.3 },
      { type: 'circle', left: 440, top: 400, radius: 100, fill: '#ec4899', opacity: 0.8 },
      { type: 'circle', left: 200, top: 300, radius: 60, fill: '#a855f7', opacity: 0.5 },
      { type: 'textbox', text: 'SWIPE UP', left: 200, top: 1300, width: 680, fontSize: 72, fontWeight: '800', fontFamily: 'Inter', fill: '#ffffff', textAlign: 'center' },
      { type: 'textbox', text: 'for something amazing', left: 200, top: 1420, width: 680, fontSize: 28, fontWeight: '400', fontFamily: 'Inter', fill: 'rgba(255,255,255,0.6)', textAlign: 'center' },
      { type: 'polygon', points: [{ x: 540, y: 1560 }, { x: 520, y: 1520 }, { x: 560, y: 1520 }], fill: '#ffffff', opacity: 0.8 },
    ]),
  },
  {
    id: 'fb-cover',
    name: 'Facebook Cover',
    category: 'social',
    width: 1640,
    height: 856,
    accent: '#2563eb',
    json: canvasJSON(1640, 856, '#2563eb', [
      { type: 'rect', left: 0, top: 0, width: 1640, height: 856, fill: '#2563eb' },
      { type: 'rect', left: 0, top: 0, width: 600, height: 856, fill: '#1d4ed8' },
      { type: 'textbox', text: 'YOUR\nBRAND', left: 80, top: 250, width: 450, fontSize: 96, fontWeight: '800', fontFamily: 'Inter', fill: '#ffffff', textAlign: 'left', lineHeight: 1.05 },
      { type: 'textbox', text: 'Creating amazing experiences', left: 80, top: 540, width: 450, fontSize: 24, fontWeight: '400', fontFamily: 'Inter', fill: 'rgba(255,255,255,0.7)', textAlign: 'left' },
      { type: 'circle', left: 900, top: 200, radius: 220, fill: 'rgba(255,255,255,0.08)' },
      { type: 'circle', left: 1100, top: 400, radius: 160, fill: 'rgba(255,255,255,0.05)' },
    ]),
  },

  // ─── Presentations ────────────────────────────────────────────
  {
    id: 'pres-title',
    name: 'Title Slide',
    category: 'presentation',
    width: 1920,
    height: 1080,
    accent: '#0f172a',
    json: canvasJSON(1920, 1080, '#ffffff', [
      { type: 'rect', left: 0, top: 0, width: 1920, height: 1080, fill: '#ffffff' },
      { type: 'rect', left: 0, top: 0, width: 12, height: 1080, fill: '#6366f1' },
      { type: 'textbox', text: 'Presentation\nTitle Here', left: 120, top: 280, width: 1000, fontSize: 80, fontWeight: '700', fontFamily: 'Inter', fill: '#0f172a', textAlign: 'left', lineHeight: 1.15 },
      { type: 'textbox', text: 'Subtitle or supporting text for your presentation', left: 120, top: 560, width: 800, fontSize: 28, fontWeight: '400', fontFamily: 'Inter', fill: '#64748b', textAlign: 'left' },
      { type: 'rect', left: 120, top: 680, width: 80, height: 4, fill: '#6366f1', rx: 2, ry: 2 },
      { type: 'textbox', text: 'COMPANY NAME  ·  2026', left: 120, top: 940, width: 600, fontSize: 16, fontWeight: '500', fontFamily: 'Inter', fill: '#94a3b8', textAlign: 'left' },
    ]),
  },
  {
    id: 'pres-dark',
    name: 'Dark Slide',
    category: 'presentation',
    width: 1920,
    height: 1080,
    accent: '#a855f7',
    json: canvasJSON(1920, 1080, '#0f0a1a', [
      { type: 'rect', left: 0, top: 0, width: 1920, height: 1080, fill: '#0f0a1a' },
      { type: 'circle', left: 1400, top: -200, radius: 500, fill: '#a855f7', opacity: 0.1 },
      { type: 'circle', left: -100, top: 700, radius: 300, fill: '#6366f1', opacity: 0.08 },
      { type: 'textbox', text: 'Key Insight', left: 160, top: 200, width: 400, fontSize: 20, fontWeight: '600', fontFamily: 'Inter', fill: '#a855f7', textAlign: 'left' },
      { type: 'textbox', text: 'Big idea goes here\nwith a powerful\nstatement.', left: 160, top: 280, width: 1200, fontSize: 72, fontWeight: '700', fontFamily: 'Inter', fill: '#ffffff', textAlign: 'left', lineHeight: 1.2 },
      { type: 'rect', left: 160, top: 620, width: 100, height: 4, fill: '#a855f7', rx: 2, ry: 2 },
      { type: 'textbox', text: 'Add supporting details or data points that reinforce the message above.', left: 160, top: 670, width: 900, fontSize: 22, fontWeight: '400', fontFamily: 'Inter', fill: '#94a3b8', textAlign: 'left' },
    ]),
  },

  // ─── Marketing ────────────────────────────────────────────────
  {
    id: 'sale-banner',
    name: 'Sale Banner',
    category: 'marketing',
    width: 1080,
    height: 1080,
    accent: '#ef4444',
    json: canvasJSON(1080, 1080, '#ef4444', [
      { type: 'rect', left: 0, top: 0, width: 1080, height: 1080, fill: '#ef4444' },
      { type: 'rect', left: 40, top: 40, width: 1000, height: 1000, fill: 'transparent', stroke: '#ffffff', strokeWidth: 3, rx: 0, ry: 0 },
      { type: 'textbox', text: 'SALE', left: 100, top: 200, width: 880, fontSize: 180, fontWeight: '900', fontFamily: 'Inter', fill: '#ffffff', textAlign: 'center' },
      { type: 'textbox', text: 'UP TO', left: 100, top: 430, width: 880, fontSize: 32, fontWeight: '500', fontFamily: 'Inter', fill: 'rgba(255,255,255,0.7)', textAlign: 'center' },
      { type: 'textbox', text: '50% OFF', left: 100, top: 480, width: 880, fontSize: 120, fontWeight: '800', fontFamily: 'Inter', fill: '#ffffff', textAlign: 'center' },
      { type: 'textbox', text: 'Limited time offer · Shop now', left: 100, top: 700, width: 880, fontSize: 24, fontWeight: '400', fontFamily: 'Inter', fill: 'rgba(255,255,255,0.8)', textAlign: 'center' },
      { type: 'rect', left: 340, top: 800, width: 400, height: 60, fill: '#ffffff', rx: 30, ry: 30 },
      { type: 'textbox', text: 'SHOP NOW', left: 340, top: 812, width: 400, fontSize: 24, fontWeight: '700', fontFamily: 'Inter', fill: '#ef4444', textAlign: 'center' },
    ]),
  },
  {
    id: 'product-launch',
    name: 'Product Launch',
    category: 'marketing',
    width: 1080,
    height: 1080,
    accent: '#0ea5e9',
    json: canvasJSON(1080, 1080, '#0ea5e9', [
      { type: 'rect', left: 0, top: 0, width: 1080, height: 1080, fill: '#0ea5e9' },
      { type: 'circle', left: 340, top: 180, radius: 200, fill: 'rgba(255,255,255,0.15)' },
      { type: 'textbox', text: 'NEW', left: 100, top: 100, width: 200, fontSize: 18, fontWeight: '700', fontFamily: 'Inter', fill: '#ffffff', textAlign: 'left' },
      { type: 'rect', left: 100, top: 130, width: 50, height: 3, fill: '#ffffff' },
      { type: 'textbox', text: 'Introducing\nSomething\nAmazing', left: 100, top: 500, width: 880, fontSize: 72, fontWeight: '700', fontFamily: 'Inter', fill: '#ffffff', textAlign: 'left', lineHeight: 1.15 },
      { type: 'textbox', text: 'A brief description of your new product or service.\nAvailable starting today.', left: 100, top: 800, width: 700, fontSize: 22, fontWeight: '400', fontFamily: 'Inter', fill: 'rgba(255,255,255,0.8)', textAlign: 'left', lineHeight: 1.5 },
    ]),
  },

  // ─── Cards ────────────────────────────────────────────────────
  {
    id: 'thank-you',
    name: 'Thank You',
    category: 'card',
    width: 1080,
    height: 1080,
    accent: '#10b981',
    json: canvasJSON(1080, 1080, '#f0fdf4', [
      { type: 'rect', left: 0, top: 0, width: 1080, height: 1080, fill: '#f0fdf4' },
      { type: 'circle', left: -100, top: -100, radius: 300, fill: '#10b981', opacity: 0.08 },
      { type: 'circle', left: 800, top: 700, radius: 250, fill: '#10b981', opacity: 0.06 },
      { type: 'textbox', text: 'Thank\nYou!', left: 100, top: 280, width: 880, fontSize: 120, fontWeight: '800', fontFamily: 'Inter', fill: '#10b981', textAlign: 'center', lineHeight: 1.05 },
      { type: 'textbox', text: 'We appreciate your support and trust.\nYour generosity means the world to us.', left: 140, top: 620, width: 800, fontSize: 26, fontWeight: '400', fontFamily: 'Inter', fill: '#374151', textAlign: 'center', lineHeight: 1.6 },
      { type: 'rect', left: 490, top: 580, width: 100, height: 4, fill: '#10b981', rx: 2, ry: 2 },
    ]),
  },
  {
    id: 'event-invite',
    name: 'Event Invite',
    category: 'card',
    width: 1080,
    height: 1080,
    accent: '#f59e0b',
    json: canvasJSON(1080, 1080, '#fffbeb', [
      { type: 'rect', left: 0, top: 0, width: 1080, height: 1080, fill: '#fffbeb' },
      { type: 'rect', left: 60, top: 60, width: 960, height: 960, fill: 'transparent', stroke: '#f59e0b', strokeWidth: 2 },
      { type: 'textbox', text: "YOU'RE INVITED", left: 100, top: 140, width: 880, fontSize: 20, fontWeight: '700', fontFamily: 'Inter', fill: '#f59e0b', textAlign: 'center', charSpacing: 400 },
      { type: 'textbox', text: 'Annual\nGala Night', left: 100, top: 280, width: 880, fontSize: 80, fontWeight: '700', fontFamily: 'Georgia', fill: '#1a1a1a', textAlign: 'center', lineHeight: 1.15 },
      { type: 'rect', left: 440, top: 540, width: 200, height: 3, fill: '#f59e0b' },
      { type: 'textbox', text: 'Saturday, June 15th, 2026\n7:00 PM — Grand Ballroom\n123 Elegant Ave, City', left: 140, top: 600, width: 800, fontSize: 24, fontWeight: '400', fontFamily: 'Inter', fill: '#374151', textAlign: 'center', lineHeight: 1.8 },
      { type: 'textbox', text: 'RSVP by June 1st', left: 140, top: 830, width: 800, fontSize: 18, fontWeight: '600', fontFamily: 'Inter', fill: '#f59e0b', textAlign: 'center' },
    ]),
  },
  {
    id: 'yt-thumbnail',
    name: 'YouTube Thumb',
    category: 'social',
    width: 1280,
    height: 720,
    accent: '#dc2626',
    json: canvasJSON(1280, 720, '#1a1a1a', [
      { type: 'rect', left: 0, top: 0, width: 1280, height: 720, fill: '#1a1a1a' },
      { type: 'rect', left: 0, top: 0, width: 1280, height: 720, fill: '#dc2626', opacity: 0.15 },
      { type: 'textbox', text: 'VIDEO\nTITLE', left: 60, top: 180, width: 700, fontSize: 100, fontWeight: '900', fontFamily: 'Inter', fill: '#ffffff', textAlign: 'left', lineHeight: 1.05 },
      { type: 'textbox', text: 'GOES HERE', left: 60, top: 440, width: 700, fontSize: 60, fontWeight: '900', fontFamily: 'Inter', fill: '#dc2626', textAlign: 'left' },
      { type: 'circle', left: 900, top: 200, radius: 180, fill: '#dc2626', opacity: 0.3 },
      { type: 'polygon', points: [{ x: 960, y: 340 }, { x: 960, y: 440 }, { x: 1040, y: 390 }], fill: '#ffffff' },
    ]),
  },
];
