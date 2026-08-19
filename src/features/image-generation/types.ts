// Image generation — shared types.
//
// These mirror the Edge Function contract exactly. The server is authoritative
// for capabilities, prices and credit balances; nothing here is ever computed
// in the browser and sent back as fact.

export type ImageVendor =
  | 'openai' | 'google' | 'fal' | 'pollinations' | 'cloudflare' | 'huggingface' | 'mock';

export type AspectRatio = '1:1' | '4:5' | '2:3' | '9:16' | '4:3' | '3:2' | '16:9' | '21:9';
export type ImageQuality = 'low' | 'medium' | 'high';

/** Exactly the capability block the server declares. */
export interface ImageModelCaps {
  supportsReferenceImages: boolean;
  maxReferenceImages: number;
  supportedAspectRatios: AspectRatio[];
  supportedSizes: number[];
  supportedQualities: ImageQuality[];
  supportsMultipleOutputs: boolean;
  maxOutputs: number;
  nPerCall: number;
  supportsCancellation: boolean;
  supportsSeed: boolean;
  supportsNegativePrompt: boolean;
  supportsImageToImage: boolean;
  textRendering: 'strong' | 'ok' | 'weak';
}

export interface ImageModelAvailability {
  id: string;
  vendor: ImageVendor;
  tier: 'free' | 'paid';
  available: boolean;
  reason?: string;
  caps: ImageModelCaps;
}

export interface ImageCapabilities {
  models: ImageModelAvailability[];
  /** Registry id `auto` resolves to on this deployment. */
  auto: string;
  /** No production model is unlocked — `auto` fell back to a test model. */
  autoDegraded?: boolean;
  pricingVersion: string;
  usdPerCredit: number;
}

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type JobOperation = 'generate' | 'variation' | 'refine' | 'regenerate';

export type ImageErrorCode =
  | 'invalid_input' | 'authentication' | 'insufficient_quota' | 'rate_limited'
  | 'safety_rejection' | 'unsupported_setting' | 'provider_unavailable'
  | 'timeout' | 'storage_failure' | 'insufficient_credits' | 'cancelled' | 'unknown';

export interface GeneratedOutput {
  storagePath: string;
  url: string;
  width?: number;
  height?: number;
  mime: string;
  bytes: number;
  seed?: number;
}

export interface GenerationJob {
  id: string;
  status: JobStatus;
  operation: JobOperation;
  provider: string;
  model: string;
  userPrompt: string;
  compiledPrompt: string | null;
  settings: {
    aspectRatio?: AspectRatio;
    size?: number;
    quality?: ImageQuality | null;
    count?: number;
    seed?: number | null;
    vendorModel?: string;
  };
  outputs: GeneratedOutput[];
  estimatedCredits: number;
  chargedCredits: number;
  costUsd: number | null;
  costSource: string | null;
  latencyMs: number | null;
  errorCode: ImageErrorCode | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CreditSnapshot {
  balance: number;
  reserved: number;
}

export interface JobResult {
  job: GenerationJob;
  credits: CreditSnapshot;
  warnings?: string[];
}

/** A reference image. Never a bare URL — see the SSRF note on the server. */
export interface ImageReferenceInput {
  role: 'logo' | 'palette' | 'previous' | 'style' | 'product' | 'image';
  /** Inline bytes the browser already holds. */
  dataUrl?: string;
  /** An object path inside the brand's own storage folder. */
  path?: string;
  /** UI only — what to show on the chip. */
  label?: string;
}

export interface GenerationRequest {
  brandId: string;
  projectId?: string;
  designId?: string;
  operation?: JobOperation;
  userPrompt: string;
  compiledPrompt?: string;
  negativePrompt?: string;
  model?: string;
  aspectRatio?: AspectRatio;
  size?: number;
  quality?: ImageQuality;
  count?: number;
  seed?: number;
  references?: ImageReferenceInput[];
  /** Same key ⇒ same job. Generated once per submit and reused on retry. */
  idempotencyKey?: string;
}

export interface EstimateResult {
  model: string;
  settings: {
    aspectRatio: AspectRatio;
    size: number;
    quality: ImageQuality | null;
    count: number;
    maxReferences: number;
  };
  credits: number;
  usd: number;
  usdPerCredit: number;
  pricingVersion: string;
  adjustments: string[];
}

/** Typed failure carrying the normalized code the UI branches on. */
export class ImageGenerationError extends Error {
  readonly code: ImageErrorCode;
  readonly retryable: boolean;
  readonly status: number;
  readonly requiredCredits?: number;
  readonly balance?: number;
  readonly jobId?: string;

  constructor(init: {
    code: ImageErrorCode; message: string; retryable?: boolean; status?: number;
    requiredCredits?: number; balance?: number; jobId?: string;
  }) {
    super(init.message);
    this.name = 'ImageGenerationError';
    this.code = init.code;
    this.retryable = init.retryable ?? false;
    this.status = init.status ?? 500;
    this.requiredCredits = init.requiredCredits;
    this.balance = init.balance;
    this.jobId = init.jobId;
  }
}

export interface ImageProject {
  id: string;
  brandId: string;
  workspaceId: string | null;
  title: string;
  lastSettings: Record<string, unknown>;
  coverUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
