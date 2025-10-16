import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';

interface MarketPositionStepProps {
  value?: any;
  stepId: string;
}

const positioningOptions = [
  { value: 'premium', label: 'Premium/Luxury', desc: 'High-end, exclusive, premium pricing' },
  { value: 'value', label: 'Value/Affordable', desc: 'Budget-friendly, accessible pricing' },
  { value: 'innovative', label: 'Innovation Leader', desc: 'Cutting-edge, first-to-market' },
  { value: 'reliable', label: 'Trusted/Reliable', desc: 'Dependable, established, stable' },
  { value: 'niche', label: 'Specialized/Niche', desc: 'Expert in specific area or market' },
  { value: 'disruptor', label: 'Market Disruptor', desc: 'Challenging industry norms' },
];

const competitiveAdvantages = [
  'Better Quality', 'Lower Price', 'Superior Service', 'Faster Delivery',
  'More Features', 'Better UX/Design', 'Local Presence', 'Expertise',
  'Innovation', 'Sustainability', 'Personalization', 'Brand Trust'
];

export function MarketPositionStep({ value = {}, stepId }: MarketPositionStepProps) {
  const { setAnswer } = useOnboardingStore();

  const updateField = (field: string, newValue: any) => {
    setAnswer(stepId, { ...value, [field]: newValue });
  };

  const toggleAdvantage = (advantage: string) => {
    const currentAdvantages = value.advantages || [];
    const isSelected = currentAdvantages.includes(advantage);
    
    if (isSelected) {
      updateField('advantages', currentAdvantages.filter((a: string) => a !== advantage));
    } else {
      if (currentAdvantages.length < 4) {
        updateField('advantages', [...currentAdvantages, advantage]);
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Market Position */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Market Position</h3>
        <p className="text-sm text-muted-foreground mb-4">
          How do you position your brand in the market?
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {positioningOptions.map((option) => (
            <Button
              key={option.value}
              variant={value.position === option.value ? 'default' : 'outline'}
              className="h-auto p-4 text-left justify-start"
              onClick={() => updateField('position', option.value)}
            >
              <div>
                <div className="font-medium">{option.label}</div>
                <div className="text-sm text-muted-foreground mt-1">{option.desc}</div>
              </div>
            </Button>
          ))}
        </div>
      </Card>

      {/* Competitive Advantages */}
      <Card className="p-6">
        <h3 className="font-semibold mb-2">Competitive Advantages</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select up to 4 key advantages that set you apart
        </p>
        <div className="flex flex-wrap gap-2">
          {competitiveAdvantages.map((advantage) => {
            const isSelected = value.advantages?.includes(advantage);
            const selectionCount = value.advantages?.length || 0;
            const canSelect = selectionCount < 4 || isSelected;

            return (
              <Button
                key={advantage}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                className={`${!canSelect ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => canSelect && toggleAdvantage(advantage)}
                disabled={!canSelect}
              >
                {advantage}
              </Button>
            );
          })}
        </div>
        {value.advantages && value.advantages.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {value.advantages.length}/4 advantages selected
          </p>
        )}
      </Card>

      {/* Competitors */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Key Competitors</h3>
        <textarea
          placeholder="List your main competitors and briefly describe how you differentiate from them..."
          value={value.competitors || ''}
          onChange={(e) => updateField('competitors', e.target.value)}
          className="w-full h-24 px-3 py-2 border border-border rounded-md bg-background resize-none"
        />
      </Card>
    </div>
  );
}