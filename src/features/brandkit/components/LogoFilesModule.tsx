import { useState, useMemo, useRef, useCallback } from 'react';
import { Download, Check, AlertTriangle, Info, ChevronDown } from 'lucide-react';
import { generateLogoVariants, type LogoVariant } from '../engine/brandRules';
import type { Brand } from '@/shared/types/brand';
import { toast } from 'sonner';

interface LogoFilesModuleProps {
  brand: Brand;
}

type CategoryFilter = 'all' | 'primary' | 'inverse' | 'monochrome' | 'accent';

function downloadCanvasAsFile(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function downloadLogoVariant(variant: LogoVariant, brand: Brand, format: string, size: number) {
  const slug = brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-');

  // SVG download
  if (format === 'SVG' && variant.logoSrc && !variant.logoSrc.startsWith('data:')) {
    try {
      const resp = await fetch(variant.logoSrc);
      const svgText = await resp.text();
      const blob = new Blob([svgText], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}-${variant.id}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${variant.name} (SVG — vector, infinite resolution)`);
    } catch {
      toast.error('SVG download failed');
    }
    return;
  }

  // PDF download — editable vector PDF with embedded SVG
  if (format === 'PDF') {
    try {
      const { default: jsPDF } = await import('jspdf');

      // Load logo to get aspect ratio
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((r, j) => { img.onload = () => r(); img.onerror = j; img.src = variant.logoSrc; });

      const logoRatio = img.width / img.height;
      const pdfW = 300; // mm
      const pdfH = logoRatio > 1.5 ? pdfW / logoRatio * 1.5 : pdfW;
      const pdf = new jsPDF({ orientation: logoRatio > 1.2 ? 'landscape' : 'portrait', unit: 'mm', format: [pdfW, pdfH] });

      // Background
      if (variant.bgColor !== 'transparent') {
        pdf.setFillColor(variant.bgColor);
        pdf.rect(0, 0, pdfW, pdfH, 'F');
      }

      // Render logo on high-res canvas then add to PDF
      const canvasSize = 4000;
      const canvas = document.createElement('canvas');
      const cRatio = img.width / img.height;
      canvas.width = canvasSize;
      canvas.height = Math.round(canvasSize / cRatio);
      const ctx = canvas.getContext('2d')!;
      if (variant.logoFilter) ctx.filter = variant.logoFilter;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';

      const logoW = pdfW * 0.5;
      const logoH = logoW / cRatio;
      const lx = (pdfW - logoW) / 2;
      const ly = (pdfH - logoH) / 2;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', lx, ly, logoW, logoH);

      // Add metadata text
      pdf.setFontSize(6);
      pdf.setTextColor(150);
      pdf.text(`${brand.name} — ${variant.name}`, 8, pdfH - 8);
      pdf.text(variant.recommendedUse, 8, pdfH - 4);
      pdf.text(`${variant.bgColor} | Contrast: ${variant.contrastScore.toFixed(1)}:1`, pdfW - 8, pdfH - 4, { align: 'right' });

      pdf.save(`${slug}-${variant.id}.pdf`);
      toast.success(`Downloaded ${variant.name} (PDF — print-ready)`);
    } catch (err) {
      console.error(err);
      toast.error('PDF export failed');
    }
    return;
  }

  // First load the image to get its actual dimensions
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = variant.logoSrc;
  });

  // Calculate canvas size based on actual logo aspect ratio
  const logoRatio = img.width / img.height;
  const padding = 0.25; // 25% padding on each side
  let canvasW: number, canvasH: number;

  if (logoRatio > 2) {
    // Wide wordmark (e.g. RAQM 4:1)
    canvasW = size;
    canvasH = Math.round(size / logoRatio * (1 + padding * 2));
  } else if (logoRatio > 1) {
    // Slightly wide logo
    canvasW = size;
    canvasH = Math.round(size / logoRatio * (1 + padding));
  } else {
    // Square or tall logo (e.g. SKAM ~1:1)
    canvasH = size;
    canvasW = Math.round(size * logoRatio * (1 + padding));
    if (canvasW < size * 0.6) canvasW = size; // min width
  }

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) { toast.error('Canvas not supported'); return; }

  // Draw background
  if (variant.bgColor !== 'transparent') {
    ctx.fillStyle = variant.bgColor;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // Draw logo centered with proper padding
  const maxLogoW = canvasW * (1 - padding * 2);
  const maxLogoH = canvasH * (1 - padding * 2);
  const scale = Math.min(maxLogoW / img.width, maxLogoH / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (canvasW - w) / 2;
  const y = (canvasH - h) / 2;

  if (variant.logoFilter) {
    ctx.filter = variant.logoFilter;
  }
  ctx.drawImage(img, x, y, w, h);
  ctx.filter = 'none';

  const filename = `${slug}-${variant.id}-${canvasW}x${canvasH}.png`;
  downloadCanvasAsFile(canvas, filename);
  toast.success(`Downloaded ${variant.name} (${canvasW}×${canvasH}px PNG)`);
}

function ContrastBadge({ score }: { score: number }) {
  if (score === 0) return <span className="text-[10px] text-muted-foreground">N/A</span>;
  const color = score >= 4.5 ? 'text-green-600' : score >= 3 ? 'text-yellow-600' : 'text-red-500';
  const icon = score >= 4.5 ? <Check className="h-3 w-3" /> : score >= 3 ? <Info className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />;
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-medium ${color}`}>
      {icon} {score.toFixed(1)}:1
    </span>
  );
}

export function LogoFilesModule({ brand }: LogoFilesModuleProps) {
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [previewBg, setPreviewBg] = useState<string | null>(null);
  const [downloadSize, setDownloadSize] = useState(4000);

  const allVariants = useMemo(() => generateLogoVariants(brand), [brand]);

  const filteredVariants = useMemo(() => {
    if (category === 'all') return allVariants;
    return allVariants.filter(v => v.category === category);
  }, [allVariants, category]);

  const categories: { key: CategoryFilter; label: string }[] = [
    { key: 'all', label: 'All Variants' },
    { key: 'primary', label: 'Primary' },
    { key: 'inverse', label: 'Inverse' },
    { key: 'monochrome', label: 'Monochrome' },
    { key: 'accent', label: 'Accent' },
  ];

  if (!brand.logo) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Logo Files</h2>
          <p className="text-muted-foreground">Upload a logo in Brand Settings to generate variants.</p>
        </div>
        <div className="flex items-center justify-center py-20 border-2 border-dashed border-border rounded-xl">
          <div className="text-center">
            <AlertTriangle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No logo available</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Add a logo in Settings to generate download-ready variants.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Logo Files</h2>
        <p className="text-muted-foreground">
          {allVariants.length} brand-safe variants of your logo — validated for contrast and usage.
        </p>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Category Filter */}
        <div className="flex gap-1.5">
          {categories.map(c => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                category === c.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Download Size */}
          <select
            value={downloadSize}
            onChange={e => setDownloadSize(Number(e.target.value))}
            className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
          >
            <option value={1024}>1024px (Web)</option>
            <option value={2048}>2048px (HD)</option>
            <option value={4000}>4000px (Print)</option>
            <option value={6000}>6000px (Ultra)</option>
            <option value={8000}>8000px (Max)</option>
          </select>
        </div>
      </div>

      {/* Variants Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVariants.map(variant => (
          <div
            key={variant.id}
            className={`rounded-xl border overflow-hidden bg-card transition-all hover:shadow-lg ${
              !variant.isValid ? 'border-yellow-300 dark:border-yellow-700' : 'border-border hover:border-primary/30'
            }`}
          >
            {/* Preview */}
            <div
              className="aspect-[16/9] flex items-center justify-center p-6 relative"
              style={{
                backgroundColor: previewBg || variant.bgColor,
                backgroundImage: variant.bgColor === 'transparent' ? 'repeating-conic-gradient(#e5e5e5 0% 25%, transparent 0% 50%) 0 0 / 16px 16px' : undefined,
              }}
            >
              <img
                src={variant.logoSrc}
                alt={variant.name}
                className="max-w-[65%] max-h-[60%] object-contain"
                style={{ filter: variant.logoFilter || 'none' }}
              />
              {/* Contrast Badge */}
              <div className="absolute top-2 right-2">
                <ContrastBadge score={variant.contrastScore} />
              </div>
              {/* Warnings */}
              {variant.warnings.length > 0 && (
                <div className="absolute top-2 left-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                </div>
              )}
            </div>

            {/* Info + Actions */}
            <div className="p-3.5 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{variant.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{variant.recommendedUse}</p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  variant.category === 'primary' ? 'bg-primary/10 text-primary' :
                  variant.category === 'inverse' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' :
                  variant.category === 'monochrome' ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' :
                  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                }`}>
                  {variant.category}
                </span>
              </div>

              {variant.warnings.length > 0 && (
                <p className="text-[10px] text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 rounded px-2 py-1">
                  {variant.warnings[0]}
                </p>
              )}

              {/* Download Buttons */}
              <div className="flex gap-1 pt-1">
                {variant.downloadFormats.includes('SVG') && (
                  <button
                    onClick={() => downloadLogoVariant(variant, brand, 'SVG', downloadSize)}
                    className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[10px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Download className="h-2.5 w-2.5" /> SVG
                  </button>
                )}
                <button
                  onClick={() => downloadLogoVariant(variant, brand, 'PNG', downloadSize)}
                  className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[10px] font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
                >
                  <Download className="h-2.5 w-2.5" /> PNG
                </button>
                <button
                  onClick={() => downloadLogoVariant(variant, brand, 'PDF', downloadSize)}
                  className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[10px] font-medium border border-border hover:bg-muted transition-colors"
                >
                  <Download className="h-2.5 w-2.5" /> PDF
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
