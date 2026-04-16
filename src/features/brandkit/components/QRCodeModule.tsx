import { useState, useMemo, useEffect, useRef } from 'react';
import { Download, FileDown } from 'lucide-react';
import QRCode from 'qrcode';
import { BrandLogo } from './renderers/BrandLogo';
import type { Brand } from '@/shared/types/brand';
import { logoUrl, hasLogo } from '@/shared/brand/logoUrl';
import { toast } from 'sonner';
import { downloadResult } from '@/shared/services/export';

interface QRCodeModuleProps {
  brand: Brand;
}

export function QRCodeModule({ brand }: QRCodeModuleProps) {
  const [qrData, setQrData] = useState(brand.publicUrl || 'https://example.com');
  const [fillBackground, setFillBackground] = useState(false);
  const [qrColor, setQrColor] = useState(brand.primaryColor);
  const [bwMode, setBwMode] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const colors = useMemo(() => {
    const palette = [brand.primaryColor];
    if (brand.secondaryColor) palette.push(brand.secondaryColor);
    palette.push('#000000');
    return palette;
  }, [brand]);

  const displayColor = bwMode ? '#000000' : qrColor;

  // Generate real QR code
  useEffect(() => {
    if (!qrData.trim()) return;
    QRCode.toDataURL(qrData, {
      width: 800,
      margin: 2,
      color: {
        dark: displayColor,
        light: fillBackground ? `${displayColor}10` : '#FFFFFF',
      },
      errorCorrectionLevel: 'H', // High — allows logo overlay
    }).then(url => {
      setQrDataUrl(url);
    }).catch(() => {
      setQrDataUrl('');
    });
  }, [qrData, displayColor, fillBackground]);

  const handleDownload = () => {
    if (!qrDataUrl) { toast.error('No QR code to download'); return; }

    // Create canvas with logo overlay
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 1024, 1024);

      // Logo overlay in center
      if (hasLogo(brand)) {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        logoImg.onload = () => {
          const logoSize = 180;
          const x = (1024 - logoSize) / 2;
          const y = (1024 - logoSize) / 2;
          // White circle background for logo
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(1024 / 2, 1024 / 2, logoSize / 2 + 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.drawImage(logoImg, x, y, logoSize, logoSize);

          downloadCanvas(canvas);
        };
        logoImg.onerror = () => downloadCanvas(canvas);
        logoImg.src = logoUrl(brand)!;
      } else {
        downloadCanvas(canvas);
      }
    };
    img.src = qrDataUrl;

    function downloadCanvas(c: HTMLCanvasElement) {
      const link = document.createElement('a');
      link.download = `${brand.slug || brand.name.toLowerCase()}-qrcode.png`;
      link.href = c.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('QR Code downloaded (1024×1024 PNG)');
    }
  };

  const handleDownloadJPG = () => {
    if (!qrDataUrl) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1024, 1024);
      ctx.drawImage(img, 0, 0, 1024, 1024);
      canvas.toBlob((blob) => {
        if (blob) {
          downloadResult({
            blob,
            filename: `${brand.slug || brand.name.toLowerCase()}-qrcode.jpg`,
            mimeType: 'image/jpeg',
          });
          toast.success('QR Code downloaded (1024×1024 JPG)');
        }
      }, 'image/jpeg', 0.92);
    };
    img.src = qrDataUrl;
  };

  const handleDownloadSVG = async () => {
    if (!qrData) return;
    try {
      const svgString = await QRCode.toString(qrData, {
        type: 'svg',
        width: 1024,
        margin: 2,
        color: { dark: displayColor, light: fillBackground ? `${displayColor}10` : '#FFFFFF' },
        errorCorrectionLevel: 'H',
      });
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      downloadResult({
        blob,
        filename: `${brand.slug || brand.name.toLowerCase()}-qrcode.svg`,
        mimeType: 'image/svg+xml',
      });
      toast.success('QR Code downloaded (vector SVG)');
    } catch {
      toast.error('SVG export failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">QR Code Generator</h2>
        <p className="text-muted-foreground">Create scannable branded QR codes for your business.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Form */}
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium mb-1.5 block">QR Code Data</label>
            <input
              type="text"
              value={qrData}
              onChange={(e) => setQrData(e.target.value)}
              placeholder="Enter URL or text"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Fill Background</label>
            <button
              onClick={() => setFillBackground(!fillBackground)}
              className={`w-11 h-6 rounded-full transition-colors relative ${fillBackground ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${fillBackground ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">QR Code Color</label>
            <div className="flex gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => { setQrColor(color); setBwMode(false); }}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${qrColor === color && !bwMode ? 'border-primary scale-110 ring-2 ring-primary/20' : 'border-border hover:scale-105'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Black & White Mode</label>
            <button
              onClick={() => setBwMode(!bwMode)}
              className={`w-11 h-6 rounded-full transition-colors relative ${bwMode ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${bwMode ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="flex flex-col items-center gap-6">
          <div className="w-full max-w-sm aspect-square rounded-2xl border border-border p-4 flex items-center justify-center bg-white relative overflow-hidden">
            {qrDataUrl ? (
              <div className="w-full h-full relative">
                <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                {/* Logo overlay */}
                {hasLogo(brand) && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[18%] h-[18%] bg-white rounded-lg flex items-center justify-center shadow-sm p-1">
                    <img src={logoUrl(brand)} alt="" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Enter data to generate QR code</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownload}
              disabled={!qrDataUrl}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              PNG
            </button>
            <button
              onClick={handleDownloadJPG}
              disabled={!qrDataUrl}
              className="flex items-center gap-2 px-5 py-2.5 border border-border rounded-xl font-medium text-sm hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              JPG
            </button>
            <button
              onClick={handleDownloadSVG}
              disabled={!qrDataUrl}
              className="flex items-center gap-2 px-5 py-2.5 border border-border rounded-xl font-medium text-sm hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown className="h-4 w-4" />
              SVG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
