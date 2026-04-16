import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';
import logoPrimaryExample from '@/assets/onboarding/logo-primary-example.png';
import logoBlackExample from '@/assets/onboarding/logo-black-example.png';
import logoWhiteExample from '@/assets/onboarding/logo-white-example.png';
import logoVerticalExample from '@/assets/onboarding/logo-vertical-example.png';
import logoIconExample from '@/assets/onboarding/logo-icon-example.png';
import logoHorizontalExample from '@/assets/onboarding/logo-horizontal-example.png';

interface LogoAssetsStepProps {
  value?: any;
  stepId: string;
}

const logoTypes = [
  {
    key: 'primary',
    label: 'Primary Logo',
    description: 'Your main logo that will be used most frequently',
    required: true,
    guide: 'Upload your main brand logo. This should be your most recognizable logo version.',
    example: logoPrimaryExample,
    isPrimary: true,
  },
  {
    key: 'black',
    label: 'Black Logo',
    description: 'Dark version for light backgrounds',
    required: false,
    guide: 'A black or dark version of your logo for use on light backgrounds.',
    example: logoBlackExample,
    isPrimary: false,
  },
  {
    key: 'white',
    label: 'White Logo',
    description: 'Light version for dark backgrounds',
    required: false,
    guide: 'A white or light version of your logo for use on dark backgrounds.',
    example: logoWhiteExample,
    isPrimary: false,
  },
  {
    key: 'vertical',
    label: 'Vertical Logo',
    description: 'Stacked or vertical layout version',
    required: false,
    guide: 'A vertical or stacked version of your logo for tall, narrow spaces.',
    example: logoVerticalExample,
    isPrimary: false,
  },
  {
    key: 'icon',
    label: 'Logo Icon/Mark',
    description: 'Just the symbol or icon part',
    required: false,
    guide: 'The icon or symbol part of your logo without text, for use as a favicon or app icon.',
    example: logoIconExample,
    isPrimary: false,
  },
  {
    key: 'horizontal',
    label: 'Horizontal Logo',
    description: 'Wide layout version',
    required: false,
    guide: 'A horizontal version of your logo for wide spaces like headers.',
    example: logoHorizontalExample,
    isPrimary: false,
  },
];

export function LogoAssetsStep({ value = {}, stepId }: LogoAssetsStepProps) {
  const { setAnswer } = useOnboardingStore();
  const [dragOver, setDragOver] = useState<string | null>(null);

  // Compress to a data URL so previews persist across steps and the
  // final brand-creation flow can reuse the bytes without re-reading.
  const acceptFile = async (logoType: string, file: File) => {
    if (!file.type.startsWith('image/')) return;
    const { compressLogo } = await import('@/shared/utils/imageUpload');
    const url = await compressLogo(file).catch(() => '');
    if (!url) return;
    setAnswer(stepId, {
      ...value,
      [logoType]: { file, url, name: file.name, size: file.size },
    });
  };

  const handleFileUpload = (logoType: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void acceptFile(logoType, file);
  };

  const handleRemove = (logoType: string) => {
    const newValue = { ...value };
    delete newValue[logoType];
    setAnswer(stepId, newValue);
  };

  const handleDrop = (logoType: string, event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(null);
    const file = event.dataTransfer.files?.[0];
    if (file) void acceptFile(logoType, file);
  };

  const primaryLogo = logoTypes.find(type => type.isPrimary);
  const otherLogos = logoTypes.filter(type => !type.isPrimary);

  return (
    <div className="space-y-8">
      {/* Primary Logo - Emphasized */}
      {primaryLogo && (
        <Card className="p-6 border-2 border-primary/20 bg-primary/5">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-primary mb-2">{primaryLogo.label}</h3>
            <p className="text-sm text-muted-foreground">{primaryLogo.guide}</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 items-center">
            {/* Example */}
            <div className="flex-shrink-0">
              <div className="text-xs text-muted-foreground mb-2 text-center">Example:</div>
              <div className="w-48 h-24 bg-muted rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <img 
                  src={primaryLogo.example}
                  alt="Primary logo example"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>

            {/* Upload Area */}
            <div className="flex-1 w-full">
              {value[primaryLogo.key] ? (
                <div className="relative border-2 border-dashed border-primary/30 rounded-lg p-6 bg-background">
                  <div className="flex items-center gap-4">
                    <img
                      src={value[primaryLogo.key].url}
                      alt="Uploaded logo"
                      className="w-20 h-20 object-contain border rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{value[primaryLogo.key].name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(value[primaryLogo.key].size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemove(primaryLogo.key)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragOver === primaryLogo.key
                      ? 'border-primary bg-primary/5'
                      : 'border-primary/30 hover:border-primary/50'
                  }`}
                  onDrop={(e) => handleDrop(primaryLogo.key, e)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(primaryLogo.key);
                  }}
                  onDragLeave={() => setDragOver(null)}
                >
                  <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Upload Your Primary Logo</p>
                    <p className="text-xs text-muted-foreground">
                      Drag & drop or click to browse
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => handleFileUpload(primaryLogo.key, e)}
                  />
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Other Logo Assets */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Additional Logo Assets</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Upload variations of your logo for different use cases (optional)
        </p>
        
        <div className="grid gap-6 md:grid-cols-2">
          {otherLogos.map((logoType) => (
            <div key={logoType.key} className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-16 h-12 bg-muted rounded border flex items-center justify-center overflow-hidden">
                    <img 
                      src={logoType.example}
                      alt={`${logoType.label} example`}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 text-center">Example</div>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{logoType.label}</h4>
                  <p className="text-xs text-muted-foreground">{logoType.description}</p>
                </div>
              </div>

              {value[logoType.key] ? (
                <div className="border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-center gap-3">
                    <img
                      src={value[logoType.key].url}
                      alt="Uploaded logo"
                      className="w-12 h-12 object-contain border rounded bg-background"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{value[logoType.key].name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(value[logoType.key].size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemove(logoType.key)}
                      className="p-1 h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div
                    className={`border border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                      dragOver === logoType.key
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onDrop={(e) => handleDrop(logoType.key, e)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(logoType.key);
                    }}
                    onDragLeave={() => setDragOver(null)}
                  >
                    <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">Drop file or click to upload</p>
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => handleFileUpload(logoType.key, e)}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
