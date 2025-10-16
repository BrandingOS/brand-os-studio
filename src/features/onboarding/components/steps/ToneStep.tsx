import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Button } from '@/shared/components/Button';

interface ToneStepProps {
  value?: string;
  stepId: string;
}

const toneOptions = [
  { value: 'professional', label: 'Professional', desc: 'Serious, trustworthy, corporate' },
  { value: 'friendly', label: 'Friendly', desc: 'Warm, approachable, personal' },
  { value: 'modern', label: 'Modern', desc: 'Cutting-edge, innovative, tech-forward' },
  { value: 'elegant', label: 'Elegant', desc: 'Sophisticated, refined, luxury' },
  { value: 'playful', label: 'Playful', desc: 'Fun, energetic, creative' },
  { value: 'minimalist', label: 'Minimalist', desc: 'Clean, simple, focused' },
];

export function ToneStep({ value, stepId }: ToneStepProps) {
  const { setAnswer } = useOnboardingStore();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {toneOptions.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? 'default' : 'outline'}
          className="h-auto p-4 text-left justify-start"
          onClick={() => setAnswer(stepId, option.value)}
        >
          <div>
            <div className="font-medium">{option.label}</div>
            <div className="text-sm text-muted-foreground mt-1">{option.desc}</div>
          </div>
        </Button>
      ))}
    </div>
  );
}