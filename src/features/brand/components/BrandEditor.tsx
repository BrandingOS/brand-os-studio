import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Brand } from '@/shared/types/brand';
import { Edit2, Save, X, Palette, Type, MessageCircle, Users, Check, Upload, Image, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { compressLogo, validateUploadFile } from '@/shared/utils/imageUpload';

interface BrandEditorProps {
  brand: Brand;
  onBrandUpdated?: (brand: Brand) => void;
}

interface ColorEntry {
  hex: string;
  label: string;
}

export function BrandEditor({ brand, onBrandUpdated }: BrandEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: brand.name,
    primaryColor: brand.primaryColor,
    secondaryColor: brand.secondaryColor || '',
    tone: brand.tone || '',
    audience: brand.audience || '',
  });
  const [logoPreview, setLogoPreview] = useState<string | undefined>(brand.logo);
  const [pendingLogoFile, setPendingLogoFile] = useState<string | null>(null);
  const [extraColors, setExtraColors] = useState<ColorEntry[]>(() => {
    const colors: ColorEntry[] = [];
    if (brand.guidelines?.colorPalette?.accent) {
      colors.push({ hex: brand.guidelines.colorPalette.accent.hex, label: 'Accent' });
    }
    return colors;
  });

  const { update, isLoading } = useBrandStore();
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (showSaved) {
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showSaved]);

  // Sync brand prop changes
  useEffect(() => {
    setLogoPreview(brand.logo);
    setEditData({
      name: brand.name,
      primaryColor: brand.primaryColor,
      secondaryColor: brand.secondaryColor || '',
      tone: brand.tone || '',
      audience: brand.audience || '',
    });
  }, [brand]);

  const handleSave = async () => {
    try {
      const patch: Partial<Brand> = { ...editData };
      if (pendingLogoFile !== null) {
        patch.logo = pendingLogoFile || undefined;
      }
      await update(brand.id, patch);
      setPendingLogoFile(null);
      setIsEditing(false);
      setShowSaved(true);
      toast.success('Brand updated');
      // Reload the brand to reflect changes
      const { services } = await import('@/shared/services/registry');
      const updated = await services.brands.getById(brand.id);
      if (updated && onBrandUpdated) onBrandUpdated(updated);
    } catch (error) {
      console.error('Failed to update brand:', error);
      toast.error('Failed to save');
    }
  };

  const handleCancel = () => {
    setEditData({
      name: brand.name,
      primaryColor: brand.primaryColor,
      secondaryColor: brand.secondaryColor || '',
      tone: brand.tone || '',
      audience: brand.audience || '',
    });
    setLogoPreview(brand.logo);
    setPendingLogoFile(null);
    setIsEditing(false);
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    // Validate file
    const validation = validateUploadFile(file, { maxSizeMB: 10, acceptedTypes: ['image/'] });
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      toast.loading('Compressing image...');
      const dataUrl = await compressLogo(file);
      toast.dismiss();

      setLogoPreview(dataUrl);
      setPendingLogoFile(dataUrl);

      if (!isEditing) {
        try {
          await update(brand.id, { logo: dataUrl });
          toast.success('Logo uploaded');
          import('@/shared/services/registry').then(({ services }) => {
            services.brands.getById(brand.id).then(updated => {
              if (updated && onBrandUpdated) onBrandUpdated(updated);
            });
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Upload failed';
          toast.error(msg);
        }
      } else {
        toast.success('Logo selected — click Save to apply');
      }
    } catch (err) {
      toast.dismiss();
      toast.error(err instanceof Error ? err.message : 'Failed to process image');
    }
  }, [brand.id, isEditing, update, onBrandUpdated]);

  const handleRemoveLogo = useCallback(async () => {
    setLogoPreview(undefined);
    if (!isEditing) {
      await update(brand.id, { logo: undefined });
      toast.success('Logo removed');
      const { services } = await import('@/shared/services/registry');
      const updated = await services.brands.getById(brand.id);
      if (updated && onBrandUpdated) onBrandUpdated(updated);
    } else {
      setPendingLogoFile('');
      toast.success('Logo will be removed on save');
    }
  }, [brand.id, isEditing, update, onBrandUpdated]);

  const addColor = () => {
    setExtraColors(prev => [...prev, { hex: '#6366f1', label: `Color ${prev.length + 1}` }]);
  };

  const removeColor = (index: number) => {
    setExtraColors(prev => prev.filter((_, i) => i !== index));
  };

  const updateColor = (index: number, hex: string) => {
    setExtraColors(prev => prev.map((c, i) => i === index ? { ...c, hex } : c));
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Brand Information</h2>
          {showSaved && (
            <span className="flex items-center gap-1 text-xs text-green-600 animate-in fade-in duration-200">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
        </div>
        {!isEditing ? (
          <Button variant="outline" onClick={() => setIsEditing(true)} className="flex items-center gap-2">
            <Edit2 className="h-4 w-4" /> Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} className="flex items-center gap-2">
              <X className="h-4 w-4" /> Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading} className="flex items-center gap-2">
              <Save className="h-4 w-4" /> Save
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Name + Tone */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2"><Type className="h-4 w-4" /> Brand Name</label>
            {isEditing ? (
              <Input value={editData.name} onChange={e => setEditData(prev => ({ ...prev, name: e.target.value }))} placeholder="Enter brand name" />
            ) : (
              <div className="p-3 bg-muted rounded-md">{brand.name}</div>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Brand Tone</label>
            {isEditing ? (
              <Input value={editData.tone} onChange={e => setEditData(prev => ({ ...prev, tone: e.target.value }))} placeholder="e.g., Professional, Friendly, Bold" />
            ) : (
              <div className="p-3 bg-muted rounded-md">{brand.tone || 'Not specified'}</div>
            )}
          </div>
        </div>

        {/* Logo Upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2"><Image className="h-4 w-4" /> Brand Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border bg-muted/20 flex items-center justify-center overflow-hidden relative group">
              {logoPreview ? (
                <>
                  <img src={logoPreview} alt={brand.name} className="w-full h-full object-contain p-2" />
                  <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <Upload className="h-5 w-5 text-white" />
                    <input type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileSelect} />
                  </label>
                </>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-muted/40 transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-[10px] text-muted-foreground">Upload</span>
                  <input type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileSelect} />
                </label>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                {logoPreview ? 'Replace' : 'Upload Logo'}
                <input type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileSelect} />
              </label>
              {logoPreview && (
                <button onClick={handleRemoveLogo} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              )}
              <p className="text-[10px] text-muted-foreground">SVG, PNG, JPG, WebP — max 5MB</p>
            </div>
          </div>
        </div>

        {/* Target Audience */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" /> Target Audience</label>
          {isEditing ? (
            <Input value={editData.audience} onChange={e => setEditData(prev => ({ ...prev, audience: e.target.value }))} placeholder="Describe your target audience" />
          ) : (
            <div className="p-3 bg-muted rounded-md">{brand.audience || 'Not specified'}</div>
          )}
        </div>

        {/* Colors Section */}
        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center gap-2"><Palette className="h-4 w-4" /> Brand Colors</label>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Primary */}
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <input type="color" value={editData.primaryColor} onChange={e => setEditData(prev => ({ ...prev, primaryColor: e.target.value }))} className="w-10 h-10 rounded-lg border cursor-pointer p-0.5" />
                ) : (
                  <div className="w-10 h-10 rounded-lg border" style={{ backgroundColor: brand.primaryColor }} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Primary</p>
                  {isEditing ? (
                    <Input value={editData.primaryColor} onChange={e => setEditData(prev => ({ ...prev, primaryColor: e.target.value }))} className="h-7 text-xs mt-0.5" />
                  ) : (
                    <p className="text-sm font-mono">{brand.primaryColor}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Secondary */}
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <input type="color" value={editData.secondaryColor || '#cccccc'} onChange={e => setEditData(prev => ({ ...prev, secondaryColor: e.target.value }))} className="w-10 h-10 rounded-lg border cursor-pointer p-0.5" />
                ) : (
                  <div className="w-10 h-10 rounded-lg border" style={{ backgroundColor: brand.secondaryColor || '#e5e5e5' }} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Secondary</p>
                  {isEditing ? (
                    <Input value={editData.secondaryColor} onChange={e => setEditData(prev => ({ ...prev, secondaryColor: e.target.value }))} placeholder="#000000" className="h-7 text-xs mt-0.5" />
                  ) : (
                    <p className="text-sm font-mono">{brand.secondaryColor || 'Not set'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Extra Colors */}
            {extraColors.map((color, i) => (
              <div key={i} className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-3">
                  <input type="color" value={color.hex} onChange={e => updateColor(i, e.target.value)} className="w-10 h-10 rounded-lg border cursor-pointer p-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{color.label}</p>
                    <p className="text-sm font-mono">{color.hex}</p>
                  </div>
                  <button onClick={() => removeColor(i)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Add Color Button */}
            <button
              onClick={addColor}
              className="rounded-xl border-2 border-dashed border-border p-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors min-h-[68px]"
            >
              <Plus className="h-4 w-4" />
              Add Color
            </button>
          </div>
        </div>

        {/* Timestamps */}
        <div className="pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            <div>Created: {new Date(brand.createdAt).toLocaleDateString()}</div>
            <div>Last Updated: {new Date(brand.updatedAt).toLocaleDateString()}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
