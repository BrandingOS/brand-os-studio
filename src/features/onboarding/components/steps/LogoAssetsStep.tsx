import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Upload, X, HelpCircle } from 'lucide-react';

interface LogoAssetsStepProps {
  value?: any;
  stepId: string;
}

const logoTypes = [
  {
    key: 'primaryLogo',
    label: 'Primary Logo',
    description: 'Main logo used across all brand materials',
    required: true,
    guide: 'Your main brand identifier - usually includes both text and symbol'
  },
  {
    key: 'blackLogo',
    label: 'Black Primary Logo',
    description: 'Black version for light backgrounds',
    required: false,
    guide: 'Single-color version for monochrome applications'
  },
  {
    key: 'whiteLogo',
    label: 'White Primary Logo',
    description: 'White version for dark backgrounds',
    required: false,
    guide: 'For use on dark or colored backgrounds'
  },
  {
    key: 'verticalLogo',
    label: 'Vertical Logo',
    description: 'Stacked version of your logo',
    required: false,
    guide: 'When horizontal space is limited (business cards, mobile apps)'
  },
  {
    key: 'logomark',
    label: 'Logomark',
    description: 'Symbol/icon only (no text)',
    required: false,
    guide: 'Standalone symbol - recognizable without company name'
  },
  {
    key: 'wordmark',
    label: 'Wordmark',
    description: 'Text/company name only',
    required: false,
    guide: 'Company name in branded typography without symbol'
  },
  {
    key: 'blackLogomark',
    label: 'Black Logomark',
    description: 'Black version of symbol only',
    required: false,
    guide: 'Single-color version of your symbol for various applications'
  },
  {
    key: 'whiteLogomark',
    label: 'White Logomark',
    description: 'White version of symbol only',
    required: false,
    guide: 'For use on dark backgrounds or overlay applications'
  },
];

export function LogoAssetsStep({ value = {}, stepId }: LogoAssetsStepProps) {
  const { setAnswer } = useOnboardingStore();

  const handleFileUpload = (logoType: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real app, upload to storage service
      const url = URL.createObjectURL(file);
      setAnswer(stepId, { ...value, [logoType]: url });
    }
  };

  const handleRemove = (logoType: string) => {
    const newValue = { ...value };
    delete newValue[logoType];
    setAnswer(stepId, newValue);
  };

  return (
    <div className="space-y-6">
      <div className="text-center text-sm text-muted-foreground mb-6">
        Upload your brand assets. Don't have all variations? No problem - skip what you don't have and we'll help you create them later.
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {logoTypes.map((logoType) => (
          <Card key={logoType.key} className="p-4">
            <div className="flex items-start gap-2 mb-3">
              <div className="flex-1">
                <h4 className="font-medium text-sm">
                  {logoType.label}
                  {logoType.required && <span className="text-red-500 ml-1">*</span>}
                </h4>
                <p className="text-xs text-muted-foreground">{logoType.description}</p>
              </div>
              <div className="group relative">
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                <div className="absolute right-0 top-6 w-48 p-2 bg-popover border border-border rounded-md shadow-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {logoType.guide}
                </div>
              </div>
            </div>

            {value[logoType.key] ? (
              <div className="relative">
                <img
                  src={value[logoType.key]}
                  alt={logoType.label}
                  className="w-full h-24 object-contain bg-muted rounded border"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={() => handleRemove(logoType.key)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground mb-3">
                  PNG, JPG, SVG up to 10MB
                </p>
                <Button variant="outline" size="sm" asChild>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(logoType.key, e)}
                      className="hidden"
                    />
                    Choose File
                  </label>
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="p-4 bg-muted/50">
        <div className="text-center">
          <h4 className="font-medium text-sm mb-2">Need help with logo variations?</h4>
          <p className="text-xs text-muted-foreground mb-3">
            Our AI can help generate missing logo variations from your primary logo after setup.
          </p>
          <Button variant="outline" size="sm" disabled>
            Generate Variations (Coming Soon)
          </Button>
        </div>
      </Card>
    </div>
  );
}