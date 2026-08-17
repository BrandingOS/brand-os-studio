// Versioned, server-side pricing for image generation.
//
// Why this exists: "how much did that cost" cannot live in a UI component and
// cannot be trusted from the browser. Every job stores BOTH the version and a
// snapshot of the exact rule used, so a price change never rewrites history.
//
// Bump PRICING_VERSION whenever a number below changes. Never edit a rule in
// place without bumping — old jobs keep their snapshot either way, but the
// version is how you explain a jump in the ledger.
//
// Money model
//   • 1 credit = USD 0.01.
//   • Cost is rounded UP to whole credits, minimum 1 for any paid model.
//   • Free models cost 0 credits. Free stays free.
//
// Cost source, recorded per job:
//   provider    the vendor told us the price (nothing does today; the field
//               exists so a vendor that reports cost is used verbatim)
//   calculated  we priced real returned usage with a rule below
//   estimated   pre-flight guess before the provider answered

export const PRICING_VERSION = '2026-08-18.1';

/** USD per credit. */
export const USD_PER_CREDIT = 0.01;

export type CostSource = 'provider' | 'calculated' | 'estimated';

export interface PricingRule {
  /** Registry model id. */
  model: string;
  /** USD per generated image at the base size. */
  usdPerImage: number;
  /**
   * Multiplier applied when the long edge exceeds `baseLongEdge`. Vendors that
   * bill per output token charge roughly 4× for a 2K image.
   */
  baseLongEdge: number;
  largeMultiplier: number;
  /** Multiplier per quality tier, when the model has quality tiers. */
  qualityMultipliers?: Record<string, number>;
  note?: string;
}

/**
 * Prices verified 2026-08-18 against each vendor's public rate card.
 * Nano Banana: $0.039/image (1290 output tokens @ $30/M).
 * Nano Banana Pro: $0.134/image 1K–2K (1120 output tokens @ $120/M).
 * GPT Image 1.5: ~$0.04 medium / ~$0.17 high at 1024².
 */
export const PRICING_RULES: Record<string, PricingRule> = {
  'google:nano-banana': {
    model: 'google:nano-banana',
    usdPerImage: 0.039, baseLongEdge: 1024, largeMultiplier: 1,
    note: '1290 output tokens @ $30/M',
  },
  'google:nano-banana-pro': {
    model: 'google:nano-banana-pro',
    usdPerImage: 0.134, baseLongEdge: 1024, largeMultiplier: 1.75,
    note: '1120 output tokens @ $120/M; 4K tier costs more',
  },
  'openai:gpt-image': {
    model: 'openai:gpt-image',
    usdPerImage: 0.042, baseLongEdge: 1024, largeMultiplier: 1.5,
    qualityMultipliers: { low: 0.25, medium: 1, high: 4 },
  },
  'openai:gpt-image-mini': {
    model: 'openai:gpt-image-mini',
    usdPerImage: 0.011, baseLongEdge: 1024, largeMultiplier: 1.5,
    qualityMultipliers: { low: 0.25, medium: 1, high: 4 },
  },
  'fal:flux-schnell': {
    model: 'fal:flux-schnell',
    usdPerImage: 0.003, baseLongEdge: 1024, largeMultiplier: 2,
  },
  'pollinations:flux':   { model: 'pollinations:flux',   usdPerImage: 0, baseLongEdge: 1024, largeMultiplier: 1 },
  'pollinations:turbo':  { model: 'pollinations:turbo',  usdPerImage: 0, baseLongEdge: 1024, largeMultiplier: 1 },
  'cloudflare:flux-schnell':  { model: 'cloudflare:flux-schnell',  usdPerImage: 0, baseLongEdge: 1024, largeMultiplier: 1 },
  'huggingface:flux-schnell': { model: 'huggingface:flux-schnell', usdPerImage: 0, baseLongEdge: 1024, largeMultiplier: 1 },
  'mock:svg':            { model: 'mock:svg',            usdPerImage: 0, baseLongEdge: 1024, largeMultiplier: 1 },
};

/** Unknown models are priced defensively so an un-costed model can't be free. */
export const FALLBACK_RULE: PricingRule = {
  model: 'unknown', usdPerImage: 0.05, baseLongEdge: 1024, largeMultiplier: 1.5,
  note: 'fallback rule for an unpriced model',
};

export function ruleFor(modelId: string): PricingRule {
  return PRICING_RULES[modelId] ?? { ...FALLBACK_RULE, model: modelId };
}

export interface CostInput {
  model: string;
  imageCount: number;
  longEdge: number;
  quality?: string;
}

export interface CostResult {
  usd: number;
  credits: number;
  pricingVersion: string;
  snapshot: PricingRule & { imageCount: number; longEdge: number; quality?: string };
}

export function usdToCredits(usd: number): number {
  if (usd <= 0) return 0;
  return Math.max(1, Math.ceil(usd / USD_PER_CREDIT));
}

export function creditsToUsd(credits: number): number {
  return Number((credits * USD_PER_CREDIT).toFixed(4));
}

/** Price a generation. Used both for the pre-flight estimate and settlement. */
export function computeCost(input: CostInput): CostResult {
  const rule = ruleFor(input.model);
  const count = Math.max(1, Math.trunc(input.imageCount) || 1);

  let perImage = rule.usdPerImage;
  if (input.longEdge > rule.baseLongEdge) perImage *= rule.largeMultiplier;
  if (rule.qualityMultipliers && input.quality) {
    perImage *= rule.qualityMultipliers[input.quality] ?? 1;
  }

  const usd = Number((perImage * count).toFixed(6));
  return {
    usd,
    credits: usdToCredits(usd),
    pricingVersion: PRICING_VERSION,
    snapshot: { ...rule, imageCount: count, longEdge: input.longEdge, quality: input.quality },
  };
}

/**
 * Normalize whatever usage a vendor returned. Only OpenAI reports tokens for
 * images today; nobody reports a price. When a vendor starts returning cost,
 * add it here and the job records `cost_source: 'provider'`.
 */
export interface NormalizedUsage {
  imageCount: number;
  inputTokens?: number;
  outputTokens?: number;
  providerCostUsd?: number;
  raw?: unknown;
}

export function settleCost(
  input: CostInput,
  usage: NormalizedUsage | undefined,
): { usd: number; credits: number; source: CostSource; pricingVersion: string; snapshot: unknown } {
  if (usage?.providerCostUsd != null && Number.isFinite(usage.providerCostUsd)) {
    const usd = Number(usage.providerCostUsd.toFixed(6));
    return {
      usd, credits: usdToCredits(usd), source: 'provider',
      pricingVersion: PRICING_VERSION,
      snapshot: { source: 'provider', usd, usage },
    };
  }
  // Price what was actually delivered, not what was asked for.
  const delivered = usage?.imageCount ?? input.imageCount;
  const computed = computeCost({ ...input, imageCount: delivered });
  return {
    usd: computed.usd, credits: computed.credits, source: 'calculated',
    pricingVersion: computed.pricingVersion,
    snapshot: { ...computed.snapshot, usage },
  };
}
