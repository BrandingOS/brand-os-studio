import { useState } from 'react';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Brand } from '@/shared/types/brand';
import { Edit2, Save, X, Palette, Type, MessageCircle, Users } from 'lucide-react';

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

  const handleSave = async () => {
    try {
      await update(brand.id, editData);
      setIsEditing(false);
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
        <h2 className="text-xl font-semibold">Brand Information</h2>
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
            <div>Created: {brand.createdAt.toLocaleDateString()}</div>
            <div>Last Updated: {brand.updatedAt.toLocaleDateString()}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}