import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Card } from '@/shared/components/Card';
import { ColorPicker } from '@/components/ui/color-picker';
import { Button } from '@/shared/components/Button';
import { Trash2, Plus } from 'lucide-react';
import styleMinimalist from '@/assets/onboarding/style-minimalist.png';
import styleModern from '@/assets/onboarding/style-modern.png';
import stylePlayful from '@/assets/onboarding/style-playful.png';
import styleElegant from '@/assets/onboarding/style-elegant.png';
import styleBold from '@/assets/onboarding/style-bold.png';
import styleOrganic from '@/assets/onboarding/style-organic.png';

interface StyleValuesStepProps {
  value?: any;
  stepId: string;
}

const predefinedPalettes = [
  {
    name: 'Ocean Blue',
    colors: ['#0ea5e9', '#0284c7', '#0369a1', '#075985'],
  },
  {
    name: 'Forest Green',
    colors: ['#059669', '#047857', '#065f46', '#064e3b'],
  },
  {
    name: 'Sunset Orange',
    colors: ['#ea580c', '#dc2626', '#b91c1c', '#991b1b'],
  },
  {
    name: 'Royal Purple',
    colors: ['#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'],
  },
  {
    name: 'Elegant Gray',
    colors: ['#374151', '#4b5563', '#6b7280', '#9ca3af'],
  },
  {
    name: 'Modern Pink',
    colors: ['#ec4899', '#db2777', '#be185d', '#9d174d'],
  },
];

const visualStyles = [
  {
    value: 'minimalist',
    label: 'Minimalist',
    desc: 'Clean, simple, lots of white space',
    image: styleMinimalist,
  },
  {
    value: 'modern',
    label: 'Modern',
    desc: 'Contemporary, sleek, geometric',
    image: styleModern,
  },
  {
    value: 'playful',
    label: 'Playful',
    desc: 'Fun, colorful, energetic',
    image: stylePlayful,
  },
  {
    value: 'elegant',
    label: 'Elegant',
    desc: 'Sophisticated, refined, luxury',
    image: styleElegant,
  },
  {
    value: 'bold',
    label: 'Bold',
    desc: 'Strong, impactful, dynamic',
    image: styleBold,
  },
  {
    value: 'organic',
    label: 'Organic',
    desc: 'Natural, flowing, organic shapes',
    image: styleOrganic,
  },
];

export function StyleValuesStep({ value = {}, stepId }: StyleValuesStepProps) {
  const { setAnswer } = useOnboardingStore();

  const updateField = (field: string, newValue: any) => {
    setAnswer(stepId, { ...value, [field]: newValue });
  };

  const addCustomColor = () => {
    const customColors = value.customColors || [];
    if (customColors.length < 5) {
      updateField('customColors', [...customColors, '#000000']);
    }
  };

  const updateCustomColor = (index: number, color: string) => {
    const customColors = [...(value.customColors || [])];
    customColors[index] = color;
    updateField('customColors', customColors);
  };

  const removeCustomColor = (index: number) => {
    const customColors = [...(value.customColors || [])];
    customColors.splice(index, 1);
    updateField('customColors', customColors);
  };

  return (
    <div className="space-y-8">
      {/* Already Have Colors Section */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Already Have Your Colors?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Add your brand colors one by one (up to 5 colors)
        </p>
        
        <div className="space-y-3">
          {(value.customColors || []).map((color: string, index: number) => (
            <div key={index} className="flex items-center gap-3">
              <ColorPicker
                value={color}
                onChange={(newColor) => updateCustomColor(index, newColor)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeCustomColor(index)}
                className="p-2 h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          {(!value.customColors || value.customColors.length < 5) && (
            <Button
              variant="outline"
              onClick={addCustomColor}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Color
            </Button>
          )}
        </div>
      </Card>

      {/* Color Palette Options */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Or Choose a Color Palette</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {predefinedPalettes.map((palette) => (
            <button
              key={palette.name}
              type="button"
              className={`p-4 border rounded-lg text-left transition-colors ${
                value.selectedPalette === palette.name
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted'
              }`}
              onClick={() => updateField('selectedPalette', palette.name)}
            >
              <div className="font-medium mb-2">{palette.name}</div>
              <div className="flex gap-1">
                {palette.colors.map((color, index) => (
                  <div
                    key={index}
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Visual Style Reference */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Visual Style Reference</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visualStyles.map((style) => (
            <button
              key={style.value}
              type="button"
              className={`p-4 border rounded-lg text-left transition-colors ${
                value.visualStyle === style.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted'
              }`}
              onClick={() => updateField('visualStyle', style.value)}
            >
              <div className="aspect-[3/2] bg-muted rounded mb-3 overflow-hidden">
                <img 
                  src={style.image} 
                  alt={style.label}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="font-medium">{style.label}</div>
              <div className="text-sm text-muted-foreground mt-1">{style.desc}</div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}