import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Upload, X, Image as ImageIcon, FileText, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface UploadAssetsStepProps {
  value?: any;
  stepId: string;
}

const LOGO_TYPES = [
  { key: 'primary', label: 'Primary Logo', description: 'Your main brand logo', required: true },
  { key: 'black', label: 'Black Version', description: 'For light backgrounds', required: false },
  { key: 'white', label: 'White Version', description: 'For dark backgrounds', required: false },
  { key: 'icon', label: 'Icon / Mark', description: 'Symbol-only version', required: false },
];

export function UploadAssetsStep({ value = {}, stepId }: UploadAssetsStepProps) {
  const { setAnswer } = useOnboardingStore();
  const [dragOver, setDragOver] = useState<string | null>(null);

  const updateField = (field: string, newValue: any) => {
    setAnswer(stepId, { ...value, [field]: newValue });
  };

  // Compress to a stable data URL so previews survive navigation and
  // brand finalization can reuse the same bytes without re-reading.
  const acceptFile = async (key: string, file: File) => {
    const { compressLogo } = await import('@/shared/utils/imageUpload');
    const url = await compressLogo(file).catch(() => '');
    if (!url) return;
    updateField(key, { file, url, name: file.name, size: file.size });
  };

  const handleFileUpload = (key: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void acceptFile(key, file);
  };

  const handleDrop = (key: string, event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(null);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    void acceptFile(key, file);
  };

  const handleRemove = (key: string) => {
    const newValue = { ...value };
    delete newValue[key];
    setAnswer(stepId, newValue);
  };

  const handleGuidelinesUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    updateField('guidelines', { file, name: file.name, size: file.size });
  };

  // Brand colors
  const addBrandColor = () => {
    const colors = value.brandColors || [];
    if (colors.length < 8) {
      updateField('brandColors', [...colors, '#000000']);
    }
  };

  const updateBrandColor = (index: number, color: string) => {
    const colors = [...(value.brandColors || [])];
    colors[index] = color;
    updateField('brandColors', colors);
  };

  const removeBrandColor = (index: number) => {
    const colors = [...(value.brandColors || [])];
    colors.splice(index, 1);
    updateField('brandColors', colors);
  };

  return (
    <div className="space-y-6">
      {/* Logo Uploads */}
      <Card className="p-6">
        <h3 className="font-semibold mb-1">Logo Files</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Upload your logo in different variations. PNG, SVG, or JPG accepted.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {LOGO_TYPES.map((logo) => (
            <div key={logo.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{logo.label}</span>
                {logo.required && (
                  <span className="text-xs text-primary font-medium">Required</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{logo.description}</p>

              {value[logo.key] ? (
                <div className="border rounded-lg p-3 bg-muted/30 flex items-center gap-3">
                  <img
                    src={value[logo.key].url}
                    alt={logo.label}
                    className="w-12 h-12 object-contain border rounded bg-background"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{value[logo.key].name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(value[logo.key].size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemove(logo.key)}
                    className="p-1 h-8 w-8 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <div
                    className={`border border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                      dragOver === logo.key
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onDrop={(e) => handleDrop(logo.key, e)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(logo.key);
                    }}
                    onDragLeave={() => setDragOver(null)}
                  >
                    <ImageIcon className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Drop or click to upload</p>
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => handleFileUpload(logo.key, e)}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Brand Guidelines PDF */}
      <Card className="p-6">
        <h3 className="font-semibold mb-1">Brand Guidelines</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Have a brand guidelines document? Upload it and we'll extract key information.
        </p>

        {value.guidelines ? (
          <div className="border rounded-lg p-4 bg-muted/30 flex items-center gap-3">
            <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{value.guidelines.name}</p>
              <p className="text-xs text-muted-foreground">
                {(value.guidelines.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newVal = { ...value };
                delete newVal.guidelines;
                setAnswer(stepId, newVal);
              }}
              className="p-1 h-8 w-8 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="relative">
            <div className="border border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Drop your brand guidelines PDF here, or click to browse
              </p>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleGuidelinesUpload}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Brand Colors */}
      <Card className="p-6">
        <h3 className="font-semibold mb-1">Brand Colors</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Enter your existing brand colors (hex codes).
        </p>
        <div className="space-y-3">
          {(value.brandColors || []).map((color: string, index: number) => (
            <div key={index} className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => updateBrandColor(index, e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border border-border"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => updateBrandColor(index, e.target.value)}
                className="w-28 px-2 py-1 text-sm border border-border rounded bg-background font-mono"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeBrandColor(index)}
                className="p-2 h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {(!value.brandColors || value.brandColors.length < 8) && (
            <Button variant="outline" onClick={addBrandColor} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Color
            </Button>
          )}
        </div>
      </Card>

      {/* Fonts */}
      <Card className="p-6">
        <h3 className="font-semibold mb-1">Fonts</h3>
        <p className="text-sm text-muted-foreground mb-4">
          What fonts does your brand use?
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Primary Font
            </label>
            <input
              type="text"
              placeholder="e.g., Inter, Helvetica, Montserrat"
              value={value.fonts?.primary || ''}
              onChange={(e) =>
                updateField('fonts', { ...(value.fonts || {}), primary: e.target.value })
              }
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Secondary Font
            </label>
            <input
              type="text"
              placeholder="e.g., Roboto, Georgia, Lora"
              value={value.fonts?.secondary || ''}
              onChange={(e) =>
                updateField('fonts', { ...(value.fonts || {}), secondary: e.target.value })
              }
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
