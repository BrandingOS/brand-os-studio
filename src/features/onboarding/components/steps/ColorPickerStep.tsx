import { useOnboardingStore } from '@/shared/store/onboardingStore';

interface ColorPickerStepProps {
  value?: string;
  stepId: string;
}

const predefinedColors = [
  '#000000', '#1a1a1a', '#374151', '#6b7280',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

export function ColorPickerStep({ value = '#000000', stepId }: ColorPickerStepProps) {
  const { setAnswer } = useOnboardingStore();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div 
          className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-background shadow-lg"
          style={{ backgroundColor: value }}
        />
        <p className="text-sm text-muted-foreground">Current Color: {value}</p>
      </div>

      <div className="grid grid-cols-6 gap-3">
        {predefinedColors.map((color) => (
          <button
            key={color}
            className={`w-12 h-12 rounded-lg border-2 transition-all hover:scale-110 ${
              value === color ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-border'
            }`}
            style={{ backgroundColor: color }}
            onClick={() => setAnswer(stepId, color)}
            aria-label={`Select color ${color}`}
          />
        ))}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Custom Color</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={value}
            onChange={(e) => setAnswer(stepId, e.target.value)}
            className="w-12 h-10 rounded border border-border"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => setAnswer(stepId, e.target.value)}
            placeholder="#000000"
            className="flex-1 h-10 px-3 border border-border rounded-md bg-background"
          />
        </div>
      </div>
    </div>
  );
}