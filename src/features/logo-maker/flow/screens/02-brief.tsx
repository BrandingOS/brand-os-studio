import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { IndustryPicker } from '../components/IndustryPicker';
import { VibePicker } from '../components/VibePicker';
import { AIAssistSidebar } from '../components/AIAssistSidebar';
import { ProgressIndicator } from '../components/shared/ProgressIndicator';
import { useLogoMakerStore } from '../state/useLogoMakerStore';
import type { CreationMode, Industry, Vibe } from '../state/types';
import {
  DESCRIPTION_MAX_CHARS,
  DESCRIPTION_MIN_CHARS_AI,
  INDUSTRIES,
  MAX_VIBES,
  MIN_VIBES,
  NAME_MAX_CHARS,
  NAME_MIN_CHARS,
  NAME_PATTERN,
  VIBES,
} from '../constants';

const VALID_MODES: CreationMode[] = ['ai', 'wizard', 'canvas', 'upload'];

function buildSchema(mode: CreationMode) {
  const industryValues = INDUSTRIES.map((i) => i.value) as [Industry, ...Industry[]];
  const vibeValues = VIBES.map((v) => v.value) as [Vibe, ...Vibe[]];

  return z.object({
    name: z
      .string()
      .trim()
      .min(NAME_MIN_CHARS, `Name must be at least ${NAME_MIN_CHARS} characters.`)
      .max(NAME_MAX_CHARS, `Name must be ${NAME_MAX_CHARS} characters or fewer.`)
      .regex(NAME_PATTERN, 'Letters, numbers, spaces, and hyphens only.'),
    tagline: z.string().trim().max(120, 'Tagline must be 120 characters or fewer.').optional().or(z.literal('')),
    description:
      mode === 'ai'
        ? z
            .string()
            .trim()
            .min(DESCRIPTION_MIN_CHARS_AI, `AI mode needs at least ${DESCRIPTION_MIN_CHARS_AI} characters of description.`)
            .max(DESCRIPTION_MAX_CHARS, `Max ${DESCRIPTION_MAX_CHARS} characters.`)
        : z.string().trim().max(DESCRIPTION_MAX_CHARS, `Max ${DESCRIPTION_MAX_CHARS} characters.`).optional().or(z.literal('')),
    industry: z.enum(industryValues, { errorMap: () => ({ message: 'Pick an industry.' }) }),
    vibes: z
      .array(z.enum(vibeValues))
      .min(MIN_VIBES, `Pick at least ${MIN_VIBES} vibe.`)
      .max(MAX_VIBES, `Pick up to ${MAX_VIBES} vibes.`),
    competitorUrl: z.string().url('Must be a full URL.').optional().or(z.literal('')),
  });
}

type BriefFormValues = z.infer<ReturnType<typeof buildSchema>>;

export default function BriefScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const modeParam = params.get('mode') as CreationMode | null;

  const storeMode = useLogoMakerStore((s) => s.mode);
  const setMode = useLogoMakerStore((s) => s.setMode);
  const setScreen = useLogoMakerStore((s) => s.setScreen);
  const briefInStore = useLogoMakerStore((s) => s.brief);
  const updateBrief = useLogoMakerStore((s) => s.updateBrief);

  // Resolve the mode once: query param wins, falls back to store, then 'ai'.
  const mode: CreationMode = useMemo(() => {
    if (modeParam && VALID_MODES.includes(modeParam)) return modeParam;
    if (storeMode) return storeMode;
    return 'ai';
  }, [modeParam, storeMode]);

  // Sync the resolved mode back into the store so downstream screens see it.
  useEffect(() => {
    if (mode !== storeMode) setMode(mode);
    setScreen(2);
  }, [mode, storeMode, setMode, setScreen]);

  const schema = useMemo(() => buildSchema(mode), [mode]);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<BriefFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      name: briefInStore.name,
      tagline: briefInStore.tagline,
      description: briefInStore.description,
      industry: briefInStore.industry ?? undefined,
      vibes: briefInStore.vibes,
      competitorUrl: briefInStore.competitorUrl ?? '',
    },
  });

  const description = watch('description') ?? '';
  const competitorUrl = watch('competitorUrl') ?? '';

  const onSubmit = (values: BriefFormValues) => {
    updateBrief({
      name: values.name,
      tagline: values.tagline ?? '',
      description: values.description ?? '',
      industry: values.industry,
      vibes: values.vibes,
      competitorUrl: values.competitorUrl || undefined,
    });
    // Phase 3 will wire /generate. For now route there — it shows its own placeholder.
    navigate('/logo-maker/generate');
  };

  const descLen = description.length;
  const descMinForAI = mode === 'ai' ? DESCRIPTION_MIN_CHARS_AI : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/logo-maker')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <ProgressIndicator step={2} total={6} />
          <div className="w-[78px]" aria-hidden />
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Tell us about your brand</h1>
              <p className="text-muted-foreground">
                {mode === 'ai'
                  ? 'We use this to generate 36 logo concepts tailored to your brand.'
                  : 'The more you share, the smarter our suggestions.'}
              </p>
            </div>

            <Field label="Brand name" required error={errors.name?.message}>
              <Input
                autoFocus
                placeholder="e.g. Lumina"
                maxLength={NAME_MAX_CHARS}
                {...register('name')}
              />
            </Field>

            <Field label="Tagline" hint="Optional. One short line that captures the vibe." error={errors.tagline?.message}>
              <Input placeholder="e.g. Design tools for everyone" maxLength={120} {...register('tagline')} />
            </Field>

            <Field
              label="Description"
              required={mode === 'ai'}
              hint={
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI reads this — specifics matter more than adjectives.
                </span>
              }
              error={errors.description?.message}
            >
              <Textarea
                placeholder="What do you do, who do you serve, what makes you different?"
                rows={5}
                maxLength={DESCRIPTION_MAX_CHARS}
                {...register('description')}
              />
              <div className="flex justify-between mt-1 text-[11px] text-muted-foreground">
                <span>
                  {descMinForAI > 0 && descLen < descMinForAI
                    ? `${descMinForAI - descLen} more characters needed for AI mode`
                    : '\u00A0'}
                </span>
                <span
                  className={cn(
                    'tabular-nums',
                    descLen > DESCRIPTION_MAX_CHARS - 40 && 'text-warning',
                  )}
                >
                  {descLen}/{DESCRIPTION_MAX_CHARS}
                </span>
              </div>
            </Field>

            <Field label="Industry" required error={errors.industry?.message}>
              <Controller
                control={control}
                name="industry"
                render={({ field }) => (
                  <IndustryPicker value={field.value ?? null} onChange={field.onChange} />
                )}
              />
            </Field>

            <Field
              label={`Vibe`}
              required
              hint={`Pick ${MIN_VIBES} to ${MAX_VIBES}.`}
              error={errors.vibes?.message as string | undefined}
            >
              <Controller
                control={control}
                name="vibes"
                render={({ field }) => <VibePicker value={field.value} onChange={field.onChange} />}
              />
            </Field>
          </form>

          <div className="lg:sticky lg:top-[72px] lg:self-start">
            <AIAssistSidebar
              competitorUrl={competitorUrl}
              onCompetitorUrlChange={(url) => setValue('competitorUrl', url, { shouldValidate: true })}
            />
          </div>
        </div>
      </main>

      <footer className="sticky bottom-0 bg-background/80 backdrop-blur border-t border-border">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 py-4">
          <Button variant="ghost" onClick={() => navigate('/logo-maker')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={!isValid}
            className="gap-2"
          >
            {mode === 'ai' ? 'Generate logos' : 'Continue'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
}

interface FieldProps {
  label: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, required, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-1">
        {label}
        {required && <span className="text-destructive text-xs">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
