import { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/shared/design-system';
import { DSCard } from '@/shared/design-system';
import type { LogoConfig } from '../types';
import {
  Download,
  Image as ImageIcon,
  FileCode2,
  Maximize,
  Crown,
} from 'lucide-react';

interface LogoExportPanelProps {
  config: LogoConfig;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

interface ExportOption {
  label: string;
  format: string;
  size?: string;
  description: string;
  pro?: boolean;
  icon: React.ReactNode;
}

const EXPORT_OPTIONS: ExportOption[] = [
  { label: 'PNG 500px', format: 'png', size: '500', description: 'Web & social', icon: <ImageIcon className="w-4 h-4" /> },
  { label: 'PNG 1000px', format: 'png', size: '1000', description: 'Print ready', icon: <ImageIcon className="w-4 h-4" /> },
  { label: 'PNG 2000px', format: 'png', size: '2000', description: 'High resolution', icon: <Maximize className="w-4 h-4" />, pro: true },
  { label: 'SVG Vector', format: 'svg', description: 'Scalable vector', icon: <FileCode2 className="w-4 h-4" /> },
  { label: 'Favicon 32px', format: 'favicon', size: '32', description: 'Browser tab icon', icon: <ImageIcon className="w-4 h-4" /> },
  { label: 'Favicon 16px', format: 'favicon', size: '16', description: 'Smallest icon', icon: <ImageIcon className="w-4 h-4" />, pro: true },
];

export function LogoExportPanel({ config, canvasRef }: LogoExportPanelProps) {
  const handleExport = useCallback(
    async (option: ExportOption) => {
      if (option.pro) {
        // For now, pro exports show a toast / alert
        alert('Upgrade to Pro to unlock this export option.');
        return;
      }

      const el = canvasRef.current;
      if (!el) return;

      if (option.format === 'svg') {
        // Export the inner HTML as SVG (simplified)
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="${config.backgroundColor}" rx="${config.borderRadius}"/>
  <text x="200" y="220" text-anchor="middle" font-family="${config.fontFamily}" font-size="${config.fontSize}" fill="${config.primaryColor}" font-weight="600">${config.brandName || 'Brand'}</text>
</svg>`;
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${config.brandName || 'logo'}.svg`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      // PNG / Favicon export via html2canvas
      try {
        const { default: html2canvas } = await import('html2canvas');
        const size = parseInt(option.size || '500', 10);
        const canvas = await html2canvas(el, {
          backgroundColor: null,
          scale: size / el.offsetWidth,
          useCORS: true,
        });
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${config.brandName || 'logo'}-${option.size || 'export'}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }, 'image/png');
      } catch (err) {
        console.error('Export failed:', err);
      }
    },
    [config, canvasRef],
  );

  return (
    <div className="flex flex-col gap-4">
      <Label className="flex items-center gap-2">
        <Download className="w-3.5 h-3.5" />
        Export Logo
      </Label>

      <div className="space-y-2">
        {EXPORT_OPTIONS.map((option) => (
          <button
            key={option.label}
            onClick={() => handleExport(option)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-xl border border-border',
              'bg-card hover:border-primary/30 hover:bg-accent/50 transition-all text-left group',
            )}
          >
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
              {option.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{option.label}</span>
                {option.pro && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 border-amber-200 gap-0.5">
                    <Crown className="w-2.5 h-2.5" />
                    Pro
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </div>
          </button>
        ))}
      </div>

      <DSCard variant="outlined" padding="sm" className="mt-2">
        <div className="flex items-start gap-2">
          <Crown className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-foreground">Unlock all formats</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upgrade to Pro for 2000px PNG, 16px favicon, and transparent background exports.
            </p>
          </div>
        </div>
      </DSCard>
    </div>
  );
}
