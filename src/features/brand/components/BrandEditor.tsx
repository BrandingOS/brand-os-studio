import { useState, useEffect } from 'react';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Brand } from '@/shared/types/brand';
import { Edit2, Save, X, Palette, Type, MessageCircle, Users, Check, Upload, Image } from 'lucide-react';
import { toast } from 'sonner';

interface BrandEditorProps {
  brand: Brand;
}

export function BrandEditor({ brand }: BrandEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: brand.name,
    primaryColor: brand.primaryColor,
    secondaryColor: brand.secondaryColor || '',
    tone: brand.tone || '',
    audience: brand.audience || ''
  });
  const { update, isLoading } = useBrandStore();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (showSaved) {
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showSaved]);

  const formatSavedTime = () => {
    if (!lastSaved) return '';
    const diffMs = Date.now() - lastSaved.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Saved just now';
    return `Saved ${diffMin} min ago`;
  };

  const handleSave = async () => {
    try {
      await update(brand.id, editData);
      setIsEditing(false);
      setLastSaved(new Date());
      setShowSaved(true);
    } catch (error) {
      console.error('Failed to update brand:', error);
    }
  };

  const handleCancel = () => {
    setEditData({
      name: brand.name,
      primaryColor: brand.primaryColor,
      secondaryColor: brand.secondaryColor || '',
      tone: brand.tone || '',
      audience: brand.audience || ''
    });
    setIsEditing(false);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Brand Information</h2>
          {showSaved && (
            <span className="flex items-center gap-1 text-xs text-green-600 animate-in fade-in duration-200">
              <Check className="h-3 w-3" />
              {formatSavedTime()}
            </span>
          )}
        </div>
        {!isEditing ? (
          <Button
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Type className="h-4 w-4" />
              Brand Name
            </label>
            {isEditing ? (
              <Input
                value={editData.name}
                onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter brand name"
              />
            ) : (
              <div className="p-3 bg-muted rounded-md">{brand.name}</div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Brand Tone
            </label>
            {isEditing ? (
              <Input
                value={editData.tone}
                onChange={(e) => setEditData(prev => ({ ...prev, tone: e.target.value }))}
                placeholder="e.g., Professional, Friendly, Bold"
              />
            ) : (
              <div className="p-3 bg-muted rounded-md">{brand.tone || 'Not specified'}</div>
            )}
          </div>
        </div>

        {/* Logo Upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Image className="h-4 w-4" />
            Brand Logo
          </label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
              {brand.logo ? (
                <img src={brand.logo} alt={brand.name} className="w-full h-full object-contain p-2" />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">{brand.name?.charAt(0)}</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                {brand.logo ? 'Replace Logo' : 'Upload Logo'}
                <input
                  type="file"
                  accept="image/svg+xml,image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async () => {
                      const url = reader.result as string;
                      try {
                        await update(brand.id, { logo: url });
                        toast.success('Logo uploaded');
                      } catch {
                        toast.error('Failed to upload logo');
                      }
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />
              </label>
              {brand.logo && (
                <button
                  onClick={async () => {
                    await update(brand.id, { logo: undefined });
                    toast.success('Logo removed');
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Target Audience
          </label>
          {isEditing ? (
            <Input
              value={editData.audience}
              onChange={(e) => setEditData(prev => ({ ...prev, audience: e.target.value }))}
              placeholder="Describe your target audience"
            />
          ) : (
            <div className="p-3 bg-muted rounded-md">{brand.audience || 'Not specified'}</div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Primary Color
            </label>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <input
                    type="color"
                    value={editData.primaryColor}
                    onChange={(e) => setEditData(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={editData.primaryColor}
                    onChange={(e) => setEditData(prev => ({ ...prev, primaryColor: e.target.value }))}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-md w-full">
                  <div 
                    className="w-8 h-8 rounded border" 
                    style={{ backgroundColor: brand.primaryColor }}
                  />
                  <span>{brand.primaryColor}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Secondary Color
            </label>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <input
                    type="color"
                    value={editData.secondaryColor}
                    onChange={(e) => setEditData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={editData.secondaryColor}
                    onChange={(e) => setEditData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-md w-full">
                  {brand.secondaryColor ? (
                    <>
                      <div 
                        className="w-8 h-8 rounded border" 
                        style={{ backgroundColor: brand.secondaryColor }}
                      />
                      <span>{brand.secondaryColor}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Not specified</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

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