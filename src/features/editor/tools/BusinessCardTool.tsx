import { useState, useEffect, useRef } from 'react';
import { CreditCard, Download } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { brandsService } from '@/features/brand/services/brands.local';
import { jsPDF } from 'jspdf';
import type { Brand } from '@/shared/types/brand';

interface BusinessCardToolProps {
  brandId: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

function getContrastColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

export function BusinessCardTool({ brandId }: BusinessCardToolProps) {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

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

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: [3.5, 2] });
    const primary = brand.primaryColor || '#000000';
    const { r, g, b } = hexToRgb(primary);
    const contrastColor = getContrastColor(primary);
    const fontFamily = brand.fonts?.primary || 'Helvetica';

    // Front side
    // Accent bar at top
    pdf.setFillColor(r, g, b);
    pdf.rect(0, 0, 3.5, 0.15, 'F');

    // Brand name
    pdf.setFontSize(14);
    pdf.setTextColor(33, 33, 33);
    pdf.text(brand.name, 0.3, 0.55);

    // Logo placeholder text
    if (brand.logo) {
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text('[Logo]', 0.3, 0.4);
    }

    // Contact info
    pdf.setFontSize(10);
    pdf.setTextColor(33, 33, 33);
    pdf.text('Your Name', 0.3, 1.0);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text('your@email.com', 0.3, 1.25);
    pdf.text('+1 (555) 000-0000', 0.3, 1.45);

    // Accent bar at bottom
    pdf.setFillColor(r, g, b);
    pdf.rect(0, 1.85, 3.5, 0.15, 'F');

    // Back side
    pdf.addPage([3.5, 2], 'landscape');
    pdf.setFillColor(r, g, b);
    pdf.rect(0, 0, 3.5, 2, 'F');

    // Brand name centered on back
    const cR = contrastColor === '#FFFFFF' ? 255 : 0;
    const cG = contrastColor === '#FFFFFF' ? 255 : 0;
    const cB = contrastColor === '#FFFFFF' ? 255 : 0;
    pdf.setTextColor(cR, cG, cB);
    pdf.setFontSize(16);
    pdf.text(brand.name, 1.75, 1.0, { align: 'center' });

    pdf.save(`${brand.name.toLowerCase().replace(/\s+/g, '-')}-business-card.pdf`);
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
  const contrastColor = getContrastColor(primary);
  const fontFamily = brand.fonts?.primary || 'sans-serif';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Business Cards</h2>
        </div>
        <Button onClick={handleDownloadPdf} size="sm">
          <Download className="h-4 w-4 mr-2" />
          Download as PDF
        </Button>
      </div>

      {/* Front of Card */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Front</h3>
        <div className="flex justify-center">
          <div
            ref={frontRef}
            className="relative border border-border rounded-lg shadow-md overflow-hidden bg-white"
            style={{
              width: '350px',
              height: '200px',
              fontFamily,
            }}
          >
            {/* Top accent bar */}
            <div
              className="absolute top-0 left-0 right-0"
              style={{ height: '8px', backgroundColor: primary }}
            />

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-between p-5 pt-6">
              <div>
                {brand.logo && (
                  <img
                    src={brand.logo}
                    alt={`${brand.name} logo`}
                    className="h-8 w-auto mb-2 object-contain"
                  />
                )}
                <h4 className="text-lg font-bold text-gray-900" style={{ fontFamily }}>
                  {brand.name}
                </h4>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-800">Your Name</p>
                <p className="text-xs text-gray-500">your@email.com</p>
                <p className="text-xs text-gray-500">+1 (555) 000-0000</p>
              </div>
            </div>

            {/* Bottom accent bar */}
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{ height: '8px', backgroundColor: primary }}
            />
          </div>
        </div>
      </Card>

      {/* Back of Card */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Back</h3>
        <div className="flex justify-center">
          <div
            ref={backRef}
            className="relative border border-border rounded-lg shadow-md overflow-hidden flex items-center justify-center"
            style={{
              width: '350px',
              height: '200px',
              backgroundColor: primary,
              fontFamily,
            }}
          >
            <div className="flex flex-col items-center gap-3">
              {brand.logo ? (
                <img
                  src={brand.logo}
                  alt={`${brand.name} logo`}
                  className="h-12 w-auto object-contain"
                  style={{ filter: contrastColor === '#FFFFFF' ? 'brightness(0) invert(1)' : 'none' }}
                />
              ) : (
                <div
                  className="text-3xl font-bold"
                  style={{ color: contrastColor, fontFamily }}
                >
                  {brand.name}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
