// The unit of evidence.
//
// Every generation the harness performs — mock or live, compile-only or full —
// produces exactly one EvalRecord. Two runs are comparable because `id` is
// derived from the task and the knobs rather than from a clock, so the same
// cell in run A joins the same cell in run B without a heuristic.
//
// Recording the COST and the LATENCY alongside the score is the point. A prompt
// change that scores three points higher and costs four times as much is not an
// improvement, and a harness that records only the score cannot say so.

export type EvalStage = 'compile' | 'generate';
export type EvalMode = 'mock' | 'live';

/** One reference image as it was actually sent, in send order. */
export interface EvalReference {
  role: 'previous' | 'logo' | 'palette' | 'style' | 'product' | 'image';
  /** Inline data url, or a storage path the server resolves. */
  kind: 'inline' | 'storage';
  bytes: number;
  /** True when the model's cap truncated this one away before the provider saw it. */
  dropped: boolean;
}

/** Exactly what of the brand was permitted into the frame. */
export interface EvalBrandIncludes {
  logo: boolean;
  text: boolean;
  colours: boolean;
  identity: boolean;
  /** The hexes that actually survived into the compiled brief. */
  paletteHexes: string[];
  brandSlug: string;
}

export interface EvalScores {
  /** Deterministic, free, always present. Each 0 or 1. */
  heuristic: Record<string, number>;
  /** Optional multimodal critic. Absent in mock mode and when --no-critic. */
  critic?: {
    criticId: string;
    overall: number;                      // 0..1
    dimensions: Record<string, number>;   // 0..1 each
    verdict: 'accept' | 'reject';
    rationale: string;
  };
}

export interface EvalRecord {
  /** Stable identity: same task + same knobs ⇒ same id across runs. */
  id: string;
  runId: string;
  gitSha: string;
  stage: EvalStage;
  mode: EvalMode;

  taskId: string;
  /** Which pipeline/flag combination — 'baseline', 'candidate', … */
  variantId: string;
  userPrompt: string;
  copy: { headline?: string; subhead?: string; cta?: string } | null;
  kind: 'design' | 'image' | 'auto';
  formatId: string;
  aspectRatio: string;

  modelRequested: string;
  modelResolved: string;

  compiledPrompt: string;
  negativePrompt: string | null;
  compileSource: 'claude' | 'deterministic';
  compileLatencyMs: number;
  /** Diffing prompts without diffing 600 words of prose. */
  promptSha256: string;

  references: EvalReference[];
  brandIncludes: EvalBrandIncludes;
  seed: number | null;

  imagePath: string | null;
  width: number | null;
  height: number | null;

  estimatedCredits: number;
  chargedCredits: number;
  usd: number;
  pricingVersion: string | null;

  latencyMs: number;
  warnings: string[];

  ok: boolean;
  failure: { code: string; message: string; retryable: boolean } | null;

  scores: EvalScores;
}

export function recordId(taskId: string, modelId: string, variantId: string): string {
  return `${taskId}--${modelId.replace(/[:/]/g, '_')}--${variantId}`;
}
