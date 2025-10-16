import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Input } from '@/shared/components/Input';
import { Card } from '@/shared/components/Card';

interface CompanyBasicsStepProps {
  value?: any;
  stepId: string;
}

export function CompanyBasicsStep({ value = {}, stepId }: CompanyBasicsStepProps) {
  const { setAnswer } = useOnboardingStore();

  const updateField = (field: string, newValue: string) => {
    setAnswer(stepId, { ...value, [field]: newValue });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Brand Name *
            </label>
            <Input
              placeholder="Enter your brand name"
              value={value.brandName || ''}
              onChange={(e) => updateField('brandName', e.target.value)}
              className="text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Company Description
            </label>
            <textarea
              placeholder="Tell us whatever you want! At any way and language!"
              value={value.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full h-24 px-3 py-2 border border-border rounded-md bg-background resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Industry
            </label>
            <select
              value={value.industry || ''}
              onChange={(e) => updateField('industry', e.target.value)}
              className="w-full h-10 px-3 border border-border rounded-md bg-background"
            >
              <option value="">Select your industry</option>
              <option value="technology">Technology</option>
              <option value="healthcare">Healthcare</option>
              <option value="finance">Finance</option>
              <option value="education">Education</option>
              <option value="retail">Retail</option>
              <option value="food-beverage">Food & Beverage</option>
              <option value="real-estate">Real Estate</option>
              <option value="consulting">Consulting</option>
              <option value="marketing">Marketing</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="entertainment">Entertainment</option>
              <option value="non-profit">Non-Profit</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </Card>
    </div>
  );
}