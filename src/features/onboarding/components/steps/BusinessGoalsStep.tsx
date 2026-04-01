import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Card } from '@/shared/components/Card';

interface BusinessGoalsStepProps {
  value?: any;
  stepId: string;
}

const primaryGoals = [
  'Brand Awareness',
  'Lead Generation',
  'Sales Growth',
  'Customer Retention',
  'Market Expansion',
  'Community Building',
];

const timeframeOptions = [
  { value: '3-months', label: '3 months' },
  { value: '6-months', label: '6 months' },
  { value: '1-year', label: '1 year' },
  { value: '2-plus-years', label: '2+ years' },
];

export function BusinessGoalsStep({ value = {}, stepId }: BusinessGoalsStepProps) {
  const { setAnswer } = useOnboardingStore();

  const updateField = (field: string, newValue: any) => {
    setAnswer(stepId, { ...value, [field]: newValue });
  };

  const toggleGoal = (goal: string) => {
    const current: string[] = value.goals || [];
    const updated = current.includes(goal)
      ? current.filter((g: string) => g !== goal)
      : [...current, goal];
    updateField('goals', updated);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-6">
          {/* Primary Goals */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Primary Goals
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {primaryGoals.map((goal) => (
                <button
                  key={goal}
                  type="button"
                  className={`p-3 text-center border rounded-md transition-colors ${
                    (value.goals || []).includes(goal)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-muted'
                  }`}
                  onClick={() => toggleGoal(goal)}
                >
                  {goal}
                </button>
              ))}
            </div>
          </div>

          {/* Timeframe */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Timeframe
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {timeframeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`p-3 text-center border rounded-md transition-colors ${
                    value.timeframe === option.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-muted'
                  }`}
                  onClick={() => updateField('timeframe', option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Success Metrics */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Success Metrics
            </label>
            <textarea
              placeholder="How will you measure success?"
              value={value.successMetrics || ''}
              onChange={(e) => updateField('successMetrics', e.target.value)}
              className="w-full h-24 px-3 py-2 border border-border rounded-md bg-background resize-none"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
