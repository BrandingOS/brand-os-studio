import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Card } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { AIAssistBox, type ParsedField } from '../AIAssistBox';
import { parseBrandBasics } from '../../utils/aiParsers';

interface BrandInfoStepProps {
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

export function BrandInfoStep({ value = {}, stepId }: BrandInfoStepProps) {
  const { setAnswer } = useOnboardingStore();

  const updateField = (field: string, newValue: string) => {
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
        placeholder="Example: We're Acme Corp, a technology company at acme.io. We've been in business for 5 years building developer tools."
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
            <label className="block text-sm font-medium mb-2">Website URL</label>
            <Input
              placeholder="https://example.com"
              value={value.website || ''}
              onChange={(e) => updateField('website', e.target.value)}
              type="url"
            />
            <p className="text-xs text-muted-foreground mt-1">
              We may use this to auto-detect brand colors and fonts in the future.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              placeholder="Briefly describe your business..."
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
