import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';

interface BrandPersonalityStepProps {
  value?: any;
  stepId: string;
}

const toneOptions = [
  { value: 'professional', label: 'Professional', desc: 'Serious, trustworthy, corporate', emoji: '💼' },
  { value: 'friendly', label: 'Friendly', desc: 'Warm, approachable, personal', emoji: '😊' },
  { value: 'modern', label: 'Modern', desc: 'Cutting-edge, innovative, tech-forward', emoji: '🚀' },
  { value: 'elegant', label: 'Elegant', desc: 'Sophisticated, refined, luxury', emoji: '✨' },
  { value: 'playful', label: 'Playful', desc: 'Fun, energetic, creative', emoji: '🎨' },
  { value: 'minimalist', label: 'Minimalist', desc: 'Clean, simple, focused', emoji: '🎯' },
];

const personalityTraits = [
  'Innovative', 'Trustworthy', 'Creative', 'Reliable', 'Bold', 'Caring',
  'Expert', 'Approachable', 'Premium', 'Authentic', 'Dynamic', 'Calm'
];

export function BrandPersonalityStep({ value = {}, stepId }: BrandPersonalityStepProps) {
  const { setAnswer } = useOnboardingStore();

  const updateField = (field: string, newValue: any) => {
    setAnswer(stepId, { ...value, [field]: newValue });
  };

  const toggleTrait = (trait: string) => {
    const currentTraits = value.traits || [];
    const isSelected = currentTraits.includes(trait);
    
    if (isSelected) {
      updateField('traits', currentTraits.filter((t: string) => t !== trait));
    } else {
      if (currentTraits.length < 5) {
        updateField('traits', [...currentTraits, trait]);
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Brand Tone */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Brand Tone *</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {toneOptions.map((option) => (
            <Button
              key={option.value}
              variant={value.tone === option.value ? 'default' : 'outline'}
              className="h-auto p-4 text-left justify-start"
              onClick={() => updateField('tone', option.value)}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{option.emoji}</span>
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-muted-foreground mt-1">{option.desc}</div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </Card>

      {/* Personality Traits */}
      <Card className="p-6">
        <h3 className="font-semibold mb-2">Personality Traits</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select up to 5 traits that best describe your brand
        </p>
        <div className="flex flex-wrap gap-2">
          {personalityTraits.map((trait) => {
            const isSelected = value.traits?.includes(trait);
            const selectionCount = value.traits?.length || 0;
            const canSelect = selectionCount < 5 || isSelected;

            return (
              <Button
                key={trait}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                className={`${!canSelect ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => canSelect && toggleTrait(trait)}
                disabled={!canSelect}
              >
                {trait}
              </Button>
            );
          })}
        </div>
        {value.traits && value.traits.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {value.traits.length}/5 traits selected
          </p>
        )}
      </Card>

      {/* Brand Voice */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Brand Voice</h3>
        <textarea
          placeholder="Describe how your brand communicates. What's your unique voice and messaging style?"
          value={value.voice || ''}
          onChange={(e) => updateField('voice', e.target.value)}
          className="w-full h-24 px-3 py-2 border border-border rounded-md bg-background resize-none"
        />
      </Card>
    </div>
  );
}