import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Card } from '@/shared/components/Card';
import { AIAssistBox, type ParsedField } from '../AIAssistBox';
import { parseBrandPersonality } from '../../utils/aiParsers';

interface PersonalityStepProps {
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

const VALUE_OPTIONS = [
  'Quality',
  'Innovation',
  'Sustainability',
  'Integrity',
  'Creativity',
  'Transparency',
  'Reliability',
  'Excellence',
  'Community',
  'Trust',
];

export function PersonalityStep({ value = {}, stepId }: PersonalityStepProps) {
  const { setAnswer } = useOnboardingStore();

  const updateField = (field: string, newValue: any) => {
    setAnswer(stepId, { ...value, [field]: newValue });
  };

  const toggleItem = (field: string, item: string) => {
    const current: string[] = value[field] || [];
    const updated = current.includes(item)
      ? current.filter((t: string) => t !== item)
      : [...current, item];
    updateField(field, updated);
  };

  const handleAIApply = (fields: ParsedField[]) => {
    const patch: Record<string, any> = {};
    for (const f of fields) {
      if (f.key === 'traits' || f.key === 'values') {
        // Merge arrays
        const existing: string[] = value[f.key] || [];
        const incoming = Array.isArray(f.value) ? f.value : [f.value];
        const merged = [...new Set([...existing, ...incoming])];
        patch[f.key] = merged;
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
        placeholder="Example: We want to be seen as innovative and trustworthy, with a friendly casual tone. Our core values are quality, sustainability, and transparency."
        parse={parseBrandPersonality}
        onApply={handleAIApply}
      />

      <Card className="p-6">
        <div className="space-y-6">
          {/* Brand Traits */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Personality Traits
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
                  onClick={() => toggleItem('traits', trait)}
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

          {/* Values */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Brand Values
              <span className="ml-1 text-muted-foreground font-normal">(select multiple)</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {VALUE_OPTIONS.map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`p-3 text-center border rounded-md transition-colors text-sm ${
                    (value.values || []).includes(val)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-muted'
                  }`}
                  onClick={() => toggleItem('values', val)}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Brand Voice */}
          <div>
            <label className="block text-sm font-medium mb-2">Brand Voice Description</label>
            <textarea
              placeholder="Describe how your brand communicates — its attitude, style, and personality in words..."
              value={value.voice || ''}
              onChange={(e) => updateField('voice', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-md bg-background resize-none"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
