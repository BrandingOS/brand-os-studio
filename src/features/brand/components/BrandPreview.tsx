import { Palette, Type, Users, Target, Edit2, Save, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Section } from '@/shared/components/Section';
import { Input } from '@/shared/components/Input';
import { useBrandPreview } from '../hooks/useBrandPreview';

export function BrandPreview() {
  const {
    brandData,
    isEditing,
    setIsEditing,
    handleEdit,
    handleSave,
    handleContinue,
    handleBackToOnboarding,
    isSaved,
  } = useBrandPreview();

  return (
    <Section container={false} className="min-h-screen bg-secondary">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">Your Brand Kit Preview</h1>
          <p className="text-muted-foreground">
            Review your brand elements and make any final adjustments
          </p>
        </div>

        {/* Brand Overview Card */}
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Brand Overview</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2"
            >
              <Edit2 className="h-4 w-4" />
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Brand Name */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Brand Name</label>
              {isEditing ? (
                <Input
                  value={brandData.name}
                  onChange={(e) => handleEdit('name', e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="text-lg font-semibold mt-1">{brandData.name}</p>
              )}
            </div>

            {/* Primary Color */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Primary Color</label>
              <div className="flex items-center gap-3 mt-1">
                <div
                  className="w-8 h-8 rounded-full border border-border"
                  style={{ backgroundColor: brandData.primaryColor }}
                />
                {isEditing ? (
                  <Input
                    value={brandData.primaryColor}
                    onChange={(e) => handleEdit('primaryColor', e.target.value)}
                    className="flex-1"
                  />
                ) : (
                  <span className="font-mono text-sm">{brandData.primaryColor}</span>
                )}
              </div>
            </div>

            {/* Logo */}
            {brandData.logo && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Logo</label>
                <div className="mt-1">
                  <img
                    src={brandData.logo}
                    alt="Brand logo"
                    className="h-16 w-auto object-contain border border-border rounded"
                  />
                </div>
              </div>
            )}

            {/* Tone */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Brand Tone</label>
              <p className="mt-1 capitalize">{brandData.tone}</p>
            </div>
          </div>
        </Card>

        {/* Brand Elements Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* Color Palette */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Palette className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Colors</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded border border-border"
                  style={{ backgroundColor: brandData.primaryColor }}
                />
                <span className="text-sm">Primary</span>
              </div>
              {brandData.secondaryColor && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded border border-border"
                    style={{ backgroundColor: brandData.secondaryColor }}
                  />
                  <span className="text-sm">Secondary</span>
                </div>
              )}
            </div>
          </Card>

          {/* Typography */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Type className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Typography</h3>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Primary</p>
                <p className="font-medium" style={{ fontFamily: brandData.fonts?.primary }}>
                  {brandData.fonts?.primary || 'Inter'}
                </p>
              </div>
            </div>
          </Card>

          {/* Brand Tone */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Tone</h3>
            </div>
            <p className="text-sm capitalize">{brandData.tone}</p>
          </Card>

          {/* Target Audience */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Audience</h3>
            </div>
            <p className="text-sm capitalize">{brandData.audience}</p>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="outline"
            onClick={handleBackToOnboarding}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Setup
          </Button>

          {isEditing && (
            <Button
              onClick={handleSave}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          )}

          <Button
            onClick={handleContinue}
            className="flex items-center gap-2"
            disabled={isEditing}
          >
            {isSaved ? 'Go to Dashboard' : 'Continue to Dashboard'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Section>
  );
}