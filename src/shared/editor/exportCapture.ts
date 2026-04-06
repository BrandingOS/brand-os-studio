/**
 * Shared element-to-canvas capture utility used by every export path
 * (full PDF, single-slide PDF, PNG/JPG, SVG, PPTX).
 *
 * Solves the html2canvas issues common to all export formats:
 *  1. SVG <img> elements rendered at viewBox size instead of CSS size
 *  2. CSS filters on <img> elements ignored (e.g. brightness(0) invert(1))
 *  3. Container query units (cqi/cqb) breaking when bounds are wrong
 *  4. Editor zoom transforms / scroll context confusing the captured rect
 *
 * Strategy: clone the live element into an off-DOM staging container at
 * exact pixel dimensions, pre-rasterize all images at their rendered DOM
 * size with filters baked into pixels, then run html2canvas on the clone.
 */

interface CaptureOptions {
  /** Target capture width in CSS pixels. Defaults to the live element's width. */
  width?: number;
  /** Target capture height in CSS pixels. Defaults to the live element's height. */
  height?: number;
  /** Pixel multiplier for the final canvas (default 2 for crispness). */
  scale?: number;
  /** Background color (default '#ffffff'). Pass null for transparent. */
  backgroundColor?: string | null;
}

/**
 * Capture a live HTML element into a canvas with proper handling of
 * SVG sizing and CSS filters.
 *
 * Returns the canvas. Caller is responsible for converting to blob/dataURL.
 */
export async function captureElementForExport(
  liveEl: HTMLElement,
  opts: CaptureOptions = {},
): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import('html2canvas');

  // Determine capture dimensions
  const liveRect = liveEl.getBoundingClientRect();
  const width = Math.round(opts.width ?? liveRect.width);
  const height = Math.round(opts.height ?? liveRect.height);
  const scale = opts.scale ?? 2;
  const bg = opts.backgroundColor === null ? null : (opts.backgroundColor ?? '#ffffff');

  // Create the staging container
  const stage = document.createElement('div');
  stage.setAttribute('data-export-stage', '');
  stage.style.cssText = [
    'position: fixed',
    'top: -10000px',
    'left: 0',
    `width: ${width}px`,
    `height: ${height}px`,
    'z-index: -1',
    'overflow: hidden',
    'pointer-events: none',
    bg ? `background: ${bg}` : '',
  ].filter(Boolean).join(';');
  document.body.appendChild(stage);

  try {
    // Clone the live element and force fixed dimensions
    const clone = liveEl.cloneNode(true) as HTMLElement;
    clone.style.width = `${width}px`;
    clone.style.height = `${height}px`;
    clone.style.maxWidth = 'none';
    clone.style.maxHeight = 'none';
    clone.style.transform = 'none';
    clone.style.boxShadow = 'none';
    stage.appendChild(clone);

    // Wait for layout
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await new Promise((r) => setTimeout(r, 50));

    // Pre-rasterize images
    await preprocessImages(clone);

    // Capture the staged clone
    const canvas = await html2canvas(clone, {
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      scale,
      backgroundColor: bg,
      useCORS: true,
      allowTaint: true,
      logging: false,
      foreignObjectRendering: false,
      imageTimeout: 8000,
    });

    return canvas;
  } finally {
    if (stage.parentNode) stage.parentNode.removeChild(stage);
  }
}

/**
 * Walk every <img> in the cloned subtree, draw it onto a canvas at its
 * actual rendered DOM size with the CSS filter baked into pixels, then
 * replace the img.src with the resulting bitmap data URL.
 */
async function preprocessImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'));
  const PIXEL_SCALE = 2;

  const isInvertWhite = (f: string): boolean => {
    const l = f.toLowerCase();
    return (
      (l.includes('brightness(0)') && l.includes('invert(1)')) ||
      (l.includes('brightness(0)') && l.includes('invert(100%)'))
    );
  };
  const isBlack = (f: string): boolean => {
    const l = f.toLowerCase();
    return l.includes('brightness(0)') && !l.includes('invert');
  };
  const isGrayscale = (f: string): boolean => {
    const l = f.toLowerCase();
    return l.includes('grayscale(1)') || l.includes('grayscale(100%)');
  };

  await Promise.all(imgs.map(async (img) => {
    try {
      const src = img.src;
      if (!src || src.startsWith('data:')) return;

      const rect = img.getBoundingClientRect();
      const cssW = Math.round(rect.width);
      const cssH = Math.round(rect.height);
      if (cssW < 2 || cssH < 2) return;

      const filter = img.style.filter || window.getComputedStyle(img).filter || 'none';
      const objectFit = window.getComputedStyle(img).objectFit || 'fill';

      // Load original
      const tempImg = new Image();
      await new Promise<void>((res, rej) => {
        tempImg.onload = () => res();
        tempImg.onerror = () => rej(new Error('img load failed'));
        tempImg.src = src;
      });

      const naturalW = tempImg.naturalWidth || cssW;
      const naturalH = tempImg.naturalHeight || cssH;

      const canvas = document.createElement('canvas');
      canvas.width = cssW * PIXEL_SCALE;
      canvas.height = cssH * PIXEL_SCALE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(PIXEL_SCALE, PIXEL_SCALE);

      // object-fit destination rect
      let dx = 0, dy = 0, dw = cssW, dh = cssH;
      const naturalRatio = naturalW / naturalH;
      const boxRatio = cssW / cssH;
      if (objectFit === 'contain') {
        if (naturalRatio > boxRatio) {
          dw = cssW; dh = cssW / naturalRatio; dx = 0; dy = (cssH - dh) / 2;
        } else {
          dh = cssH; dw = cssH * naturalRatio; dy = 0; dx = (cssW - dw) / 2;
        }
      } else if (objectFit === 'cover') {
        if (naturalRatio > boxRatio) {
          dh = cssH; dw = cssH * naturalRatio; dy = 0; dx = (cssW - dw) / 2;
        } else {
          dw = cssW; dh = cssW / naturalRatio; dx = 0; dy = (cssH - dh) / 2;
        }
      }

      ctx.drawImage(tempImg, dx, dy, dw, dh);

      // Apply filter via manual pixel manipulation (more reliable than ctx.filter
      // for SVG images across browsers)
      if (filter !== 'none' && filter !== '') {
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          if (isInvertWhite(filter)) {
            for (let i = 0; i < data.length; i += 4) {
              if (data[i + 3] > 0) {
                data[i] = 255; data[i + 1] = 255; data[i + 2] = 255;
              }
            }
          } else if (isBlack(filter)) {
            for (let i = 0; i < data.length; i += 4) {
              if (data[i + 3] > 0) {
                data[i] = 0; data[i + 1] = 0; data[i + 2] = 0;
              }
            }
          } else if (isGrayscale(filter)) {
            for (let i = 0; i < data.length; i += 4) {
              if (data[i + 3] > 0) {
                const g = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                data[i] = g; data[i + 1] = g; data[i + 2] = g;
              }
            }
          }
          ctx.putImageData(imageData, 0, 0);
        } catch (e) {
          console.warn('[Export] Filter pixel application failed:', e);
        }
      }

      // Wait for the new src to load before resolving
      const dataUrl = canvas.toDataURL('image/png');
      img.style.filter = 'none';
      await new Promise<void>((res) => {
        const onDone = () => res();
        img.addEventListener('load', onDone, { once: true });
        img.addEventListener('error', onDone, { once: true });
        img.src = dataUrl;
        setTimeout(onDone, 500);
      });
    } catch (e) {
      console.warn('[Export] Failed to rasterize img:', e);
    }
  }));
}
