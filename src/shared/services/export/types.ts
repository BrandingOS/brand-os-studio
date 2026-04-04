/**
 * Universal Export System — Type Definitions
 */
import type jsPDF from 'jspdf';

// ─── Export Formats ──────────────────────────────────────────────────
export type ExportFormat =
  | 'png'
  | 'jpg'
  | 'svg'
  | 'pdf-flat'
  | 'pdf-editable'
  | 'pptx'
  | 'mp4'
  | 'gif';

export type RasterFormat = 'png' | 'jpg';
export type SourceType = 'html-element' | 'fabric-canvas' | 'canvas-frames' | 'jspdf-programmatic';

// ─── Export Source ────────────────────────────────────────────────────
export interface ExportSource {
  type: SourceType;
  /** Single HTML element or array for multi-page */
  element?: HTMLElement | HTMLElement[];
  /** Selector to find elements dynamically */
  selector?: string;
  /** Fabric.js Canvas instance */
  fabricCanvas?: any;
  /** Frame generator for video/GIF */
  frameGenerator?: FrameGenerator;
  /** Programmatic PDF builder function */
  pdfBuilder?: (doc: jsPDF) => Promise<void>;
}

// ─── Export Options ──────────────────────────────────────────────────
export interface ExportOptions {
  filename: string;
  /** Target width in pixels */
  width?: number;
  /** Target height in pixels */
  height?: number;
  /** Raster scale multiplier (default 2) */
  scale?: number;
  /** JPG quality 0-1 (default 0.92) */
  quality?: number;
  /** Background color (null = transparent) */
  backgroundColor?: string | null;
  /** Video/GIF resolution */
  resolution?: 512 | 720 | 1080;
  /** Video/GIF FPS */
  fps?: number;
  /** Video/GIF duration in seconds */
  duration?: number;
  /** PDF page orientation */
  orientation?: 'portrait' | 'landscape';
  /** PDF page format */
  pageFormat?: 'a4' | 'letter' | [number, number];
}

// ─── Frame Generator (for video/GIF) ─────────────────────────────────
export interface FrameGenerator {
  totalFrames: number;
  fps: number;
  width: number;
  height: number;
  /** Render a single frame onto the provided canvas context */
  renderFrame: (ctx: CanvasRenderingContext2D, frameIndex: number) => void;
}

// ─── Export Request ──────────────────────────────────────────────────
export interface ExportRequest {
  source: ExportSource;
  format: ExportFormat;
  options: ExportOptions;
  onProgress?: (percent: number) => void;
}

// ─── Export Result ───────────────────────────────────────────────────
export interface ExportResult {
  blob: Blob;
  filename: string;
  mimeType: string;
}

// ─── Format Metadata (for UI) ────────────────────────────────────────
export interface FormatInfo {
  format: ExportFormat;
  label: string;
  description: string;
  icon: string;
  category: 'image' | 'document' | 'video';
  fileExtension: string;
  mimeType: string;
}

export const FORMAT_INFO: Record<ExportFormat, FormatInfo> = {
  png: {
    format: 'png',
    label: 'PNG',
    description: 'High-quality raster image with transparency',
    icon: 'Image',
    category: 'image',
    fileExtension: 'png',
    mimeType: 'image/png',
  },
  jpg: {
    format: 'jpg',
    label: 'JPG',
    description: 'Compressed image, smaller file size',
    icon: 'Image',
    category: 'image',
    fileExtension: 'jpg',
    mimeType: 'image/jpeg',
  },
  svg: {
    format: 'svg',
    label: 'SVG',
    description: 'Scalable vector graphic',
    icon: 'PenTool',
    category: 'image',
    fileExtension: 'svg',
    mimeType: 'image/svg+xml',
  },
  'pdf-flat': {
    format: 'pdf-flat',
    label: 'PDF',
    description: 'High-quality PDF document',
    icon: 'FileText',
    category: 'document',
    fileExtension: 'pdf',
    mimeType: 'application/pdf',
  },
  'pdf-editable': {
    format: 'pdf-editable',
    label: 'PDF (Editable)',
    description: 'PDF with selectable text and shapes',
    icon: 'FileEdit',
    category: 'document',
    fileExtension: 'pdf',
    mimeType: 'application/pdf',
  },
  pptx: {
    format: 'pptx',
    label: 'PowerPoint',
    description: 'Presentation slides (.pptx)',
    icon: 'Presentation',
    category: 'document',
    fileExtension: 'pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
  mp4: {
    format: 'mp4',
    label: 'MP4 Video',
    description: 'Video file for social media & web',
    icon: 'Film',
    category: 'video',
    fileExtension: 'mp4',
    mimeType: 'video/mp4',
  },
  gif: {
    format: 'gif',
    label: 'GIF',
    description: 'Animated image',
    icon: 'Play',
    category: 'video',
    fileExtension: 'gif',
    mimeType: 'image/gif',
  },
};
