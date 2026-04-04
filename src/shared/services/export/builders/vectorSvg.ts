/**
 * Vector SVG Builder — Produces REAL vector SVGs with <text>, <rect>, <line> elements.
 *
 * NO raster images. True scalable vector graphics.
 * Text is real text (selectable, editable in Illustrator/Inkscape).
 * Shapes are real vector paths.
 */
import type { Brand } from '@/shared/types/brand';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface CardData {
  name: string;
  title: string;
  email: string;
  phone: string;
  website: string;
}

// ─── Business Card SVG ────────────────────────────────────────────────

export function buildBusinessCardSVG(
  brand: Brand,
  data: CardData,
): string {
  const p = brand.primaryColor || '#333333';
  const s = brand.secondaryColor || '#00D4AA';
  const w = 1050; // 3.5" at 300dpi
  const h = 600;  // 2" at 300dpi

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;display=swap');
      text { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${w}" height="${h}" fill="#FFFFFF"/>

  <!-- Top accent bar -->
  <rect width="${w}" height="24" fill="${p}"/>

  <!-- Brand name -->
  <text x="60" y="110" font-size="42" font-weight="700" fill="#212121">${esc(brand.name)}</text>

  <!-- Person name -->
  <text x="60" y="195" font-size="32" font-weight="600" fill="#212121">${esc(data.name)}</text>

  <!-- Title -->
  <text x="60" y="230" font-size="22" font-weight="500" fill="${p}">${esc(data.title)}</text>

  <!-- Contact info -->
  <text x="60" y="340" font-size="20" fill="#666666">${esc(data.phone)}</text>
  <text x="60" y="375" font-size="20" fill="#666666">${esc(data.email)}</text>
  <text x="60" y="410" font-size="20" fill="#666666">${esc(data.website)}</text>

  <!-- Bottom accent bar -->
  <rect y="${h - 24}" width="${w}" height="24" fill="${p}"/>

  <!-- Decorative dots -->
  <circle cx="${w - 80}" cy="${h - 65}" r="16" fill="${s}" opacity="0.8"/>
  <circle cx="${w - 130}" cy="${h - 65}" r="16" fill="${p}" opacity="0.8"/>
</svg>`;
}

// ─── Invoice SVG ──────────────────────────────────────────────────────

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  clientName: string;
  items: Array<{ description: string; amount: string }>;
  total: string;
  paymentTerms: string;
}

export function buildInvoiceSVG(
  brand: Brand,
  data: InvoiceData,
): string {
  const p = brand.primaryColor || '#333333';
  const w = 794; // A4 at 96dpi
  const h = 1123;

  let itemsMarkup = '';
  let y = 360;
  for (const item of data.items) {
    itemsMarkup += `
    <text x="60" y="${y}" font-size="16" fill="#444444">${esc(item.description)}</text>
    <text x="${w - 60}" y="${y}" font-size="16" fill="#444444" text-anchor="end">${esc(item.amount)}</text>`;
    y += 35;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;display=swap');
      text { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${w}" height="${h}" fill="#FFFFFF"/>

  <!-- Top accent bar -->
  <rect width="${w}" height="20" fill="${p}"/>

  <!-- Brand name -->
  <text x="60" y="65" font-size="28" font-weight="700" fill="#212121">${esc(brand.name)}</text>

  <!-- INVOICE label -->
  <text x="${w - 60}" y="65" font-size="36" font-weight="700" fill="${p}" text-anchor="end">INVOICE</text>

  <!-- Invoice details -->
  <text x="${w - 60}" y="95" font-size="14" fill="#888888" text-anchor="end">${esc(data.invoiceNumber)}</text>
  <text x="${w - 60}" y="115" font-size="14" fill="#888888" text-anchor="end">${esc(data.date)}</text>

  <!-- Bill to -->
  <text x="60" y="155" font-size="13" font-weight="600" fill="#333333">Bill To:</text>
  <text x="60" y="175" font-size="16" fill="#555555">${esc(data.clientName)}</text>

  <!-- Divider -->
  <line x1="60" y1="210" x2="${w - 60}" y2="210" stroke="#E0E0E0" stroke-width="1"/>

  <!-- Table header -->
  <rect x="40" y="230" width="${w - 80}" height="35" fill="#F5F5F5" rx="4"/>
  <text x="60" y="253" font-size="13" font-weight="600" fill="#666666">Description</text>
  <text x="${w - 60}" y="253" font-size="13" font-weight="600" fill="#666666" text-anchor="end">Amount</text>

  <!-- Line items -->
  <g font-size="16">${itemsMarkup}
  </g>

  <!-- Total divider -->
  <line x1="${w / 2}" y1="${y + 10}" x2="${w - 60}" y2="${y + 10}" stroke="#CCCCCC" stroke-width="1"/>

  <!-- Total -->
  <text x="${w / 2 + 20}" y="${y + 45}" font-size="20" font-weight="700" fill="#212121">Total</text>
  <text x="${w - 60}" y="${y + 45}" font-size="20" font-weight="700" fill="#212121" text-anchor="end">${esc(data.total)}</text>

  <!-- Payment terms -->
  <text x="60" y="${h - 50}" font-size="11" fill="#AAAAAA">${esc(data.paymentTerms)}</text>

  <!-- Bottom accent -->
  <rect y="${h - 16}" width="${w}" height="16" fill="${p}"/>
</svg>`;
}

// ─── Social Media Post SVG ────────────────────────────────────────────

export function buildSocialPostSVG(
  brand: Brand,
  data: { headline?: string; body?: string; cta?: string },
  size = { width: 1080, height: 1080 },
): string {
  const p = brand.primaryColor || '#333333';
  const w = size.width;
  const h = size.height;

  // Determine contrast text color
  const c = p.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const textColor = lum > 0.5 ? '#111111' : '#FFFFFF';
  const btnBg = textColor;
  const btnText = p;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&amp;display=swap');
      text { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${w}" height="${h}" fill="${p}"/>

  <!-- Headline -->
  ${data.headline ? `<text x="80" y="${h * 0.35}" font-size="64" font-weight="800" fill="${textColor}">
    ${esc(data.headline).split(' ').reduce((acc, word, i) => {
      const lineLen = 20;
      const words = esc(data.headline!).split(' ');
      const lines: string[] = [];
      let line = '';
      for (const w of words) {
        if ((line + ' ' + w).length > lineLen) { lines.push(line.trim()); line = w; }
        else { line += ' ' + w; }
      }
      if (line) lines.push(line.trim());
      return lines.map((l, j) => `<tspan x="80" dy="${j === 0 ? 0 : 75}">${l}</tspan>`).join('');
    }, '')}
  </text>` : ''}

  <!-- Body -->
  ${data.body ? `<text x="80" y="${h * 0.6}" font-size="32" fill="${textColor}" opacity="0.85">
    <tspan x="80">${esc(data.body)}</tspan>
  </text>` : ''}

  <!-- CTA Button -->
  ${data.cta ? `
  <rect x="80" y="${h * 0.75}" width="280" height="70" rx="35" fill="${btnBg}"/>
  <text x="220" y="${h * 0.75 + 45}" font-size="24" font-weight="600" fill="${btnText}" text-anchor="middle">${esc(data.cta)}</text>
  ` : ''}

  <!-- Brand name -->
  <text x="80" y="${h - 60}" font-size="24" font-weight="700" fill="${textColor}">${esc(brand.name)}</text>
</svg>`;
}

// ─── Presentation Slide SVG ───────────────────────────────────────────

export function buildPresentationSlideSVG(
  brand: Brand,
  slide: { title: string; subtitle?: string; body?: string },
  isCover = false,
): string {
  const p = brand.primaryColor || '#333333';
  const w = 1920;
  const h = 1080;

  const c = p.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const textColor = lum > 0.5 ? '#111111' : '#FFFFFF';

  if (isCover) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&amp;display=swap');
      text { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; }
    </style>
  </defs>
  <rect width="${w}" height="${h}" fill="${p}"/>
  <text x="${w / 2}" y="${h * 0.4}" font-size="72" font-weight="700" fill="${textColor}" text-anchor="middle">${esc(slide.title)}</text>
  ${slide.subtitle ? `<text x="${w / 2}" y="${h * 0.5}" font-size="32" fill="${textColor}" text-anchor="middle" opacity="0.8">${esc(slide.subtitle)}</text>` : ''}
  <text x="${w / 2}" y="${h - 60}" font-size="20" fill="${textColor}" text-anchor="middle" opacity="0.6">${esc(brand.name)}</text>
</svg>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&amp;display=swap');
      text { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; }
    </style>
  </defs>
  <rect width="${w}" height="${h}" fill="#FFFFFF"/>
  <rect width="${w}" height="16" fill="${p}"/>
  <text x="80" y="100" font-size="48" font-weight="700" fill="#212121">${esc(slide.title)}</text>
  ${slide.subtitle ? `<text x="80" y="145" font-size="24" fill="#888888">${esc(slide.subtitle)}</text>` : ''}
  ${slide.body ? `<text x="80" y="200" font-size="22" fill="#444444"><tspan x="80">${esc(slide.body)}</tspan></text>` : ''}
  <text x="80" y="${h - 30}" font-size="14" fill="#CCCCCC">${esc(brand.name)}</text>
</svg>`;
}

export type { CardData as SvgCardData, InvoiceData as SvgInvoiceData };
