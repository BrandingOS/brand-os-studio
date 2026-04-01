import jsPDF from 'jspdf';
import JSZip from 'jszip';
import type { Brand } from '@/shared/types/brand';
import type { GuidelineSlide, GuidelineSettings } from '@/features/guidelines/types/guidelines';

/**
 * Converts a hex color string to RGB components.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

/**
 * Triggers a browser download for the given blob.
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Renders a page header with the brand name and an accent-colored bar.
 */
function renderPageHeader(
  doc: jsPDF,
  brandName: string,
  pageTitle: string,
  accentColor: { r: number; g: number; b: number },
  pageWidth: number
) {
  // Accent bar at the top
  doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Brand name (small, top-left)
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(brandName, 20, 16);

  // Page title
  doc.setFontSize(22);
  doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
  doc.text(pageTitle, 20, 32);

  // Divider line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(20, 36, pageWidth - 20, 36);
}

/**
 * Renders a page number footer.
 */
function renderPageFooter(
  doc: jsPDF,
  pageNumber: number,
  totalPages: number,
  pageWidth: number,
  pageHeight: number
) {
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text(
    `${pageNumber} / ${totalPages}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
}

/**
 * Renders the cover page.
 */
function renderCoverPage(
  doc: jsPDF,
  brand: Brand,
  slide: GuidelineSlide,
  accentColor: { r: number; g: number; b: number },
  pageWidth: number,
  pageHeight: number
) {
  // Large accent block at the top
  doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
  doc.rect(0, 0, pageWidth, 90, 'F');

  // Brand name on accent block
  doc.setFontSize(36);
  doc.setTextColor(255, 255, 255);
  doc.text(brand.name, pageWidth / 2, 50, { align: 'center' });

  // Tagline / subtitle
  const subtitle = slide.content?.subtitle || '';
  if (subtitle) {
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(subtitle, pageWidth / 2, 65, { align: 'center' });
  }

  // Description below the accent block
  const description = slide.content?.description || '';
  if (description) {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    const lines = doc.splitTextToSize(description, pageWidth - 80);
    doc.text(lines, pageWidth / 2, 115, { align: 'center' });
  }

  // Date
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Brand Guidelines  |  ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    pageWidth / 2,
    pageHeight - 20,
    { align: 'center' }
  );
}

/**
 * Renders the strategy slide content.
 */
function renderStrategySlide(doc: jsPDF, slide: GuidelineSlide, accentColor: { r: number; g: number; b: number }) {
  let y = 48;

  // Mission
  doc.setFontSize(12);
  doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
  doc.text('Mission', 20, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const missionLines = doc.splitTextToSize(slide.content?.mission || 'N/A', 170);
  doc.text(missionLines, 20, y);
  y += missionLines.length * 5 + 10;

  // Vision
  doc.setFontSize(12);
  doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
  doc.text('Vision', 20, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const visionLines = doc.splitTextToSize(slide.content?.vision || 'N/A', 170);
  doc.text(visionLines, 20, y);
  y += visionLines.length * 5 + 10;

  // Values
  doc.setFontSize(12);
  doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
  doc.text('Values', 20, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const values: string[] = slide.content?.values || [];
  values.forEach((value: string) => {
    doc.text(`  \u2022  ${value}`, 20, y);
    y += 6;
  });
}

/**
 * Renders the colors slide content with color swatches.
 */
function renderColorsSlide(doc: jsPDF, slide: GuidelineSlide, accentColor: { r: number; g: number; b: number }) {
  const colors = [
    { label: 'Primary', hex: slide.content?.primary || '#000000' },
    { label: 'Secondary', hex: slide.content?.secondary || '#666666' },
    { label: 'Accent', hex: slide.content?.accent || '#007bff' },
  ];

  let x = 20;
  const y = 52;
  const swatchWidth = 45;
  const swatchHeight = 30;

  colors.forEach((color) => {
    const rgb = hexToRgb(color.hex);

    // Swatch rectangle
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.roundedRect(x, y, swatchWidth, swatchHeight, 3, 3, 'F');

    // Label
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(color.label, x, y + swatchHeight + 8);

    // Hex value
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(color.hex.toUpperCase(), x, y + swatchHeight + 14);

    x += swatchWidth + 15;
  });
}

/**
 * Renders the typography slide content.
 */
function renderTypographySlide(doc: jsPDF, slide: GuidelineSlide, accentColor: { r: number; g: number; b: number }) {
  let y = 48;

  const fonts = [
    { label: 'Primary / Heading Font', name: slide.content?.primaryFont || slide.content?.headingFont || 'Inter' },
    { label: 'Secondary / Body Font', name: slide.content?.secondaryFont || slide.content?.bodyFont || 'Inter' },
  ];

  fonts.forEach((font) => {
    // Font role label
    doc.setFontSize(10);
    doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
    doc.text(font.label, 20, y);
    y += 7;

    // Font name
    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text(font.name, 20, y);
    y += 9;

    // Sample text
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('The quick brown fox jumps over the lazy dog.', 20, y);
    y += 6;
    doc.text('ABCDEFGHIJKLMNOPQRSTUVWXYZ  0123456789', 20, y);
    y += 14;
  });
}

/**
 * Renders the logos slide content.
 */
function renderLogosSlide(doc: jsPDF, slide: GuidelineSlide, accentColor: { r: number; g: number; b: number }) {
  let y = 48;

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const usageLines = doc.splitTextToSize(slide.content?.usageGuidelines || '', 170);
  doc.text(usageLines, 20, y);
  y += usageLines.length * 5 + 10;

  // Don'ts
  const donts: string[] = slide.content?.donts || [];
  if (donts.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
    doc.text('Usage Rules', 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    donts.forEach((item: string) => {
      doc.text(`  \u2717  ${item}`, 20, y);
      y += 6;
    });
  }
}

/**
 * Renders the voice & tone slide content.
 */
function renderVoiceSlide(doc: jsPDF, slide: GuidelineSlide, accentColor: { r: number; g: number; b: number }) {
  let y = 48;

  // Tone description
  doc.setFontSize(12);
  doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
  doc.text('Tone', 20, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const voiceLines = doc.splitTextToSize(slide.content?.voice || 'N/A', 170);
  doc.text(voiceLines, 20, y);
  y += voiceLines.length * 5 + 10;

  // Do's
  const dos: string[] = slide.content?.toneDos || [];
  if (dos.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
    doc.text("Do's", 20, y);
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    dos.forEach((item: string) => {
      doc.text(`  \u2713  ${item}`, 20, y);
      y += 6;
    });
    y += 6;
  }

  // Don'ts
  const donts: string[] = slide.content?.toneDonts || [];
  if (donts.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
    doc.text("Don'ts", 20, y);
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    donts.forEach((item: string) => {
      doc.text(`  \u2717  ${item}`, 20, y);
      y += 6;
    });
  }
}

/**
 * Builds a multi-page PDF of the brand guidelines and returns it as a Blob.
 * Also triggers a browser download.
 */
export async function exportAsPDF(
  brand: Brand,
  slides: GuidelineSlide[],
  settings: GuidelineSettings
): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const accentColor = hexToRgb(brand.primaryColor || '#000000');
  const enabledSlides = slides.filter((s) => s.enabled);
  const totalPages = enabledSlides.length;

  enabledSlides.forEach((slide, index) => {
    if (index > 0) {
      doc.addPage();
    }

    if (slide.type === 'cover') {
      renderCoverPage(doc, brand, slide, accentColor, pageWidth, pageHeight);
    } else {
      renderPageHeader(doc, brand.name, slide.title, accentColor, pageWidth);

      switch (slide.type) {
        case 'strategy':
          renderStrategySlide(doc, slide, accentColor);
          break;
        case 'logos':
          renderLogosSlide(doc, slide, accentColor);
          break;
        case 'colors':
          renderColorsSlide(doc, slide, accentColor);
          break;
        case 'typography':
          renderTypographySlide(doc, slide, accentColor);
          break;
        case 'voice':
          renderVoiceSlide(doc, slide, accentColor);
          break;
        default:
          // Generic fallback for any other slide types
          doc.setFontSize(10);
          doc.setTextColor(80, 80, 80);
          doc.text('Content for this section is not yet available.', 20, 48);
          break;
      }

      // Footer with page number
      if (settings.footer?.showPageNumbers !== false) {
        renderPageFooter(doc, index + 1, totalPages, pageWidth, pageHeight);
      }
    }
  });

  const blob = doc.output('blob');
  const filename = `${brand.name}-guidelines.pdf`;
  downloadBlob(blob, filename);
  return blob;
}

/**
 * Builds a ZIP archive containing the PDF, color palette, brand info, and a README.
 * Triggers a browser download.
 */
export async function exportAsZIP(
  brand: Brand,
  slides: GuidelineSlide[],
  settings: GuidelineSettings
): Promise<Blob> {
  const zip = new JSZip();

  // 1. Generate the PDF and add it to the ZIP
  const pdfBlob = await exportAsPDF(brand, slides, settings);
  zip.file('guidelines.pdf', pdfBlob);

  // 2. Color palette JSON
  const enabledSlides = slides.filter((s) => s.enabled);
  const colorSlide = enabledSlides.find((s) => s.type === 'colors');
  const palette = {
    primary: { hex: colorSlide?.content?.primary || brand.primaryColor || '#000000' },
    secondary: { hex: colorSlide?.content?.secondary || brand.secondaryColor || '#666666' },
    accent: { hex: colorSlide?.content?.accent || brand.secondaryColor || '#007bff' },
  };
  zip.folder('colors');
  zip.file('colors/palette.json', JSON.stringify(palette, null, 2));

  // 3. Brand info JSON
  const strategySlide = enabledSlides.find((s) => s.type === 'strategy');
  const typographySlide = enabledSlides.find((s) => s.type === 'typography');
  const voiceSlide = enabledSlides.find((s) => s.type === 'voice');

  const brandInfo = {
    name: brand.name,
    tone: brand.tone,
    audience: brand.audience,
    fonts: {
      primary: typographySlide?.content?.primaryFont || brand.fonts?.primary || 'Inter',
      secondary: typographySlide?.content?.secondaryFont || brand.fonts?.secondary || 'Inter',
    },
    strategy: {
      mission: strategySlide?.content?.mission || '',
      vision: strategySlide?.content?.vision || '',
      values: strategySlide?.content?.values || [],
    },
    voice: {
      tone: voiceSlide?.content?.voice || brand.tone || '',
      dos: voiceSlide?.content?.toneDos || [],
      donts: voiceSlide?.content?.toneDonts || [],
    },
  };
  zip.file('brand-info.json', JSON.stringify(brandInfo, null, 2));

  // 4. README
  const readme = [
    `${brand.name} - Brand Kit`,
    '='.repeat(brand.name.length + 14),
    '',
    'This archive contains the following brand assets:',
    '',
    '  guidelines.pdf      - Full brand guidelines document',
    '  colors/palette.json - Brand color palette with hex values',
    '  brand-info.json     - Brand metadata (tone, fonts, strategy, voice)',
    '  README.txt          - This file',
    '',
    `Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`,
  ].join('\n');
  zip.file('README.txt', readme);

  // Generate and download
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const filename = `${brand.name}-brand-kit.zip`;
  downloadBlob(zipBlob, filename);
  return zipBlob;
}
