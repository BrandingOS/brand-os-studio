import { useState, useEffect } from 'react';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { brandsService } from '@/features/brand/services/brands.local';
import { jsPDF } from 'jspdf';
import type { Brand } from '@/shared/types/brand';

interface LetterheadToolProps {
  brandId: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

const SAMPLE_TEXT = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.`;

export function LetterheadTool({ brandId }: LetterheadToolProps) {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadBrand(); }, [brandId]);

  const loadBrand = async () => {
    try {
      setIsLoading(true);
      setBrand(await brandsService.getById(brandId));
    } catch (error) {
      console.error('Failed to load brand:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!brand) return;

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'a4' });
    const pageWidth = 8.27;
    const primary = brand.primaryColor || '#000000';
    const { r, g, b } = hexToRgb(primary);

    // Header accent line
    pdf.setFillColor(r, g, b);
    pdf.rect(0.75, 0.9, pageWidth - 1.5, 0.03, 'F');

    // Logo placeholder
    if (brand.logo) {
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text('[Logo]', 0.75, 0.75);
    }

    // Brand name in header (right-aligned)
    pdf.setFontSize(14);
    pdf.setTextColor(r, g, b);
    pdf.text(brand.name, pageWidth - 0.75, 0.8, { align: 'right' });

    // Body text
    pdf.setFontSize(11);
    pdf.setTextColor(51, 51, 51);
    const lines = pdf.splitTextToSize(SAMPLE_TEXT, pageWidth - 1.5);
    pdf.text(lines, 0.75, 1.5);

    // Footer accent line
    const pageHeight = 11.69;
    pdf.setFillColor(r, g, b);
    pdf.rect(0.75, pageHeight - 0.8, pageWidth - 1.5, 0.03, 'F');

    // Footer text
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(brand.name, 0.75, pageHeight - 0.55);
    pdf.text('www.example.com', pageWidth - 0.75, pageHeight - 0.55, { align: 'right' });

    pdf.save(`${brand.name.toLowerCase().replace(/\s+/g, '-')}-letterhead.pdf`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!brand) {
    return <div className="text-center p-8"><p className="text-muted-foreground">Brand not found</p></div>;
  }

  const primary = brand.primaryColor || '#000000';
  const fontFamily = brand.fonts?.primary || 'sans-serif';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Letterhead</h2>
        </div>
        <Button onClick={handleDownloadPdf} size="sm">
          <Download className="h-4 w-4 mr-2" />
          Download as PDF
        </Button>
      </div>

      <Card className="p-4">
        <h3 className="font-medium mb-3">A4 Preview</h3>
        <div className="flex justify-center">
          <div
            className="relative bg-white border border-border rounded shadow-md overflow-hidden"
            style={{
              width: '400px',
              height: '566px', /* A4 ratio: 1:1.414 */
              fontFamily,
            }}
          >
            {/* Header */}
            <div className="px-6 pt-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  {brand.logo ? (
                    <img
                      src={brand.logo}
                      alt={`${brand.name} logo`}
                      className="h-8 w-auto object-contain"
                    />
                  ) : (
                    <div
                      className="text-sm font-semibold"
                      style={{ color: primary }}
                    >
                      {brand.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div
                  className="text-sm font-semibold"
                  style={{ color: primary, fontFamily }}
                >
                  {brand.name}
                </div>
              </div>
              {/* Accent line */}
              <div style={{ height: '2px', backgroundColor: primary }} />
            </div>

            {/* Body */}
            <div className="px-6 py-6">
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                {SAMPLE_TEXT}
              </p>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
              {/* Accent line */}
              <div className="mb-2" style={{ height: '2px', backgroundColor: primary }} />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500" style={{ fontFamily }}>
                  {brand.name}
                </span>
                <span className="text-[10px] text-gray-500">
                  www.example.com
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
