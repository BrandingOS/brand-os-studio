import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';

interface StyleValuesStepProps {
  value?: any;
  stepId: string;
}

const predefinedColors = [
  '#000000', '#1a1a1a', '#374151', '#6b7280',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'
];

const stylePreferences = [
  { value: 'minimalist', label: 'Minimalist', desc: 'Clean, simple, lots of white space' },
  { value: 'bold', label: 'Bold & Vibrant', desc: 'Strong colors, high contrast' },
  { value: 'elegant', label: 'Elegant & Refined', desc: 'Sophisticated, premium feel' },
  { value: 'modern', label: 'Modern & Tech', desc: 'Contemporary, digital-first' },
  { value: 'classic', label: 'Classic & Traditional', desc: 'Timeless, established look' },
  { value: 'creative', label: 'Creative & Artistic', desc: 'Unique, expressive, artistic' },
];

const coreValues = [
  'Innovation', 'Quality', 'Sustainability', 'Transparency', 'Integrity',
  'Community', 'Excellence', 'Simplicity', 'Inclusivity', 'Authenticity',
  'Growth', 'Collaboration', 'Impact', 'Trust', 'Creativity', 'Heritage'
];

export function StyleValuesStep({ value = {}, stepId }: StyleValuesStepProps) {
  const { setAnswer } = useOnboardingStore();

  const updateField = (field: string, newValue: any) => {
    setAnswer(stepId, { ...value, [field]: newValue });
  };

  const toggleValue = (coreValue: string) => {
    const currentValues = value.coreValues || [];
    const isSelected = currentValues.includes(coreValue);
    
    if (isSelected) {
      updateField('coreValues', currentValues.filter((v: string) => v !== coreValue));
    } else {
      if (currentValues.length < 5) {
        updateField('coreValues', [...currentValues, coreValue]);
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Primary Color */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Primary Brand Color *</h3>
        <div className="text-center mb-6">
          <div 
            className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-background shadow-lg"
            style={{ backgroundColor: value.primaryColor || '#000000' }}
          />
          <p className="text-sm text-muted-foreground">
            Current Color: {value.primaryColor || '#000000'}
          </p>
        </div>

        <div className="grid grid-cols-8 gap-3 mb-6">
          {predefinedColors.map((color) => (
            <button
              key={color}
              className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                value.primaryColor === color ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-border'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => updateField('primaryColor', color)}
              aria-label={`Select color ${color}`}
            />
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Custom Color</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={value.primaryColor || '#000000'}
              onChange={(e) => updateField('primaryColor', e.target.value)}
              className="w-12 h-10 rounded border border-border"
            />
            <input
              type="text"
              value={value.primaryColor || '#000000'}
              onChange={(e) => updateField('primaryColor', e.target.value)}
              placeholder="#000000"
              className="flex-1 h-10 px-3 border border-border rounded-md bg-background"
            />
          </div>
        </div>
      </Card>

      {/* Style Preference */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Visual Style Preference</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {stylePreferences.map((option) => (
            <Button
              key={option.value}
              variant={value.stylePreference === option.value ? 'default' : 'outline'}
              className="h-auto p-4 text-left justify-start"
              onClick={() => updateField('stylePreference', option.value)}
            >
              <div>
                <div className="font-medium">{option.label}</div>
                <div className="text-sm text-muted-foreground mt-1">{option.desc}</div>
              </div>
            </Button>
          ))}
        </div>
      </Card>

      {/* Core Values */}
      <Card className="p-6">
        <h3 className="font-semibold mb-2">Core Values</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select up to 5 values that define your brand
        </p>
        <div className="flex flex-wrap gap-2">
          {coreValues.map((coreValue) => {
            const isSelected = value.coreValues?.includes(coreValue);
            const selectionCount = value.coreValues?.length || 0;
            const canSelect = selectionCount < 5 || isSelected;

            return (
              <Button
                key={coreValue}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                className={`${!canSelect ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => canSelect && toggleValue(coreValue)}
                disabled={!canSelect}
              >
                {coreValue}
              </Button>
            );
          })}
        </div>
        {value.coreValues && value.coreValues.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {value.coreValues.length}/5 values selected
          </p>
        )}
      </Card>
    </div>
  );
}