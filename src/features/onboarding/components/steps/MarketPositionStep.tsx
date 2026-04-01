import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Card } from '@/shared/components/Card';

interface MarketPositionStepProps {
  value?: any;
  stepId: string;
}

const pricePointOptions = [
  { value: 'budget', label: 'Budget' },
  { value: 'mid-range', label: 'Mid-range' },
  { value: 'premium', label: 'Premium' },
  { value: 'luxury', label: 'Luxury' },
];

export function MarketPositionStep({ value = {}, stepId }: MarketPositionStepProps) {
  const { setAnswer } = useOnboardingStore();

  const updateField = (field: string, newValue: any) => {
    setAnswer(stepId, { ...value, [field]: newValue });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-6">
          {/* Industry */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Industry
            </label>
            <input
              type="text"
              placeholder="Your industry or niche"
              value={value.industry || ''}
              onChange={(e) => updateField('industry', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            />
          </div>

          {/* Main Competitors */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Main Competitors
            </label>
            <textarea
              placeholder="List your top competitors"
              value={value.competitors || ''}
              onChange={(e) => updateField('competitors', e.target.value)}
              className="w-full h-24 px-3 py-2 border border-border rounded-md bg-background resize-none"
            />
          </div>

          {/* Unique Value Proposition */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Unique Value Proposition
            </label>
            <textarea
              placeholder="What makes you different?"
              value={value.valueProposition || ''}
              onChange={(e) => updateField('valueProposition', e.target.value)}
              className="w-full h-24 px-3 py-2 border border-border rounded-md bg-background resize-none"
            />
          </div>

          {/* Target Price Point */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Target Price Point
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {pricePointOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`p-3 text-center border rounded-md transition-colors ${
                    value.pricePoint === option.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-muted'
                  }`}
                  onClick={() => updateField('pricePoint', option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
