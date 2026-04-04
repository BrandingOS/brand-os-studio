/**
 * Vector PDF Builder — Produces REAL editable PDFs with selectable text and vector shapes.
 *
 * Each function takes brand data + template content and constructs the PDF
 * programmatically using jsPDF — NO raster images, NO html2canvas.
 *
 * Text is real text (selectable, searchable).
 * Shapes are real vector shapes (scalable infinitely).
 * Colors are precise (no color shift from rasterization).
 */
import type { Brand } from '@/shared/types/brand';

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  return [parseInt(c.substring(0, 2), 16), parseInt(c.substring(2, 4), 16), parseInt(c.substring(4, 6), 16)];
}

function contrastColor(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.5 ? [0, 0, 0] : [255, 255, 255];
}

interface CardData {
  name: string;
  title: string;
  email: string;
  phone: string;
  website: string;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  clientName: string;
  items: Array<{ description: string; amount: string }>;
  total: string;
  paymentTerms: string;
}

// ─── Business Card PDF ────────────────────────────────────────────────

export function buildBusinessCardPDF(
  brand: Brand,
  data: CardData,
  templateIndex = 0,
): (doc: any) => Promise<void> {
  return async (doc: any) => {
    const p = brand.primaryColor || '#333333';
    const [pr, pg, pb] = hexToRgb(p);
    const [cr, cg, cb] = contrastColor(p);

    // Page size: 3.5 x 2 inches
    // jsPDF was created externally with unit:'mm', we'll use mm
    const w = 88.9; // 3.5 inches
    const h = 50.8; // 2 inches

    // Resize first page
    // Since we can't resize, we set format in ExportOptions.pageFormat = [88.9, 50.8]

    // --- FRONT SIDE ---

    // White background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, w, h, 'F');

    // Top accent bar
    doc.setFillColor(pr, pg, pb);
    doc.rect(0, 0, w, 3, 'F');

    // Brand name
    doc.setFontSize(14);
    doc.setTextColor(33, 33, 33);
    doc.setFont('helvetica', 'bold');
    doc.text(brand.name, 7, 14);

    // Person name
    doc.setFontSize(11);
    doc.setTextColor(33, 33, 33);
    doc.setFont('helvetica', 'bold');
    doc.text(data.name, 7, 24);

    // Title
    doc.setFontSize(8);
    doc.setTextColor(pr, pg, pb);
    doc.setFont('helvetica', 'normal');
    doc.text(data.title, 7, 29);

    // Contact info
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(data.phone, 7, 37);
    doc.text(data.email, 7, 41);
    doc.text(data.website, 7, 45);

    // Bottom accent bar
    doc.setFillColor(pr, pg, pb);
    doc.rect(0, h - 3, w, 3, 'F');

    // Color dots (decorative)
    doc.setFillColor(pr, pg, pb);
    doc.circle(w - 10, h - 8, 2, 'F');
    if (brand.secondaryColor) {
      const [sr, sg, sb] = hexToRgb(brand.secondaryColor);
      doc.setFillColor(sr, sg, sb);
      doc.circle(w - 16, h - 8, 2, 'F');
    }

    // --- BACK SIDE ---
    doc.addPage([w, h], 'landscape');

    // Full brand color background
    doc.setFillColor(pr, pg, pb);
    doc.rect(0, 0, w, h, 'F');

    // Brand name centered
    doc.setFontSize(16);
    doc.setTextColor(cr, cg, cb);
    doc.setFont('helvetica', 'bold');
    doc.text(brand.name, w / 2, h / 2 - 2, { align: 'center' });

    // Website below
    doc.setFontSize(7);
    doc.setTextColor(cr, cg, cb);
    doc.setFont('helvetica', 'normal');
    doc.text(data.website, w / 2, h / 2 + 5, { align: 'center' });
  };
}

// ─── Invoice PDF ──────────────────────────────────────────────────────

export function buildInvoicePDF(
  brand: Brand,
  data: InvoiceData,
): (doc: any) => Promise<void> {
  return async (doc: any) => {
    const p = brand.primaryColor || '#333333';
    const [pr, pg, pb] = hexToRgb(p);
    const w = 210; // A4 width mm
    const h = 297; // A4 height mm

    // Top accent bar
    doc.setFillColor(pr, pg, pb);
    doc.rect(0, 0, w, 6, 'F');

    // Brand name
    doc.setFontSize(18);
    doc.setTextColor(33, 33, 33);
    doc.setFont('helvetica', 'bold');
    doc.text(brand.name, 20, 22);

    // INVOICE label
    doc.setFontSize(24);
    doc.setTextColor(pr, pg, pb);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', w - 20, 22, { align: 'right' });

    // Invoice details
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice: ${data.invoiceNumber}`, w - 20, 30, { align: 'right' });
    doc.text(`Date: ${data.date}`, w - 20, 35, { align: 'right' });

    // Bill to
    doc.setFontSize(9);
    doc.setTextColor(33, 33, 33);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 20, 45);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(data.clientName, 20, 51);

    // Divider
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(20, 60, w - 20, 60);

    // Table header
    doc.setFillColor(245, 245, 245);
    doc.rect(20, 65, w - 40, 8, 'F');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'bold');
    doc.text('Description', 24, 70);
    doc.text('Amount', w - 24, 70, { align: 'right' });

    // Line items
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    let y = 80;
    for (const item of data.items) {
      doc.text(item.description, 24, y);
      doc.text(item.amount, w - 24, y, { align: 'right' });
      y += 8;
    }

    // Total divider
    doc.setDrawColor(200, 200, 200);
    doc.line(w / 2, y + 2, w - 20, y + 2);

    // Total
    doc.setFontSize(11);
    doc.setTextColor(33, 33, 33);
    doc.setFont('helvetica', 'bold');
    doc.text('Total', w / 2 + 10, y + 12);
    doc.text(data.total, w - 24, y + 12, { align: 'right' });

    // Payment terms
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text(data.paymentTerms, 20, h - 15);

    // Bottom accent
    doc.setFillColor(pr, pg, pb);
    doc.rect(0, h - 4, w, 4, 'F');
  };
}

// ─── Social Media Post PDF ────────────────────────────────────────────

export function buildSocialPostPDF(
  brand: Brand,
  data: { headline?: string; body?: string; cta?: string },
  size: { width: number; height: number } = { width: 1080, height: 1080 },
): (doc: any) => Promise<void> {
  return async (doc: any) => {
    const p = brand.primaryColor || '#333333';
    const [pr, pg, pb] = hexToRgb(p);
    const [cr, cg, cb] = contrastColor(p);

    // Use point-based dimensions, scale down from pixels
    const scale = 0.2; // 1080px → ~216mm
    const w = size.width * scale;
    const h = size.height * scale;

    // Background
    doc.setFillColor(pr, pg, pb);
    doc.rect(0, 0, w, h, 'F');

    // Headline
    if (data.headline) {
      doc.setFontSize(24);
      doc.setTextColor(cr, cg, cb);
      doc.setFont('helvetica', 'bold');
      const lines = doc.splitTextToSize(data.headline, w - 40);
      doc.text(lines, 20, h * 0.35);
    }

    // Body
    if (data.body) {
      doc.setFontSize(12);
      doc.setTextColor(cr, cg, cb);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(data.body, w - 40);
      doc.text(lines, 20, h * 0.55);
    }

    // CTA button
    if (data.cta) {
      const btnW = 50;
      const btnH = 10;
      const btnX = 20;
      const btnY = h * 0.75;
      doc.setFillColor(cr, cg, cb);
      doc.roundedRect(btnX, btnY, btnW, btnH, 5, 5, 'F');
      doc.setFontSize(9);
      doc.setTextColor(pr, pg, pb);
      doc.text(data.cta, btnX + btnW / 2, btnY + 7, { align: 'center' });
    }

    // Brand name at bottom
    doc.setFontSize(8);
    doc.setTextColor(cr, cg, cb);
    doc.setFont('helvetica', 'bold');
    doc.text(brand.name, 20, h - 10);
  };
}

// ─── Presentation Slide PDF ───────────────────────────────────────────

export function buildPresentationPDF(
  brand: Brand,
  slides: Array<{ title: string; subtitle?: string; body?: string; type?: string }>,
): (doc: any) => Promise<void> {
  return async (doc: any) => {
    const p = brand.primaryColor || '#333333';
    const [pr, pg, pb] = hexToRgb(p);
    const [cr, cg, cb] = contrastColor(p);
    const w = 338.67; // 16:9 in mm (~13.33 inches)
    const h = 190.5;  // ~7.5 inches

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      if (i > 0) doc.addPage([w, h], 'landscape');

      if (slide.type === 'cover' || i === 0) {
        // Cover slide — full brand color
        doc.setFillColor(pr, pg, pb);
        doc.rect(0, 0, w, h, 'F');

        doc.setFontSize(36);
        doc.setTextColor(cr, cg, cb);
        doc.setFont('helvetica', 'bold');
        doc.text(slide.title, w / 2, h * 0.4, { align: 'center' });

        if (slide.subtitle) {
          doc.setFontSize(16);
          doc.setFont('helvetica', 'normal');
          doc.text(slide.subtitle, w / 2, h * 0.5, { align: 'center' });
        }

        // Brand name at bottom
        doc.setFontSize(10);
        doc.text(brand.name, w / 2, h - 15, { align: 'center' });
      } else {
        // Content slide — white bg
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, w, h, 'F');

        // Top accent bar
        doc.setFillColor(pr, pg, pb);
        doc.rect(0, 0, w, 4, 'F');

        // Title
        doc.setFontSize(24);
        doc.setTextColor(33, 33, 33);
        doc.setFont('helvetica', 'bold');
        doc.text(slide.title, 25, 30);

        // Subtitle
        if (slide.subtitle) {
          doc.setFontSize(12);
          doc.setTextColor(100, 100, 100);
          doc.setFont('helvetica', 'normal');
          doc.text(slide.subtitle, 25, 40);
        }

        // Body
        if (slide.body) {
          doc.setFontSize(11);
          doc.setTextColor(60, 60, 60);
          doc.setFont('helvetica', 'normal');
          const lines = doc.splitTextToSize(slide.body, w - 50);
          doc.text(lines, 25, 55);
        }

        // Footer
        doc.setFontSize(7);
        doc.setTextColor(180, 180, 180);
        doc.text(brand.name, 25, h - 8);
        doc.text(`${i + 1}`, w - 25, h - 8, { align: 'right' });
      }
    }
  };
}

export { hexToRgb as _hexToRgb };
export type { CardData, InvoiceData };
