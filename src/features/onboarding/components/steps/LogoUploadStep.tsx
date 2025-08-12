import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Button } from '@/shared/components/Button';
import { Upload, X } from 'lucide-react';

interface LogoUploadStepProps {
  value?: string;
  stepId: string;
}

export function LogoUploadStep({ value, stepId }: LogoUploadStepProps) {
  const { setAnswer } = useOnboardingStore();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real app, upload to storage service
      const url = URL.createObjectURL(file);
      setAnswer(stepId, url);
    }
  };

  const handleRemove = () => {
    setAnswer(stepId, undefined);
  };

  return (
    <div className="space-y-6">
      {value ? (
        <div className="text-center">
          <div className="relative inline-block">
            <img
              src={value}
              alt="Uploaded logo"
              className="h-24 w-24 object-contain mx-auto border border-border rounded-lg"
            />
            <Button
              size="icon"
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">
            Upload your logo (PNG, JPG, SVG)
          </p>
          <Button variant="outline" asChild>
            <label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              Choose File
            </label>
          </Button>
        </div>
      )}
      
      <p className="text-sm text-muted-foreground text-center">
        Don't have a logo? Skip this step and we'll help you create one later.
      </p>
    </div>
  );
}