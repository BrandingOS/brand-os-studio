/**
 * Image-to-SVG tracing engine.
 *
 * Uses imagetracerjs to convert a raster image (PNG/JPG) to SVG paths.
 * Runs entirely client-side — no server needed.
 */

export interface TraceOptions {
  /** Number of colors to quantize (2-64). Lower = simpler SVG. */
  colorCount: number;
  /** Minimum path length to keep (filters noise). */
  minPathLength: number;
  /** Blur radius for pre-processing (0-5). */
  blur: number;
  /** Stroke width for outlines (0 = filled shapes only). */
  strokeWidth: number;
}

export const DEFAULT_OPTIONS: TraceOptions = {
  colorCount: 8,
  minPathLength: 4,
  blur: 0,
  strokeWidth: 0,
};

/**
 * Load an image file into an HTMLImageElement.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Draw image to canvas and get ImageData.
 */
function getImageData(img: HTMLImageElement, maxSize = 1024): ImageData {
  const canvas = document.createElement('canvas');
  let { width, height } = img;

  // Scale down large images for performance
  if (width > maxSize || height > maxSize) {
    const scale = maxSize / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

/**
 * Trace a raster image file to SVG string.
 */
export async function traceImageToSVG(
  file: File,
  options: TraceOptions = DEFAULT_OPTIONS,
): Promise<string> {
  // Dynamic import to avoid bundling the tracer for users who don't use this feature
  const ImageTracer = (await import('imagetracerjs')).default || (await import('imagetracerjs'));

  const img = await loadImage(file);
  const imageData = getImageData(img);

  // Map our options to imagetracerjs options
  const tracerOptions = {
    // Color quantization
    numberofcolors: options.colorCount,
    colorquantcycles: 3,
    // Path filtering
    pathomit: options.minPathLength,
    // Pre-processing
    blurradius: options.blur,
    blurdelta: 20,
    // SVG rendering
    strokewidth: options.strokeWidth,
    // Line & curve thresholds
    ltres: 1,
    qtres: 1,
    // Scale
    scale: 1,
    // Round coordinates to 1 decimal
    roundcoords: 1,
    // Output desc metadata
    desc: false,
    // Tracing options
    corsenabled: false,
    rightangleenhance: true,
  };

  const svgString = ImageTracer.imagedataToSVG(imageData, tracerOptions);

  // Clean up object URL
  URL.revokeObjectURL(img.src);

  return svgString;
}

/**
 * Download a string as a file.
 */
export function downloadSVG(svgString: string, filename = 'logo.svg') {
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
