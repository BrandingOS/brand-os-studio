import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { CheckCircle, Pencil } from 'lucide-react';

interface ReviewStepProps {
  value?: any;
  stepId: string;
}

interface SectionDisplayProps {
  title: string;
  stepIndex: number;
  children: React.ReactNode;
  onEdit: () => void;
}

function SectionDisplay({ title, children, onEdit }: SectionDisplayProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit} className="flex items-center gap-1.5 h-7 text-xs">
          <Pencil className="h-3 w-3" /> Edit
        </Button>
      </div>
      <div className="text-sm space-y-1.5 text-muted-foreground">{children}</div>
    </Card>
  );
}

function Field({ label, value }: { label: string; value?: string | string[] | null }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  const display = Array.isArray(value) ? value.join(', ') : value;
  return (
    <div className="flex flex-col sm:flex-row sm:gap-3">
      <span className="font-medium text-foreground min-w-[140px]">{label}:</span>
      <span>{display}</span>
    </div>
  );
}

export function ReviewStep({ stepId: _stepId }: ReviewStepProps) {
  const { answers, goToStep, steps } = useOnboardingStore();

  const goToStepById = (id: string) => {
    const idx = steps.findIndex((s) => s.id === id);
    if (idx >= 0) goToStep(idx);
  };

  // Gather answers by step id — we look for all step ids that exist in answers
  const basics = answers['brand-basics'] || answers['company-basics'] || {};
  const audience = answers['audience-market'] || answers['target-audience'] || {};
  const personality = answers['brand-personality'] || {};
  const visuals = answers['visual-preferences'] || answers['style-values'] || {};
  const brandInfo = answers['brand-info'] || {};
  const assets = answers['upload-assets'] || answers['logo-assets'] || {};

  // Determine which flow we are in based on which step IDs exist
  const isImportFlow = steps.some((s) => s.id === 'brand-info');

  const basicsStepId = isImportFlow ? 'brand-info' : 'brand-basics';
  const audienceStepId = isImportFlow ? 'brand-profile' : 'audience-market';
  const personalityStepId = 'brand-personality';
  const visualsStepId = isImportFlow ? 'upload-assets' : 'visual-preferences';

  // Merge brand info from import flow
  const mergedBasics = { ...basics, ...brandInfo };

  return (
    <div className="space-y-4">
      <Card className="p-5 border-dashed border-emerald-500/30 bg-emerald-500/[0.03]">
        <p className="text-sm text-muted-foreground">
          Review your brand profile below. Click <strong>Edit</strong> on any section to make
          changes, then come back here to finalize.
        </p>
      </Card>

      {/* Brand Basics */}
      <SectionDisplay
        title="Brand Basics"
        stepIndex={0}
        onEdit={() => goToStepById(basicsStepId)}
      >
        <Field label="Brand Name" value={mergedBasics.brandName} />
        <Field label="Industry" value={mergedBasics.industry} />
        <Field label="Tagline" value={mergedBasics.tagline} />
        <Field label="Website" value={mergedBasics.website} />
        <Field label="Description" value={mergedBasics.description} />
      </SectionDisplay>

      {/* Audience & Market (or Brand Profile for import) */}
      {!isImportFlow && (
        <SectionDisplay
          title="Audience & Market"
          stepIndex={1}
          onEdit={() => goToStepById(audienceStepId)}
        >
          <Field label="Age Range" value={audience.ageRange} />
          <Field label="Gender" value={audience.gender} />
          <Field label="Competitors" value={audience.competitors} />
          <Field label="Market Position" value={audience.pricePoint} />
          <Field label="Notes" value={audience.description} />
        </SectionDisplay>
      )}

      {/* Brand Personality */}
      <SectionDisplay
        title="Brand Personality"
        stepIndex={2}
        onEdit={() => goToStepById(isImportFlow ? 'brand-profile' : personalityStepId)}
      >
        <Field label="Traits" value={personality.traits} />
        <Field label="Tone" value={personality.tone} />
        <Field label="Values" value={personality.values} />
        <Field label="Voice" value={personality.voice} />
      </SectionDisplay>

      {/* Visual / Assets */}
      <SectionDisplay
        title={isImportFlow ? 'Uploaded Assets' : 'Visual Preferences'}
        stepIndex={3}
        onEdit={() => goToStepById(visualsStepId)}
      >
        {!isImportFlow && (
          <>
            <Field label="Color Mood" value={visuals.colorMood} />
            <Field label="Visual Style" value={visuals.visualStyle} />
            <Field label="Custom Colors" value={visuals.customColors} />
            <Field label="Style Notes" value={visuals.styleNotes} />
          </>
        )}
        {isImportFlow && (
          <>
            {assets.primary && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">Primary Logo:</span>
                <span>{assets.primary?.name || 'Uploaded'}</span>
              </div>
            )}
            {Object.keys(assets).filter((k) => k !== 'primary' && assets[k]).length > 0 && (
              <div>
                <span className="font-medium text-foreground">Additional assets: </span>
                <span>
                  {Object.keys(assets)
                    .filter((k) => k !== 'primary' && assets[k])
                    .join(', ')}
                </span>
              </div>
            )}
            <Field label="Brand Colors" value={assets.brandColors} />
            <Field label="Fonts" value={assets.fonts} />
          </>
        )}
      </SectionDisplay>

      {/* Import flow: Brand Profile section */}
      {isImportFlow && (
        <SectionDisplay
          title="Brand Profile"
          stepIndex={2}
          onEdit={() => goToStepById('brand-profile')}
        >
          {(() => {
            const profile = answers['brand-profile'] || {};
            return (
              <>
                <Field label="Traits" value={profile.traits} />
                <Field label="Tone" value={profile.tone} />
                <Field label="Values" value={profile.values} />
                <Field label="Audience" value={profile.audience} />
              </>
            );
          })()}
        </SectionDisplay>
      )}
    </div>
  );
}
