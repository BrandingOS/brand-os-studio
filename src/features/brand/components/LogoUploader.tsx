import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, Plus } from 'lucide-react';
import { storageService } from '@/shared/services/storage.supabase';
import { useToast } from '@/hooks/use-toast';

interface LogoUploaderProps {
  brandId: string;
  logoSystem: any;
  onLogoSystemChange: (logoSystem: any) => void;
}

const LOGO_TYPES = [
  { key: 'primary', label: 'Primary Logo' },
  { key: 'logotype', label: 'Logotype' },
  { key: 'brandmark', label: 'Brandmark' },
  { key: 'submark', label: 'Submark' },
  { key: 'black', label: 'Black Version' },
  { key: 'white', label: 'White Version' },
  { key: 'icon', label: 'Icon/Favicon' },
];

export function LogoUploader({ brandId, logoSystem, onLogoSystemChange }: LogoUploaderProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (logoType: string, file: File) => {
    try {
      setUploading(logoType);
      const url = await storageService.uploadLogo(brandId, logoType as any, file);
      
      onLogoSystemChange({
        ...logoSystem,
        [logoType]: {
          url,
          description: `${logoType} logo`,
          usage: 'General use'
        }
      });

      toast({
        title: 'Logo uploaded',
        description: `${logoType} logo has been uploaded successfully.`
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload logo. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveLogo = async (logoType: string) => {
    try {
      const updatedLogos = { ...logoSystem };
      delete updatedLogos[logoType];
      onLogoSystemChange(updatedLogos);

      toast({
        title: 'Logo removed',
        description: `${logoType} logo has been removed.`
      });
    } catch (error) {
      console.error('Remove error:', error);
    }
  };

  return (
    <Card className="p-8 bg-card">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-semibold">Logos</h3>
        <Button variant="ghost" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Logo
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {LOGO_TYPES.map((type) => (
          <div key={type.key} className="flex-shrink-0 w-[140px] space-y-2 snap-start">
            <label className="text-xs font-medium text-muted-foreground block truncate">
              {type.label}
            </label>
            {logoSystem[type.key]?.url ? (
              <div className="relative group">
                <div className="aspect-square bg-muted rounded-xl p-3 flex items-center justify-center border-2 border-border hover:border-primary transition-colors">
                  <img 
                    src={logoSystem[type.key].url} 
                    alt={type.label}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                  onClick={() => handleRemoveLogo(type.key)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(type.key, file);
                  }}
                  disabled={uploading === type.key}
                />
                <div className="aspect-square bg-muted/50 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors flex items-center justify-center">
                  {uploading === type.key ? (
                    <div className="text-xs text-muted-foreground">Uploading...</div>
                  ) : (
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </label>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
