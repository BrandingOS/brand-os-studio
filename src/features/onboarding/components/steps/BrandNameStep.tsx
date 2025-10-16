import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Input } from '@/shared/components/Input';

interface BrandNameStepProps {
  value?: string;
  stepId: string;
}

export function BrandNameStep({ value = '', stepId }: BrandNameStepProps) {
  const { setAnswer } = useOnboardingStore();

  return (
    <div className="space-y-4">
      <Input
        placeholder="e.g., Acme Corp, Moonshot Studios, etc."
        value={value}
        onChange={(e) => setAnswer(stepId, e.target.value)}
        className="text-center text-lg h-12"
        autoFocus
      />
      <p className="text-sm text-muted-foreground text-center">
        This will be used throughout your brand materials
      </p>
    </div>
  );
}