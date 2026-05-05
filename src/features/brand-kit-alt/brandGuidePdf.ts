/**
 * Brand Guide PDF generator — multi-page jsPDF builder.
 *
 * Self-contained. Reads the Brand object and produces a 4-page PDF
 * (Cover · Logo · Color & Type · Voice). Uses jsPDF directly (already in
 * deps via LogoFilesModule).
 *
 * Does NOT touch the off-limits export/vectorize/* or EditorWorkspace.
 */
import type { Brand } from '@/shared/types/brand';
import { logoUrl } from '@/shared/brand/logoUrl';
import { hexToCmyk, formatCmyk, formatRgb, hexToRgb } from './cmykApprox';

const PAGE_W = 210; // A4 mm
const PAGE_H = 297;
const MARGIN = 16;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function imageToPng(img: HTMLImageElement, maxPx = 2000): string {
  const ratio = img.width / img.height;
  let w: number, h: number;
  if (ratio >= 1) {
    w = Math.min(maxPx, img.width);
    h = w / ratio;
  } else {
    h = Math.min(maxPx, img.height);
    w = h * ratio;
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/png');
}

export async function generateBrandGuidePdf(brand: Brand): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  // Footer helper
  const drawFooter = (pageLabel: string) => {
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(`${brand.name} · Brand Guide`, MARGIN, PAGE_H - 8);
    pdf.text(pageLabel, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' });
  };

  // ─── PAGE 1 — COVER ────────────────────────────────────────────
  const primaryRgb = hexToRgb(brand.primaryColor || '#7c3aed');
  pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  pdf.rect(0, 0, PAGE_W, 110, 'F');

  // Logo on cover — placed on a white plate so it always reads against
  // any brand-color background.
  if (logoUrl(brand)) {
    try {
      const img = await loadImage(logoUrl(brand) ?? '');
      const pngData = imageToPng(img, 1500);
      const ratio = img.width / img.height;
      const logoW = 70;
      const logoH = logoW / ratio;
      const plateW = logoW + 20;
      const plateH = logoH + 20;
      const plateX = (PAGE_W - plateW) / 2;
      const plateY = 30;
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(plateX, plateY, plateW, plateH, 4, 4, 'F');
      pdf.addImage(pngData, 'PNG', plateX + 10, plateY + 10, logoW, logoH);
    } catch {
      // Logo failed to load — fall through
    }
  }

  // Brand name
  pdf.setFontSize(36);
  pdf.setTextColor(255);
  pdf.setFont('helvetica', 'bold');
  pdf.text(brand.name, PAGE_W / 2, 130, { align: 'center' });

  // Tagline / tone
  if (brand.tone) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60);
    pdf.text(brand.tone, PAGE_W / 2, 142, { align: 'center' });
  }

  // Generated stamp
  pdf.setFontSize(9);
  pdf.setTextColor(140);
  pdf.text(
    `Brand Guide · Generated ${new Date().toLocaleDateString()}`,
    PAGE_W / 2,
    PAGE_H - 25,
    { align: 'center' },
  );
  drawFooter('Page 1 / 4');

  // ─── PAGE 2 — LOGO ─────────────────────────────────────────────
  pdf.addPage();
  pdf.setTextColor(0);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SECTION ONE', MARGIN, MARGIN + 4);
  pdf.setFontSize(28);
  pdf.text('Logo', MARGIN, MARGIN + 16);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80);
  pdf.text(
    'The logo is the most recognizable element of the brand. Use it consistently and protect its clear space.',
    MARGIN,
    MARGIN + 24,
    { maxWidth: PAGE_W - MARGIN * 2 },
  );

  // Primary logo on background
  if (logoUrl(brand)) {
    try {
      const img = await loadImage(logoUrl(brand) ?? '');
      const pngData = imageToPng(img, 1500);
      const ratio = img.width / img.height;
      pdf.setFillColor(250, 250, 250);
      pdf.rect(MARGIN, 50, PAGE_W - MARGIN * 2, 90, 'F');
      const boxW = PAGE_W - MARGIN * 2 - 24;
      let logoW = boxW * 0.7;
      let logoH = logoW / ratio;
      if (logoH > 70) {
        logoH = 70;
        logoW = logoH * ratio;
      }
      const lx = (PAGE_W - logoW) / 2;
      const ly = 50 + (90 - logoH) / 2;
      pdf.addImage(pngData, 'PNG', lx, ly, logoW, logoH);
    } catch {
      /* skip */
    }
  }

  // Logo rules
  let y = 155;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0);
  pdf.text('Clear space', MARGIN, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80);
  pdf.text('Maintain at least 1× the cap height of the logomark on all sides.', MARGIN, y + 5, {
    maxWidth: PAGE_W - MARGIN * 2,
  });

  y += 18;
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0);
  pdf.text('Minimum size', MARGIN, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80);
  pdf.text('Print: 18mm wide. Screen: 80px wide.', MARGIN, y + 5);

  y += 18;
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0);
  pdf.text('Don\'t', MARGIN, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80);
  pdf.text('Stretch, recolor, rotate, or place on busy photographic backgrounds.', MARGIN, y + 5, {
    maxWidth: PAGE_W - MARGIN * 2,
  });

  drawFooter('Page 2 / 4');

  // ─── PAGE 3 — COLOR & TYPE ─────────────────────────────────────
  pdf.addPage();
  pdf.setTextColor(0);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SECTION TWO', MARGIN, MARGIN + 4);
  pdf.setFontSize(28);
  pdf.text('Color & Type', MARGIN, MARGIN + 16);

  // Color swatches
  const swatches = [
    { name: 'Primary', hex: brand.primaryColor || '#7c3aed' },
    brand.secondaryColor && { name: 'Secondary', hex: brand.secondaryColor },
    { name: 'Ink', hex: '#0a0a0f' },
    { name: 'Paper', hex: '#fafafa' },
  ].filter(Boolean) as Array<{ name: string; hex: string }>;

  const swatchTop = 50;
  const swatchH = 32;
  const swatchW = (PAGE_W - MARGIN * 2 - (swatches.length - 1) * 4) / swatches.length;

  swatches.forEach((s, i) => {
    const x = MARGIN + i * (swatchW + 4);
    const rgb = hexToRgb(s.hex);
    pdf.setFillColor(rgb.r, rgb.g, rgb.b);
    pdf.rect(x, swatchTop, swatchW, swatchH, 'F');

    // Stroke for very light swatches
    if (rgb.r > 240 && rgb.g > 240 && rgb.b > 240) {
      pdf.setDrawColor(220);
      pdf.rect(x, swatchTop, swatchW, swatchH, 'S');
    }

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0);
    pdf.text(s.name, x, swatchTop + swatchH + 6);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120);
    pdf.text(s.hex.toUpperCase(), x, swatchTop + swatchH + 11);
    pdf.text(formatRgb(s.hex), x, swatchTop + swatchH + 15);
    pdf.text(formatCmyk(hexToCmyk(s.hex)), x, swatchTop + swatchH + 19);
  });

  // Typography
  let typeY = 130;
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0);
  pdf.text('Typography', MARGIN, typeY);
  typeY += 8;

  if (brand.fonts?.primary) {
    pdf.setFontSize(9);
    pdf.setTextColor(120);
    pdf.text('PRIMARY', MARGIN, typeY);
    pdf.setFontSize(28);
    pdf.setTextColor(0);
    pdf.setFont('helvetica', 'bold');
    pdf.text(brand.fonts.primary, MARGIN, typeY + 12);
    typeY += 22;
  }

  if (brand.fonts?.secondary) {
    pdf.setFontSize(9);
    pdf.setTextColor(120);
    pdf.setFont('helvetica', 'normal');
    pdf.text('SECONDARY', MARGIN, typeY);
    pdf.setFontSize(20);
    pdf.setTextColor(0);
    pdf.text(brand.fonts.secondary, MARGIN, typeY + 9);
    typeY += 18;
  }

  // Type scale specimen
  typeY += 6;
  pdf.setFontSize(9);
  pdf.setTextColor(120);
  pdf.setFont('helvetica', 'normal');
  pdf.text('TYPE SCALE', MARGIN, typeY);
  typeY += 6;

  pdf.setTextColor(0);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.text('H1 — Headline', MARGIN, typeY);
  typeY += 9;
  pdf.setFontSize(18);
  pdf.text('H2 — Section title', MARGIN, typeY);
  typeY += 7;
  pdf.setFontSize(13);
  pdf.text('H3 — Sub-section', MARGIN, typeY);
  typeY += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Body — The quick brown fox jumps over the lazy dog.', MARGIN, typeY);

  drawFooter('Page 3 / 4');

  // ─── PAGE 4 — VOICE & STRATEGY ─────────────────────────────────
  pdf.addPage();
  pdf.setTextColor(0);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SECTION THREE', MARGIN, MARGIN + 4);
  pdf.setFontSize(28);
  pdf.text('Voice & Strategy', MARGIN, MARGIN + 16);

  let vy = 50;
  const writeBlock = (label: string, body: string) => {
    pdf.setFontSize(9);
    pdf.setTextColor(120);
    pdf.setFont('helvetica', 'bold');
    pdf.text(label.toUpperCase(), MARGIN, vy);
    vy += 5;
    pdf.setFontSize(11);
    pdf.setTextColor(0);
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(body || '—', PAGE_W - MARGIN * 2);
    pdf.text(lines, MARGIN, vy);
    vy += lines.length * 5.5 + 8;
  };

  writeBlock('Tone', brand.tone || '');
  writeBlock('Audience', brand.audience || '');
  if (brand.guidelines?.strategy?.mission) {
    writeBlock('Mission', brand.guidelines.strategy.mission);
  }
  if (brand.guidelines?.strategy?.vision) {
    writeBlock('Vision', brand.guidelines.strategy.vision);
  }
  if (brand.guidelines?.strategy?.positioning) {
    writeBlock('Positioning', brand.guidelines.strategy.positioning);
  }
  if (brand.guidelines?.strategy?.values?.length) {
    writeBlock('Values', brand.guidelines.strategy.values.join(' · '));
  }

  drawFooter('Page 4 / 4');

  // Output
  return pdf.output('blob');
}
