import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Button } from '@/shared/components/Button';

interface AudienceStepProps {
  value?: string;
  stepId: string;
}

const audienceOptions = [
  { value: 'b2b', label: 'Business (B2B)', desc: 'Other businesses and professionals' },
  { value: 'b2c', label: 'Consumers (B2C)', desc: 'Individual customers and end-users' },
  { value: 'startups', label: 'Startups', desc: 'Early-stage companies and entrepreneurs' },
  { value: 'enterprises', label: 'Enterprises', desc: 'Large corporations and organizations' },
  { value: 'creatives', label: 'Creatives', desc: 'Designers, artists, and creative professionals' },
  { value: 'general', label: 'General Public', desc: 'Broad, diverse audience' },
];

export function AudienceStep({ value, stepId }: AudienceStepProps) {
  const { setAnswer } = useOnboardingStore();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {audienceOptions.map((option) => (
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