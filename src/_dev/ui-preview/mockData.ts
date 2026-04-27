// Mock data for the Step 5 UI direction mockups.
//
// NOT validated against the real Zod schemas — these are visual
// fixtures for static mockups only. Three variants under
// /_dev/ui-preview/step-5-variant-{1,2,3} import from here so they
// share a consistent canvas + brand identity for direct comparison.

const SELFIX_LOGO_DATA_URL =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' rx='14' fill='%231a1a2e'/><text x='50' y='66' font-family='Georgia,serif' font-style='italic' font-size='48' font-weight='400' fill='white' text-anchor='middle'>s</text></svg>";

const RAQM_LOGO_DATA_URL =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' rx='14' fill='%233366ff'/><text x='50' y='66' font-family='Inter,sans-serif' font-size='44' font-weight='700' fill='white' text-anchor='middle'>R</text></svg>";

const MERIDIAN_LOGO_DATA_URL =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' rx='14' fill='%2322c55e'/><text x='50' y='64' font-family='Inter,sans-serif' font-size='38' font-weight='600' fill='white' text-anchor='middle'>M</text></svg>";

export interface MockBrand {
  id: string;
  name: string;
  slug: string;
  logoDataUrl: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    neutral: string;
  };
  fonts: { heading: string; body: string };
}

export const mockBrand: MockBrand = {
  id: 'mock-selfix',
  name: 'selfix',
  slug: 'selfix',
  logoDataUrl: SELFIX_LOGO_DATA_URL,
  colors: {
    primary: '#1a1a2e',
    secondary: '#16a34a',
    accent: '#f59e0b',
    neutral: '#737373',
  },
  fonts: { heading: 'DM Sans', body: 'Roboto' },
};

export const mockBrandList: MockBrand[] = [
  mockBrand,
  {
    id: 'raqm',
    name: 'Raqm',
    slug: 'raqm',
    logoDataUrl: RAQM_LOGO_DATA_URL,
    colors: {
      primary: '#3366ff',
      secondary: '#1a1a2e',
      accent: '#f59e0b',
      neutral: '#737373',
    },
    fonts: { heading: 'Inter', body: 'Inter' },
  },
  {
    id: 'meridian',
    name: 'Meridian',
    slug: 'meridian',
    logoDataUrl: MERIDIAN_LOGO_DATA_URL,
    colors: {
      primary: '#22c55e',
      secondary: '#1a1a2e',
      accent: '#f59e0b',
      neutral: '#737373',
    },
    fonts: { heading: 'Helvetica', body: 'Helvetica' },
  },
];

/**
 * Mock document — coordinates are in display space (540×540) for the
 * mockup's scaled canvas. Real engine would store 1080×1080 and the
 * adapter would scale; here we skip the conversion.
 */
export interface MockLayer {
  id: string;
  name: string;
  kind: 'text' | 'shape' | 'logo';
  x: number;
  y: number;
  width: number;
  height: number;
  // Text-specific
  content?: string;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  /** Either a hex literal or a brand-slot indicator like 'brand:primary'. */
  color?: string;
  // Shape-specific
  fill?: string;
  cornerRadius?: number;
  // Display state
  brandManaged?: boolean;
}

export const mockDocument = {
  id: 'mock-doc-1',
  contentType: 'social-post' as const,
  brandId: 'mock-selfix',
  page: {
    id: 'p1',
    name: 'Square 1080',
    /** Display dimensions for the mockup. Real canvas would be 1080×1080. */
    displayWidth: 540,
    displayHeight: 540,
    background: '#fafaf9',
    layers: [
      {
        id: 'logo-1',
        name: 'Brand logo',
        kind: 'logo',
        x: 36,
        y: 36,
        width: 56,
        height: 56,
        brandManaged: true,
      },
      {
        id: 'shape-bg',
        name: 'Accent disc',
        kind: 'shape',
        x: 320,
        y: -80,
        width: 320,
        height: 320,
        fill: 'brand:primary',
        cornerRadius: 999,
      },
      {
        id: 'headline',
        name: 'Headline',
        kind: 'text',
        x: 36,
        y: 200,
        width: 460,
        height: 130,
        content: 'Launch your\nproduct in minutes',
        fontSize: 36,
        fontWeight: 700,
        fontFamily: 'DM Sans',
        color: 'brand:primary',
        brandManaged: true,
      },
      {
        id: 'shape-cta',
        name: 'CTA button',
        kind: 'shape',
        x: 36,
        y: 440,
        width: 150,
        height: 44,
        fill: 'brand:secondary',
        cornerRadius: 22,
      },
      {
        id: 'cta',
        name: 'CTA text',
        kind: 'text',
        x: 36,
        y: 440,
        width: 150,
        height: 44,
        content: 'Try it free →',
        fontSize: 14,
        fontWeight: 600,
        fontFamily: 'Roboto',
        color: '#ffffff',
      },
    ] satisfies MockLayer[],
  },
};

/** The headline layer is selected by default in every variant. */
export const SELECTED_LAYER_ID = 'headline';

/**
 * Resolve a 'brand:primary' / 'brand:secondary' style color reference
 * against a mock brand kit. Pure presentational — the real resolver
 * lives in the brand engine.
 */
export function resolveMockColor(value: string | undefined, brand: MockBrand): string {
  if (!value) return brand.colors.neutral;
  if (value.startsWith('brand:')) {
    const key = value.slice('brand:'.length) as keyof MockBrand['colors'];
    return brand.colors[key] ?? brand.colors.primary;
  }
  return value;
}
