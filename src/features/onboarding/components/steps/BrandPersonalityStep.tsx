import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Card } from '@/shared/components/Card';

interface BrandPersonalityStepProps {
  value?: any;
  stepId: string;
}

const brandTraits = [
  'Innovative',
  'Trustworthy',
  'Playful',
  'Professional',
  'Bold',
  'Elegant',
  'Friendly',
  'Authoritative',
];

const toneOptions = [
  { value: 'casual', label: 'Casual' },
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'authoritative', label: 'Authoritative' },
  { value: 'playful', label: 'Playful' },
];

export function BrandPersonalityStep({ value = {}, stepId }: BrandPersonalityStepProps) {
  const { setAnswer } = useOnboardingStore();

  const updateField = (field: string, newValue: any) => {
    setAnswer(stepId, { ...value, [field]: newValue });
  };

  const toggleTrait = (trait: string) => {
    const current: string[] = value.traits || [];
    const updated = current.includes(trait)
      ? current.filter((t: string) => t !== trait)
      : [...current, trait];
    updateField('traits', updated);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-6">
          {/* Brand Traits */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Brand Traits
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {brandTraits.map((trait) => (
                <button
                  key={trait}
                  type="button"
                  className={`p-3 text-center border rounded-md transition-colors ${
                    (value.traits || []).includes(trait)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-muted'
                  }`}
                  onClick={() => toggleTrait(trait)}
                >
                  {trait}
                </button>
              ))}
            </div>
          </div>

          {/* Brand Voice */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Brand Voice
            </label>
            <textarea
              placeholder="Describe how your brand speaks..."
              value={value.voice || ''}
              onChange={(e) => updateField('voice', e.target.value)}
              className="w-full h-24 px-3 py-2 border border-border rounded-md bg-background resize-none"
            />
          </div>

          {/* Personality Tone */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Personality Tone
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {toneOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`p-3 text-center border rounded-md transition-colors ${
                    value.tone === option.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-muted'
                  }`}
                  onClick={() => updateField('tone', option.value)}
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
