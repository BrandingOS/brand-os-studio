/**
 * AI Provider abstraction for the Brand Consistency engine.
 *
 * The orchestrator only depends on this interface so a future provider
 * (Claude, OpenAI, Gemini, local LLM) can be slotted in without touching
 * the renderers or the registry.
 */

import type { BrandTokens } from '../engine/brandTokens';
import type { OutputSpec } from '../registry/outputSpecs';

export interface AiCopyRequest {
  spec: OutputSpec;
  tokens: BrandTokens;
  campaignBrief?: string;
  toneVariant?: string;
  /** Optional carousel-like slot count, ad-hoc fields. */
  slots?: number;
}

export interface AiCopyResponse {
  /** Free-form fields the renderer can read; promptComposer guarantees shape. */
  content: AiCopyContent;
  /** Whether this came from a real model call (vs. local heuristic fallback). */
  isAI: boolean;
  /** Provider name for telemetry. */
  provider: string;
  /** Final prompt sent — exposed for debugging the consistency contract. */
  debugPrompt?: string;
}

export interface AiCopyContent {
  headline?: string;
  subheadline?: string;
  body?: string;
  cta?: string;
  /** For carousels and feature lists. */
  slides?: Array<{ headline: string; body?: string; cta?: string }>;
  features?: Array<{ title: string; description: string }>;
  bullets?: string[];
  hashtags?: string[];
  /** Cardholder name & role for business-card mockups. */
  meta?: { name?: string; role?: string; email?: string; phone?: string };
}

export interface IAiContentProvider {
  readonly name: string;
  readonly available: boolean;
  generate(req: AiCopyRequest): Promise<AiCopyResponse>;
}
