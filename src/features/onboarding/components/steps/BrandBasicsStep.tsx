import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Card } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { AIAssistBox, type ParsedField } from '../AIAssistBox';
import { parseBrandBasics } from '../../utils/aiParsers';

interface BrandBasicsStepProps {
  value?: any;
  stepId: string;
}

const INDUSTRIES = [
  { value: '', label: 'Select your industry' },
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance' },
  { value: 'education', label: 'Education' },
  { value: 'retail', label: 'Retail' },
  { value: 'food-beverage', label: 'Food & Beverage' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'non-profit', label: 'Non-Profit' },
  { value: 'other', label: 'Other' },
];

export function BrandBasicsStep({ value = {}, stepId }: BrandBasicsStepProps) {
  const { setAnswer } = useOnboardingStore();

  const updateField = (field: string, newValue: string) => {
    setAnswer(stepId, { ...value, [field]: newValue });
  };

  const handleAIApply = (fields: ParsedField[]) => {
    const patch: Record<string, any> = {};
    for (const f of fields) {
      // Only set if field is empty or user hasn't touched it
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
        placeholder="Example: We're called Acme, a technology company that builds AI tools for small businesses. Our tagline is 'Smart tools for smart teams'."
        parse={parseBrandBasics}
        onApply={handleAIApply}
      />

      <Card className="p-6">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Brand Name *</label>
            <Input
              placeholder="Enter your brand name"
              value={value.brandName || ''}
              onChange={(e) => updateField('brandName', e.target.value)}
              className="text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Industry</label>
            <select
              value={value.industry || ''}
              onChange={(e) => updateField('industry', e.target.value)}
              className="w-full h-10 px-3 border border-border rounded-md bg-background"
            >
              {INDUSTRIES.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tagline</label>
            <Input
              placeholder="A short phrase that captures your brand"
              value={value.tagline || ''}
              onChange={(e) => updateField('tagline', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              placeholder="Tell us about your business — what you do, who you serve, what makes you unique..."
              value={value.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-md bg-background resize-none"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
