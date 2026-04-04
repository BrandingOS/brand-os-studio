import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Card } from '@/shared/components/Card';
import { AIAssistBox, type ParsedField } from '../AIAssistBox';
import { parseAudienceMarket } from '../../utils/aiParsers';

interface AudienceMarketStepProps {
  value?: any;
  stepId: string;
}

const AGE_RANGES = [
  { value: '18-25', label: '18-25' },
  { value: '26-35', label: '26-35' },
  { value: '36-45', label: '36-45' },
  { value: '46-55', label: '46-55' },
  { value: '55+', label: '55+' },
  { value: 'all-ages', label: 'All Ages' },
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'all', label: 'All' },
];

const PRICE_POINTS = [
  { value: 'budget', label: 'Budget' },
  { value: 'mid-range', label: 'Mid-range' },
  { value: 'premium', label: 'Premium' },
  { value: 'luxury', label: 'Luxury' },
];

export function AudienceMarketStep({ value = {}, stepId }: AudienceMarketStepProps) {
  const { setAnswer } = useOnboardingStore();

  const updateField = (field: string, newValue: any) => {
    setAnswer(stepId, { ...value, [field]: newValue });
  };

  const handleAIApply = (fields: ParsedField[]) => {
    const patch: Record<string, any> = {};
    for (const f of fields) {
      if (!value[f.key] || (typeof value[f.key] === 'string' && !value[f.key].trim())) {
        patch[f.key] = Array.isArray(f.value) ? f.value.join(', ') : f.value;
      }
    }
    if (Object.keys(patch).length > 0) {
      setAnswer(stepId, { ...value, ...patch });
    }
  };

  return (
    <div className="space-y-4">
      <AIAssistBox
        placeholder="Example: We target young professionals aged 25-35, mostly women, in the premium skincare market. Our main competitors are Glossier and The Ordinary."
        parse={parseAudienceMarket}
        onApply={handleAIApply}
      />

      <Card className="p-6">
        <div className="space-y-6">
          {/* Age Range */}
          <div>
            <label className="block text-sm font-medium mb-3">Target Age Range</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {AGE_RANGES.map((range) => (
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
            <label className="block text-sm font-medium mb-3">Target Gender</label>
            <div className="grid grid-cols-3 gap-3">
              {GENDER_OPTIONS.map((option) => (
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

          {/* Competitors */}
          <div>
            <label className="block text-sm font-medium mb-2">Main Competitors</label>
            <textarea
              placeholder="List your top competitors..."
              value={value.competitors || ''}
              onChange={(e) => updateField('competitors', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-md bg-background resize-none"
            />
          </div>

          {/* Market Position */}
          <div>
            <label className="block text-sm font-medium mb-3">Market Position</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PRICE_POINTS.map((option) => (
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

          {/* Audience description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Tell us more about your audience
            </label>
            <textarea
              placeholder="Describe your target audience, their interests, behaviors, or any other details..."
              value={value.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-md bg-background resize-none"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
