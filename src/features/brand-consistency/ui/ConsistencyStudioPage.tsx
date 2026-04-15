/**
 * Brand Consistency Studio — clean composer.
 *
 * One textarea, one row of chips, one button. Results stream in below.
 * Everything else (token summary, completeness, settings) is collapsed
 * into a single compact strip so the UI stays focused.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { useBrandPageConfig } from '@/shared/layouts/brandPageConfig';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Wand2, Trash2, AlertCircle, CornerDownLeft } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { useService } from '@/core/hooks/useService';
import { SERVICE_KEYS } from '@/core/types/services';

import { resolveBrandTokens } from '../engine/brandTokens';
import { OUTPUT_SPEC_LIST, type OutputTypeId } from '../registry/outputSpecs';
import { BrandConsistencyOrchestrator } from '../engine/orchestrator';
import { AnthropicConsistencyProvider } from '../providers/anthropicProvider';
import type { GeneratedOutput, IBrandConsistencyService } from '../services/types';
import { OutputCard } from './OutputCard';

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
  const [selected, setSelected] = useState<Set<OutputTypeId>>(() => new Set(DEFAULT_SELECTION));
  const [outputs, setOutputs] = useState<GeneratedOutput[]>([]);
  const [generating, setGenerating] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const provider = useMemo(() => new AnthropicConsistencyProvider(), []);
  const orchestrator = useMemo(
    () => new BrandConsistencyOrchestrator(provider, storage),
    [provider, storage],
  );

  useEffect(() => {
    if (!brand?.id) return;
    storage.list(brand.id).then(setOutputs).catch(() => {});
  }, [brand?.id, storage]);

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
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !brand) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-muted-foreground">{error ?? 'Brand not found.'}</p>
      </div>
    );
  }

  const tokens = resolveBrandTokens(brand);
  const isAIConfigured = provider.available;
  const isThin = tokens.completeness.score < 0.5;

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
      toast.error('Pick at least one output');
      return;
    }
    if (!brand.primaryColor) {
      toast.error('Set a primary color in Brand Setup first');
      return;
    }
    setGenerating(true);
    try {
      await orchestrator.generate({
        brand,
        outputs: Array.from(selected),
        campaignBrief: brief.trim() || undefined,
      });
      // Auto-scroll to results so the user sees them stream in.
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch {
      toast.error('Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async (output: GeneratedOutput) => {
    try {
      await orchestrator.regenerate(brand, output, { brief });
    } catch {
      toast.error('Regenerate failed');
    }
  };

  const handleDelete = async (output: GeneratedOutput) => {
    await storage.delete(brand.id, output.id);
    setOutputs((prev) => prev.filter((o) => o.id !== output.id));
  };

  const handleClearAll = async () => {
    if (outputs.length === 0) return;
    if (!confirm(`Clear ${outputs.length} outputs?`)) return;
    await storage.clear(brand.id);
    setOutputs([]);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  const sortedOutputs = [...outputs].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-16">
      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section className="pt-2 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          {isAIConfigured ? 'AI engine ready' : 'Local fallback (no API key)'}
          <span className="opacity-50">·</span>
          <BrandChip tokens={tokens} />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Generate inside <span className="text-primary">{brand.name}</span>
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          One brief. Every surface. All rendered inside your brand system.
        </p>
      </section>

      {/* ─── Composer ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border bg-card shadow-sm">
        <div className="relative">
          <Textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Describe what you want — e.g. "Launch our new pricing for design teams." Or leave empty for a general brand piece.`}
            rows={3}
            className="min-h-[88px] resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <div className="pointer-events-none absolute bottom-2 right-3 hidden items-center gap-1 text-[10px] text-muted-foreground sm:flex">
            <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">⌘</kbd>
            <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">↵</kbd>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t px-3 py-2.5">
          {OUTPUT_SPEC_LIST.map((spec) => {
            const active = selected.has(spec.id);
            const Icon = spec.icon;
            return (
              <button
                key={spec.id}
                type="button"
                onClick={() => toggle(spec.id)}
                title={spec.description}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all',
                  active
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                )}
              >
                <Icon className="h-3 w-3" />
                {spec.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-3 py-2.5">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <button
              type="button"
              onClick={() => setSelected(new Set(OUTPUT_SPEC_LIST.map((s) => s.id)))}
              className="hover:text-foreground"
            >
              All
            </button>
            <span className="opacity-40">·</span>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="hover:text-foreground"
            >
              None
            </button>
            <span className="opacity-40">·</span>
            <span>{selected.size} selected</span>
          </div>
          <Button onClick={handleGenerate} disabled={generating || selected.size === 0} size="sm" className="gap-1.5">
            {generating ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating</>
            ) : (
              <><Wand2 className="h-3.5 w-3.5" /> Generate <CornerDownLeft className="ml-0.5 h-3 w-3 opacity-60" /></>
            )}
          </Button>
        </div>
      </section>

      {/* ─── Thin-data warning (only when relevant) ───────────────── */}
      {isThin && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-50/60 px-3 py-2 text-xs dark:bg-yellow-950/20">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-600 dark:text-yellow-500" />
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">Brand data is thin.</span> Outputs render with defaults — fill in {tokens.completeness.missing.slice(0, 3).join(', ')} for sharper results.
          </div>
        </div>
      )}

      {/* ─── Results ──────────────────────────────────────────────── */}
      <section ref={resultsRef} className="scroll-mt-6">
        {outputs.length === 0 ? (
          <EmptyState brandName={brand.name} />
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">
                Results <span className="font-normal text-muted-foreground">· {outputs.length}</span>
              </div>
              <button
                onClick={handleClearAll}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="h-3 w-3" /> Clear all
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          </>
        )}
      </section>
    </div>
  );
}

/** Tiny inline brand identity chip — logo/swatches + name. */
function BrandChip({ tokens }: { tokens: ReturnType<typeof resolveBrandTokens> }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="flex">
        {[tokens.colors.primary, tokens.colors.secondary, tokens.colors.accent].map((c, i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full border border-background"
            style={{ background: c, marginLeft: i ? -3 : 0 }}
          />
        ))}
      </span>
      <span className="font-medium text-foreground">{tokens.brandName}</span>
    </span>
  );
}

function EmptyState({ brandName }: { brandName: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-muted/20 py-16 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Wand2 className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium">Nothing generated yet</div>
      <div className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
        Describe what you want and hit generate. Everything renders inside <span className="font-medium text-foreground">{brandName}</span>.
      </div>
    </div>
  );
}
