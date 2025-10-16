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
              placeholder="Briefly describe what your company does..."
              value={value.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full h-24 px-3 py-2 border border-border rounded-md bg-background resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Industry
              </label>
              <Input
                placeholder="e.g., Technology, Healthcare"
                value={value.industry || ''}
                onChange={(e) => updateField('industry', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Company Size
              </label>
              <select
                value={value.companySize || ''}
                onChange={(e) => updateField('companySize', e.target.value)}
                className="w-full h-10 px-3 border border-border rounded-md bg-background"
              >
                <option value="">Select size</option>
                <option value="solo">Solo entrepreneur</option>
                <option value="2-10">2-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="200+">200+ employees</option>
              </select>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}