import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Button } from '@/shared/components/Button';

interface TargetAudienceStepProps {
  value?: string[];
  stepId: string;
}

const audienceOptions = [
  { value: 'young-adults', label: 'Young Adults (18-30)', desc: 'Digital natives, early career professionals' },
  { value: 'professionals', label: 'Professionals (25-45)', desc: 'Established career, decision makers' },
  { value: 'families', label: 'Families', desc: 'Parents with children, household decision makers' },
  { value: 'seniors', label: 'Seniors (55+)', desc: 'Experienced, established, value-conscious' },
  { value: 'students', label: 'Students', desc: 'Educational market, budget-conscious' },
  { value: 'entrepreneurs', label: 'Entrepreneurs', desc: 'Business owners, risk-takers, innovators' },
  { value: 'c-suite', label: 'C-Suite Executives', desc: 'Senior leadership, strategic decision makers' },
  { value: 'small-business', label: 'Small Business Owners', desc: 'Independent operators, cost-conscious' },
];

export function TargetAudienceStep({ value = [], stepId }: TargetAudienceStepProps) {
  const { setAnswer } = useOnboardingStore();

  const toggleAudience = (audienceValue: string) => {
    const currentSelection = value || [];
    const isSelected = currentSelection.includes(audienceValue);
    
    if (isSelected) {
      setAnswer(stepId, currentSelection.filter(v => v !== audienceValue));
    } else {
      if (currentSelection.length < 4) {
        setAnswer(stepId, [...currentSelection, audienceValue]);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center text-sm text-muted-foreground">
        Select 2-4 groups that best represent your target audience
      </div>
      
      <div className="grid gap-3 sm:grid-cols-2">
        {audienceOptions.map((option) => {
          const isSelected = value?.includes(option.value);
          const selectionCount = value?.length || 0;
          const canSelect = selectionCount < 4 || isSelected;

          return (
            <Button
              key={option.value}
              variant={isSelected ? 'default' : 'outline'}
              className={`h-auto p-4 text-left justify-start transition-all ${
                !canSelect ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={() => canSelect && toggleAudience(option.value)}
              disabled={!canSelect}
            >
              <div className="w-full">
                <div className="font-medium">{option.label}</div>
                <div className="text-sm text-muted-foreground mt-1">{option.desc}</div>
              </div>
            </Button>
          );
        })}
      </div>

      {value && value.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          {value.length}/4 groups selected
        </div>
      )}
    </div>
  );
}