import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/shared/design-system';
import { DSCard } from '@/shared/design-system';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBrandStore } from '@/shared/store/brandStore';
import type { LogoConfig } from '../types';
import type { Brand } from '@/shared/types/brand';
import {
  Download,
  Image as ImageIcon,
  FileCode2,
  Maximize,
  Crown,
  Save,
  Loader2,
  Plus,
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

/**
 * Rasterize the current logo canvas to a PNG data URL.
 * Returns null if the canvas isn't mounted or html2canvas fails.
 *
 * Used by both the export-to-file flow and the save-to-brand flow so the user
 * sees the same pixels in both places.
 */
async function rasterizeLogo(
  el: HTMLDivElement | null,
  size: number,
): Promise<string | null> {
  if (!el) return null;
  try {
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(el, {
      backgroundColor: null,
      scale: size / el.offsetWidth,
      useCORS: true,
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Logo rasterize failed:', err);
    return null;
  }
}

export function LogoExportPanel({ config, canvasRef }: LogoExportPanelProps) {
  const navigate = useNavigate();
  const brands = useBrandStore((s) => s.list);
  const loadAll = useBrandStore((s) => s.loadAll);
  const updateBrand = useBrandStore((s) => s.update);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Lazy-load brands the first time the user opens the save dialog so we don't
  // pay the cost on Logo Maker mount for users who only export to file.
  useEffect(() => {
    if (saveDialogOpen && brands.length === 0) {
      loadAll().catch((err) => {
        console.error('Failed to load brands for save dialog:', err);
      });
    }
  }, [saveDialogOpen, brands.length, loadAll]);

  const handleSaveToBrand = useCallback(async () => {
    if (!selectedBrandId) return;
    const brand = brands.find((b) => b.id === selectedBrandId);
    if (!brand) {
      toast.error('Brand not found.');
      return;
    }

    setIsSaving(true);
    try {
      // Render the logo at 1024px — large enough for print, small enough to
      // ship in a JSON patch without bloating the brand record.
      const dataUrl = await rasterizeLogo(canvasRef.current, 1024);
      if (!dataUrl) {
        toast.error('Could not render logo. Try again.');
        return;
      }

      const patch: Partial<Brand> = {
        logo: dataUrl,
        logoAssets: {
          ...(brand.logoAssets || {}),
          full: dataUrl,
        },
      };

      await updateBrand(brand.id, patch);
      toast.success(`Logo saved to ${brand.name}`);
      setSaveDialogOpen(false);
      navigate(`/dashboard/brand/${brand.slug}/edit`);
    } catch (err) {
      console.error('Save to brand failed:', err);
      toast.error('Failed to save logo. Try again.');
    } finally {
      setIsSaving(false);
    }
  }, [selectedBrandId, brands, canvasRef, updateBrand, navigate]);

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
      {/* Save to Brand — primary action. Pulls the logo out of the sandbox
          and into a brand the user actually owns. */}
      <Button
        onClick={() => setSaveDialogOpen(true)}
        className="w-full gap-2"
        size="lg"
      >
        <Save className="w-4 h-4" />
        Save to Brand
      </Button>

      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
          <span className="bg-background px-2 text-muted-foreground">or download</span>
        </div>
      </div>

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

      {/* Save-to-Brand dialog: pick a destination brand or jump to creating one. */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save logo to brand</DialogTitle>
            <DialogDescription>
              Choose which brand should use this logo. It will replace the current brand logo.
            </DialogDescription>
          </DialogHeader>

          {brands.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                You don't have any brands yet.
              </p>
              <Button
                onClick={() => {
                  setSaveDialogOpen(false);
                  navigate('/onboarding');
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Create your first brand
              </Button>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-1.5 py-2">
              {brands.map((brand) => {
                const isSelected = selectedBrandId === brand.id;
                return (
                  <button
                    key={brand.id}
                    type="button"
                    onClick={() => setSelectedBrandId(brand.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent/50',
                    )}
                  >
                    {brand.logo ? (
                      <img
                        src={brand.logo}
                        alt={brand.name}
                        className="w-9 h-9 object-contain rounded"
                      />
                    ) : (
                      <div
                        className="w-9 h-9 rounded shrink-0 flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: brand.primaryColor }}
                      >
                        {brand.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{brand.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {brand.tone || 'Brand'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {brands.length > 0 && (
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setSaveDialogOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveToBrand}
                disabled={!selectedBrandId || isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save logo
                  </>
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
