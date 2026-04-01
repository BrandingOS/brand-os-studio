import { useState, useEffect, useCallback } from 'react';
import { FileText, X, Plus } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { services } from '@/shared/services/registry';
import type { Brand, BrandStrategy } from '@/shared/types/brand';

interface BrandInfoToolProps {
  brandId: string;
}

export function BrandInfoTool({ brandId }: BrandInfoToolProps) {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [vision, setVision] = useState('');
  const [mission, setMission] = useState('');
  const [values, setValues] = useState<string[]>([]);
  const [newValue, setNewValue] = useState('');
  const [tone, setTone] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [positioning, setPositioning] = useState('');

  useEffect(() => {
    loadBrand();
  }, [brandId]);

  const loadBrand = async () => {
    try {
      setIsLoading(true);
      const brandData = await services.brands.getById(brandId);
      setBrand(brandData);

      const strategy = brandData.guidelines?.strategy;
      setVision(strategy?.vision ?? '');
      setMission(strategy?.mission ?? '');
      setValues(strategy?.values ?? []);
      setTone(brandData.tone ?? '');
      setTargetAudience(strategy?.targetAudience ?? brandData.audience ?? '');
      setPositioning(strategy?.positioning ?? '');
    } catch (error) {
      console.error('Failed to load brand:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveStrategy = useCallback(async (overrides: Partial<{
    vision: string;
    mission: string;
    values: string[];
    positioning: string;
    targetAudience: string;
    tone: string;
  }> = {}) => {
    if (!brand) return;

    const updatedStrategy: BrandStrategy = {
      vision: overrides.vision ?? vision,
      mission: overrides.mission ?? mission,
      values: overrides.values ?? values,
      positioning: overrides.positioning ?? positioning,
      personality: brand.guidelines?.strategy?.personality ?? [],
      targetAudience: overrides.targetAudience ?? targetAudience,
    };

    try {
      const updatedBrand = await services.brands.update(brandId, {
        tone: overrides.tone ?? tone,
        audience: overrides.targetAudience ?? targetAudience,
        guidelines: {
          ...brand.guidelines,
          strategy: updatedStrategy,
        },
      });
      setBrand(updatedBrand);
    } catch (error) {
      console.error('Failed to update brand strategy:', error);
    }
  }, [brand, brandId, vision, mission, values, positioning, targetAudience, tone]);

  const addValue = () => {
    const trimmed = newValue.trim();
    if (!trimmed || values.includes(trimmed)) return;

    const updated = [...values, trimmed];
    setValues(updated);
    setNewValue('');
    saveStrategy({ values: updated });
  };

  const removeValue = (index: number) => {
    const updated = values.filter((_, i) => i !== index);
    setValues(updated);
    saveStrategy({ values: updated });
  };

  const handleValueKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addValue();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Brand not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Brand Strategy</h2>
      </div>

      {/* Brand Vision */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Brand Vision</h3>
        <textarea
          className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
          placeholder="What future does your brand aspire to create?"
          value={vision}
          onChange={(e) => setVision(e.target.value)}
          onBlur={() => saveStrategy()}
        />
      </Card>

      {/* Brand Mission */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Brand Mission</h3>
        <textarea
          className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
          placeholder="What is your brand's purpose and how does it serve its audience?"
          value={mission}
          onChange={(e) => setMission(e.target.value)}
          onBlur={() => saveStrategy()}
        />
      </Card>

      {/* Brand Values */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Brand Values</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {values.map((value, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium"
            >
              {value}
              <button
                onClick={() => removeValue(index)}
                className="hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add a value (press Enter or comma)"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={handleValueKeyDown}
            className="flex-1"
          />
          <Button size="sm" variant="outline" onClick={addValue}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Brand Tone */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Brand Tone</h3>
        <Input
          placeholder="e.g. Professional, Friendly, Bold"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          onBlur={() => saveStrategy()}
        />
      </Card>

      {/* Target Audience */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Target Audience</h3>
        <Input
          placeholder="Who is your brand speaking to?"
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          onBlur={() => saveStrategy()}
        />
      </Card>

      {/* Brand Positioning */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Brand Positioning</h3>
        <textarea
          className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
          placeholder="How does your brand differentiate itself in the market?"
          value={positioning}
          onChange={(e) => setPositioning(e.target.value)}
          onBlur={() => saveStrategy()}
        />
      </Card>
    </div>
  );
}
