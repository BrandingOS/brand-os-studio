/**
 * Generation Orchestrator
 * ─────────────────────────────────────────────────────────────────────────
 * Given a brand + a list of output specs + a campaign brief, this:
 *   1. Resolves brand tokens ONCE (the consistency contract).
 *   2. Validates each spec against required brand fields.
 *   3. Composes a strategy-appropriate prompt per output.
 *   4. Asks the AI provider for copy (with fallback to the mock provider).
 *   5. Persists each output to storage as it lands.
 *   6. Calls back with status events so the UI can stream updates.
 *
 * The orchestrator is the ONLY place that knows about the persistence
 * layer + the AI provider. Renderers and UI never call providers directly.
 */

import type { Brand } from '@/shared/types/brand';
import { hasLogo } from '@/shared/brand/logoUrl';
import { resolveBrandTokens, serializeTokens } from './brandTokens';
import { getOutputSpec, type OutputTypeId } from '../registry/outputSpecs';
import type { IAiContentProvider } from '../providers/types';
import type { GeneratedOutput, IBrandConsistencyService } from '../services/types';
import { MockConsistencyProvider } from '../providers/mockProvider';

export interface GenerateRequest {
  brand: Brand;
  outputs: OutputTypeId[];
  campaignBrief?: string;
  toneVariant?: string;
  /** Optional pre-existing IDs to overwrite (for "regenerate"). */
  overwriteIds?: Partial<Record<OutputTypeId, string>>;
}

export interface OrchestratorEvent {
  type: 'created' | 'updated' | 'completed' | 'failed';
  output: GeneratedOutput;
}

export type OrchestratorListener = (event: OrchestratorEvent) => void;

function uid(): string {
  return `out_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function missingBrandFields(brand: Brand, requires: string[]): string[] {
  const have: Record<string, boolean> = {
    logo: hasLogo(brand) || hasLogo(brand, 'iconmark'),
    primaryColor: Boolean(brand.primaryColor),
    fonts: Boolean(brand.fonts?.primary),
    tone: Boolean(brand.tone),
    audience: Boolean(brand.audience),
    strategy: Boolean(brand.strategy || brand.guidelines?.strategy?.mission),
  };
  return requires.filter((r) => !have[r]);
}

export class BrandConsistencyOrchestrator {
  private listeners: OrchestratorListener[] = [];
  private fallback = new MockConsistencyProvider();

  constructor(
    private readonly provider: IAiContentProvider,
    private readonly storage: IBrandConsistencyService,
  ) {}

  on(listener: OrchestratorListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(event: OrchestratorEvent): void {
    for (const l of this.listeners) {
      try {
        l(event);
      } catch (err) {
        console.warn('[brand-consistency] listener threw:', err);
      }
    }
  }

  async generate(req: GenerateRequest): Promise<GeneratedOutput[]> {
    const tokens = resolveBrandTokens(req.brand);
    const tokensSnapshot = serializeTokens(tokens);
    const results: GeneratedOutput[] = [];

    for (const outputType of req.outputs) {
      const id = req.overwriteIds?.[outputType] || uid();
      const spec = getOutputSpec(outputType);

      const queued: GeneratedOutput = {
        id,
        brandId: req.brand.id,
        outputType,
        campaignBrief: req.campaignBrief,
        toneVariant: req.toneVariant,
        status: 'generating',
        content: {},
        tokensSnapshot,
        isAI: false,
        provider: this.provider.name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await this.storage.save(queued);
      this.emit({ type: 'created', output: queued });

      try {
        const missing = missingBrandFields(req.brand, spec.requires);
        if (missing.length > 0 && spec.requires.includes('primaryColor') && missing.includes('primaryColor')) {
          // Hard requirement — without a primary color we can't render anything coherent.
          const failed: GeneratedOutput = {
            ...queued,
            status: 'failed',
            error: `Missing brand data: ${missing.join(', ')}`,
            updatedAt: Date.now(),
          };
          await this.storage.save(failed);
          this.emit({ type: 'failed', output: failed });
          results.push(failed);
          continue;
        }

        // Template-only outputs skip the AI call entirely.
        let response: { content: GeneratedOutput['content']; isAI: boolean; provider: string };
        if (spec.strategy === 'template') {
          response = { content: {}, isAI: false, provider: 'template' };
        } else {
          const aiReq = {
            spec,
            tokens,
            campaignBrief: req.campaignBrief,
            toneVariant: req.toneVariant,
            slots: outputType === 'social_carousel_3' ? 3 : undefined,
          };
          try {
            response = await this.provider.generate(aiReq);
          } catch (err) {
            console.warn('[brand-consistency] provider threw, falling back to mock:', err);
            response = await this.fallback.generate(aiReq);
          }
        }

        const ready: GeneratedOutput = {
          ...queued,
          status: 'ready',
          content: response.content,
          isAI: response.isAI,
          provider: response.provider,
          updatedAt: Date.now(),
        };
        await this.storage.save(ready);
        this.emit({ type: 'completed', output: ready });
        results.push(ready);
      } catch (err) {
        const failed: GeneratedOutput = {
          ...queued,
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error',
          updatedAt: Date.now(),
        };
        await this.storage.save(failed);
        this.emit({ type: 'failed', output: failed });
        results.push(failed);
      }
    }

    return results;
  }

  async regenerate(brand: Brand, output: GeneratedOutput, overrides?: { brief?: string; toneVariant?: string }): Promise<GeneratedOutput> {
    const [result] = await this.generate({
      brand,
      outputs: [output.outputType],
      campaignBrief: overrides?.brief ?? output.campaignBrief,
      toneVariant: overrides?.toneVariant ?? output.toneVariant,
      overwriteIds: { [output.outputType]: output.id },
    });
    return result;
  }
}
