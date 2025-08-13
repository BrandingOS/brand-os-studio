import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';

interface BusinessGoalsStepProps {
  value?: any;
  stepId: string;
}

const goalOptions = [
  { value: 'brand-awareness', label: 'Increase Brand Awareness', desc: 'Get more people to know about your brand' },
  { value: 'sales-growth', label: 'Drive Sales Growth', desc: 'Increase revenue and customer acquisition' },
  { value: 'market-expansion', label: 'Expand Market Reach', desc: 'Enter new markets or demographics' },
  { value: 'customer-loyalty', label: 'Build Customer Loyalty', desc: 'Strengthen relationships with existing customers' },
  { value: 'premium-positioning', label: 'Premium Positioning', desc: 'Position as a high-value, premium brand' },
  { value: 'differentiation', label: 'Stand Out from Competitors', desc: 'Create unique brand differentiation' },
];

const timeframes = [
  { value: '3-months', label: '3 Months' },
  { value: '6-months', label: '6 Months' },
  { value: '1-year', label: '1 Year' },
  { value: '2-years', label: '2+ Years' },
];

export function BusinessGoalsStep({ value = {}, stepId }: BusinessGoalsStepProps) {
  const { setAnswer } = useOnboardingStore();

  const updateField = (field: string, newValue: any) => {
    setAnswer(stepId, { ...value, [field]: newValue });
  };

  const toggleGoal = (goal: string) => {
    const currentGoals = value.goals || [];
    const isSelected = currentGoals.includes(goal);
    
    if (isSelected) {
      updateField('goals', currentGoals.filter((g: string) => g !== goal));
    } else {
      if (currentGoals.length < 3) {
        updateField('goals', [...currentGoals, goal]);
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Primary Goals */}
      <Card className="p-6">
        <h3 className="font-semibold mb-2">Primary Business Goals</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select up to 3 goals that matter most to your business
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {goalOptions.map((option) => {
            const isSelected = value.goals?.includes(option.value);
            const selectionCount = value.goals?.length || 0;
            const canSelect = selectionCount < 3 || isSelected;

            return (
              <Button
                key={option.value}
                variant={isSelected ? 'default' : 'outline'}
                className={`h-auto p-4 text-left justify-start ${
                  !canSelect ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => canSelect && toggleGoal(option.value)}
                disabled={!canSelect}
              >
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-muted-foreground mt-1">{option.desc}</div>
                </div>
              </Button>
            );
          })}
        </div>
        {value.goals && value.goals.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {value.goals.length}/3 goals selected
          </p>
        )}
      </Card>

      {/* Timeline */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Timeline for Brand Goals</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {timeframes.map((timeframe) => (
            <Button
              key={timeframe.value}
              variant={value.timeframe === timeframe.value ? 'default' : 'outline'}
              onClick={() => updateField('timeframe', timeframe.value)}
            >
              {timeframe.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* Success Metrics */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">How will you measure success?</h3>
        <textarea
          placeholder="Describe the key metrics or outcomes that will indicate your brand goals are being achieved..."
          value={value.successMetrics || ''}
          onChange={(e) => updateField('successMetrics', e.target.value)}
          className="w-full h-24 px-3 py-2 border border-border rounded-md bg-background resize-none"
        />
      </Card>
    </div>
  );
}