// Universal Export System — Public API
export type {
  ExportFormat, ExportSource, ExportOptions, ExportRequest, ExportResult,
  FrameGenerator, FormatInfo, RasterFormat, SourceType,
} from './types';
export { FORMAT_INFO } from './types';

export {
  exportDesign,
  downloadResult,
  exportAndDownload,
  exportMultipleAsZip,
  exportPagesAsZip,
} from './engine';

// Re-export PDF primitives for feature-specific builders
export { pdfPrimitives, hexToRgb } from './converters/pdf';

// Vector builders for real text/shape export
export {
  buildBusinessCardPDF, buildInvoicePDF, buildSocialPostPDF, buildPresentationPDF,
  buildBusinessCardSVG, buildInvoiceSVG, buildSocialPostSVG, buildPresentationSlideSVG,
  buildPresentationPPTX,
} from './builders';
export type { CardData, InvoiceData, PresentationSlide } from './builders';
