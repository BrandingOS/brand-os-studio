import { useState, useEffect } from 'react';
import { Image, Upload, Trash2, Download, Settings } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { services } from '@/shared/services/registry';
import { useBrandUpdate } from '@/shared/hooks/useBrandUpdate';
import { compressLogo } from '@/shared/utils/imageUpload';
import type { Brand } from '@/shared/types/brand';
import { logoUrl, hasLogo } from '@/shared/brand/logoUrl';
import { useBrandSettingsSafe } from '@/shared/brand-settings';

interface LogoToolProps {
  brandId: string;
}

export function LogoTool({ brandId }: LogoToolProps) {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const settings = useBrandSettingsSafe();

  const { updateBrand } = useBrandUpdate();

  useEffect(() => {
    loadBrand();
  }, [brandId]);

  const loadBrand = async () => {
    try {
      setIsLoading(true);
      const brandData = await services.brands.getById(brandId);
      setBrand(brandData);
    } catch (error) {
      console.error('Failed to load brand:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!brand) return;
    try {
      const dataUrl = await compressLogo(file);
      await updateBrand(brandId, { logo: dataUrl }, 'Logo uploaded');
      setBrand({ ...brand, logo: dataUrl });
    } catch (error) {
      console.error('Failed to upload logo:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileUpload(imageFile);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const removeLogo = async () => {
    if (!brand) return;
    try {
      await updateBrand(brandId, { logo: undefined }, 'Logo removed');
      setBrand({ ...brand, logo: undefined });
    } catch (error) {
      console.error('Failed to remove logo:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Brand not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Image className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Logo Management</h2>
      </div>

      {settings && (
        <Button size="sm" variant="outline" onClick={() => settings.openSettingsTab('general')} className="mb-4">
          <Settings className="h-3.5 w-3.5 mr-1" />
          Edit in Brand Settings
        </Button>
      )}

      {/* Current Logo */}
      {hasLogo(brand) && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Current Logo</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              <Button size="sm" variant="outline" onClick={removeLogo}>
                <Trash2 className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          </div>
          <div className="flex justify-center p-8 bg-muted rounded-lg">
            <img
              src={logoUrl(brand)}
              alt="Brand Logo"
              className="max-w-full max-h-32 object-contain"
            />
          </div>
        </Card>
      )}

      {/* Upload Area */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">
          {hasLogo(brand) ? 'Replace Logo' : 'Upload Logo'}
        </h3>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('logo-upload')?.click()}
        >
          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="text-lg font-medium mb-2">
            Drop your logo here, or click to browse
          </h4>
          <p className="text-muted-foreground text-sm mb-4">
            Supports PNG, JPG, SVG files up to 10MB
          </p>
          <Button variant="outline">
            Choose File
          </Button>
          <input
            id="logo-upload"
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      </Card>

      {/* Logo Guidelines */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Logo Guidelines</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• Use high-resolution files (minimum 300 DPI for print)</p>
          <p>• Maintain clear space around the logo</p>
          <p>• Ensure good contrast on different backgrounds</p>
          <p>• Consider creating variations (horizontal, stacked, icon-only)</p>
        </div>
      </Card>
    </div>
  );
}