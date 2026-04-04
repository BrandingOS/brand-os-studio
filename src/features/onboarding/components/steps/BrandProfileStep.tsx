import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Card } from '@/shared/components/Card';
import { AIAssistBox, type ParsedField } from '../AIAssistBox';
import { parseBrandPersonality } from '../../utils/aiParsers';

interface BrandProfileStepProps {
  value?: any;
  stepId: string;
}

const BRAND_TRAITS = [
  'Innovative',
  'Trustworthy',
  'Playful',
  'Professional',
  'Bold',
  'Elegant',
  'Friendly',
  'Authoritative',
];

const TONE_OPTIONS = [
  { value: 'casual', label: 'Casual' },
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'authoritative', label: 'Authoritative' },
  { value: 'playful', label: 'Playful' },
];

export function BrandProfileStep({ value = {}, stepId }: BrandProfileStepProps) {
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

  const handleAIApply = (fields: ParsedField[]) => {
    const patch: Record<string, any> = {};
    for (const f of fields) {
      if (f.key === 'traits' || f.key === 'values') {
        const existing: string[] = value[f.key] || [];
        const incoming = Array.isArray(f.value) ? f.value : [f.value];
        patch[f.key] = [...new Set([...existing, ...incoming])];
      } else if (!value[f.key] || (typeof value[f.key] === 'string' && !value[f.key].trim())) {
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
        placeholder="Example: Our brand is professional and trustworthy. We speak in a friendly, casual tone. We target small business owners and value transparency and quality."
        parse={parseBrandPersonality}
        onApply={handleAIApply}
      />

      <Card className="p-6">
        <div className="space-y-6">
          {/* Personality Traits */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Brand Personality
              <span className="ml-1 text-muted-foreground font-normal">(select multiple)</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {BRAND_TRAITS.map((trait) => (
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

          {/* Tone */}
          <div>
            <label className="block text-sm font-medium mb-3">Voice & Tone</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TONE_OPTIONS.map((option) => (
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

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-medium mb-2">Target Audience</label>
            <textarea
              placeholder="Describe your target audience..."
              value={value.audience || ''}
              onChange={(e) => updateField('audience', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-md bg-background resize-none"
            />
          </div>

          {/* Values */}
          <div>
            <label className="block text-sm font-medium mb-2">Brand Values</label>
            <textarea
              placeholder="What does your brand stand for?"
              value={value.values?.join?.(', ') || value.valuesText || ''}
              onChange={(e) => updateField('valuesText', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-md bg-background resize-none"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
