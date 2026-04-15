/**
 * Brand Consistency Studio
 * ─────────────────────────────────────────────────────────────────────────
 * The user-facing page for the AI Brand Consistency Generation feature.
 *
 * Flow:
 *   1. Brand summary card shows the EXACT token system that will be used.
 *   2. The user writes an optional campaign brief and tone variant.
 *   3. The user picks any subset of output types.
 *   4. Generate button kicks the orchestrator. Each output renders live
 *      in its template, with regenerate / download / delete per card.
 *
 * Persistence is per-brand via `IBrandConsistencyService` (localStorage
 * today — Supabase later behind the same interface).
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { useBrandPageConfig } from '@/shared/layouts/brandPageConfig';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Wand2, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { useService } from '@/core/hooks/useService';
import { SERVICE_KEYS } from '@/core/types/services';

import { resolveBrandTokens } from '../engine/brandTokens';
import { OUTPUT_SPECS, type OutputTypeId, OUTPUT_SPEC_LIST } from '../registry/outputSpecs';
import { BrandConsistencyOrchestrator } from '../engine/orchestrator';
import { AnthropicConsistencyProvider } from '../providers/anthropicProvider';
import type { GeneratedOutput, IBrandConsistencyService } from '../services/types';
import { OutputTypePicker } from './OutputTypePicker';
import { OutputCard } from './OutputCard';
import { BrandTokenSummary } from './BrandTokenSummary';

const DEFAULT_SELECTION: OutputTypeId[] = [
  'social_post_square',
  'website_hero',
  'guideline_cover',
  'mockup_business_card',
  'presentation_slide',
];

export default function ConsistencyStudioPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand, isLoading, error } = useBrandBySlug(slug);
  const storage = useService<IBrandConsistencyService>(SERVICE_KEYS.BRAND_CONSISTENCY);

  useBrandPageConfig({ brandName: brand?.name });

  const [brief, setBrief] = useState('');
  const [toneVariant, setToneVariant] = useState('');
  const [selected, setSelected] = useState<Set<OutputTypeId>>(() => new Set(DEFAULT_SELECTION));
  const [outputs, setOutputs] = useState<GeneratedOutput[]>([]);
  const [generating, setGenerating] = useState(false);

  const provider = useMemo(() => new AnthropicConsistencyProvider(), []);
  const orchestrator = useMemo(
    () => new BrandConsistencyOrchestrator(provider, storage),
    [provider, storage],
  );

  // Load persisted outputs for this brand.
  useEffect(() => {
    if (!brand?.id) return;
    storage.list(brand.id).then(setOutputs).catch((err) => {
      console.warn('Failed to load outputs', err);
    });
  }, [brand?.id, storage]);

  // Subscribe to orchestrator events for live status streaming.
  useEffect(() => {
    return orchestrator.on((event) => {
      setOutputs((prev) => {
        const idx = prev.findIndex((o) => o.id === event.output.id);
        if (idx === -1) return [event.output, ...prev];
        const next = [...prev];
        next[idx] = event.output;
        return next;
      });
    });
  }, [orchestrator]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (error || !brand) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">{error ?? 'Brand not found.'}</p>
      </div>
    );
  }

  const tokens = resolveBrandTokens(brand);
  const isAIConfigured = provider.available;

  const toggle = (id: OutputTypeId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (selected.size === 0) {
      toast.error('Pick at least one output type');
      return;
    }
    if (!brand.primaryColor) {
      toast.error('Set a primary color in Brand Setup before generating');
      return;
    }
    setGenerating(true);
    try {
      await orchestrator.generate({
        brand,
        outputs: Array.from(selected),
        campaignBrief: brief.trim() || undefined,
        toneVariant: toneVariant.trim() || undefined,
      });
      toast.success(`Generated ${selected.size} ${selected.size === 1 ? 'output' : 'outputs'}`);
    } catch (err) {
      console.error(err);
      toast.error('Generation failed — see console');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async (output: GeneratedOutput) => {
    try {
      await orchestrator.regenerate(brand, output, { brief, toneVariant });
    } catch (err) {
      console.error(err);
      toast.error('Regenerate failed');
    }
  };

  const handleDelete = async (output: GeneratedOutput) => {
    await storage.delete(brand.id, output.id);
    setOutputs((prev) => prev.filter((o) => o.id !== output.id));
  };

  const handleClearAll = async () => {
    if (outputs.length === 0) return;
    if (!confirm(`Delete all ${outputs.length} generated outputs for this brand?`)) return;
    await storage.clear(brand.id);
    setOutputs([]);
  };

  const sortedOutputs = [...outputs].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="space-y-6">
      <PageHeader
        compact
        title="AI Consistency Studio"
        actions={
          <>
            {outputs.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearAll}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear all
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          One brand. Every surface.
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate a complete branded ecosystem from <span className="font-semibold text-foreground">{brand.name}</span> — every output renders inside the same token system, so they all belong to the same identity.
        </p>
      </div>

      <BrandTokenSummary tokens={tokens} isAIConfigured={isAIConfigured} />

      {tokens.completeness.score < 0.5 && (
        <Card className="p-4 border-yellow-500/40 bg-yellow-50/60 dark:bg-yellow-950/20">
          <div className="flex gap-3">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <div className="font-medium">Brand data is thin</div>
              <div className="text-muted-foreground text-xs mt-0.5">
                Outputs will render with sensible defaults, but quality jumps when you fill in: {tokens.completeness.missing.join(', ')}.
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="p-5">
          <div className="text-sm font-semibold mb-3">Direction (optional)</div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="brief" className="text-xs">Campaign brief</Label>
              <Textarea
                id="brief"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="e.g. Spring product launch focused on speed and reliability."
                rows={3}
                className="text-sm resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tone" className="text-xs">Tone variant</Label>
              <Input
                id="tone"
                value={toneVariant}
                onChange={(e) => setToneVariant(e.target.value)}
                placeholder="e.g. quietly confident; lean into urgency"
                className="text-sm"
              />
              <p className="text-[11px] text-muted-foreground">A flavor inside the brand voice — not a pivot.</p>
            </div>
            <div className="pt-2">
              <Button
                onClick={handleGenerate}
                disabled={generating || selected.size === 0}
                className="w-full"
                size="lg"
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating {selected.size}…</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Generate {selected.size} {selected.size === 1 ? 'output' : 'outputs'}</>
                )}
              </Button>
              {!isAIConfigured && (
                <p className="text-[11px] text-muted-foreground mt-2 text-center">
                  No API key — outputs will use deterministic local copy.
                </p>
              )}
            </div>
          </div>
        </Card>

        <OutputTypePicker
          selected={selected}
          onToggle={toggle}
          onSelectAll={() => setSelected(new Set(OUTPUT_SPEC_LIST.map((s) => s.id)))}
          onClearAll={() => setSelected(new Set())}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Generated outputs</h2>
          {outputs.length > 0 && (
            <Badge variant="secondary" className="text-[11px]">{outputs.length}</Badge>
          )}
        </div>

        {outputs.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Wand2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <div className="text-sm font-medium">Nothing generated yet</div>
            <div className="text-xs text-muted-foreground mt-1">
              Pick output types above and hit Generate. Everything will render inside <span className="font-medium">{brand.name}</span>'s system.
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedOutputs.map((output) => (
              <OutputCard
                key={output.id}
                output={output}
                brand={brand}
                onRegenerate={handleRegenerate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
