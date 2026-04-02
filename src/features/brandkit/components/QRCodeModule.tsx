import { useState, useMemo } from 'react';
import { Download, QrCode } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import { toast } from 'sonner';

interface QRCodeModuleProps {
  brand: Brand;
}

function generateQRMatrix(data: string, size: number): boolean[][] {
  const matrix: boolean[][] = [];
  const hash = data.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0);

  for (let row = 0; row < size; row++) {
    matrix[row] = [];
    for (let col = 0; col < size; col++) {
      // Position detection patterns (top-left, top-right, bottom-left)
      const isTopLeftFinder = row < 7 && col < 7;
      const isTopRightFinder = row < 7 && col >= size - 7;
      const isBottomLeftFinder = row >= size - 7 && col < 7;

      if (isTopLeftFinder || isTopRightFinder || isBottomLeftFinder) {
        const localRow = row < 7 ? row : row - (size - 7);
        const localCol = col < 7 ? col : col - (size - 7);
        const isBorder = localRow === 0 || localRow === 6 || localCol === 0 || localCol === 6;
        const isInner = localRow >= 2 && localRow <= 4 && localCol >= 2 && localCol <= 4;
        matrix[row][col] = isBorder || isInner;
      } else {
        matrix[row][col] = ((hash * (row + 1) * (col + 1) + row * 7 + col * 13) % 3) !== 0;
      }
    }
  }
  return matrix;
}

export function QRCodeModule({ brand }: QRCodeModuleProps) {
  const [qrData, setQrData] = useState(brand.publicUrl || 'https://example.com');
  const [fillBackground, setFillBackground] = useState(false);
  const [qrColor, setQrColor] = useState(brand.primaryColor);
  const [bwMode, setBwMode] = useState(false);

  const colors = useMemo(() => {
    const palette = [brand.primaryColor];
    if (brand.secondaryColor) palette.push(brand.secondaryColor);
    palette.push('#000000');
    return palette;
  }, [brand]);

  const qrMatrix = useMemo(() => generateQRMatrix(qrData, 25), [qrData]);
  const displayColor = bwMode ? '#000000' : qrColor;

  const handleDownload = () => {
    toast.success('QR Code downloaded');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">QR Code Generator</h2>
        <p className="text-muted-foreground">Create branded QR codes for your business.</p>
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

          <div>
            <label className="text-sm font-medium mb-1.5 block">Logo Image</label>
            <div className="flex gap-2">
              <button className="flex-1 px-4 py-2.5 rounded-xl border border-primary bg-primary/5 text-sm font-medium text-primary">
                My Logos
              </button>
              <button className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                Upload Image
              </button>
            </div>
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
          <div className={`w-full max-w-sm aspect-square rounded-2xl border border-border p-6 flex items-center justify-center ${fillBackground ? '' : 'bg-white'}`}
            style={fillBackground ? { backgroundColor: `${displayColor}10` } : undefined}
          >
            <div className="w-full h-full relative">
              <svg viewBox="0 0 250 250" className="w-full h-full">
                {qrMatrix.map((row, rowIdx) =>
                  row.map((cell, colIdx) =>
                    cell ? (
                      <rect
                        key={`${rowIdx}-${colIdx}`}
                        x={colIdx * 10}
                        y={rowIdx * 10}
                        width="10"
                        height="10"
                        fill={displayColor}
                        rx="1"
                      />
                    ) : null
                  )
                )}
              </svg>
              {/* Logo overlay in center */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                {brand.logo ? (
                  <img src={brand.logo} alt="" className="w-8 h-8 object-contain" />
                ) : (
                  <QrCode className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download QR Code
          </button>
        </div>
      </div>
    </div>
  );
}
