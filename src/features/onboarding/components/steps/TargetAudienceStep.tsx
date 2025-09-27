import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Card } from '@/shared/components/Card';

interface TargetAudienceStepProps {
  value?: any;
  stepId: string;
}

const ageRanges = [
  { value: '18-25', label: '18-25' },
  { value: '26-35', label: '26-35' },
  { value: '36-45', label: '36-45' },
  { value: '46-55', label: '46-55' },
  { value: '55+', label: '55+' },
  { value: 'all-ages', label: 'All Ages' },
];

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'all', label: 'All' },
];

export function TargetAudienceStep({ value = {}, stepId }: TargetAudienceStepProps) {
  const { setAnswer } = useOnboardingStore();

  const updateField = (field: string, newValue: any) => {
    setAnswer(stepId, { ...value, [field]: newValue });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-6">
          {/* Age Range */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Age Range
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ageRanges.map((range) => (
                <button
                  key={range.value}
                  type="button"
                  className={`p-3 text-center border rounded-md transition-colors ${
                    value.ageRange === range.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-muted'
                  }`}
                  onClick={() => updateField('ageRange', range.value)}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Gender
            </label>
            <div className="grid grid-cols-3 gap-3">
              {genderOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`p-3 text-center border rounded-md transition-colors ${
                    value.gender === option.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-muted'
                  }`}
                  onClick={() => updateField('gender', option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audience Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Tell us about your audience
            </label>
            <textarea
              placeholder="Describe your target audience, their interests, behaviors, or any other relevant details..."
              value={value.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full h-24 px-3 py-2 border border-border rounded-md bg-background resize-none"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}