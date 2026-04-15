/**
 * Brand Consistency persistence layer types.
 *
 * Generated outputs live in localStorage today (matching the rest of
 * the project's local-first pattern). A Supabase implementation can be
 * added later behind the same interface without touching the UI.
 */

import type { OutputTypeId } from '../registry/outputSpecs';
import type { AiCopyContent } from '../providers/types';
import type { BrandTokens } from '../engine/brandTokens';

export type OutputStatus = 'queued' | 'generating' | 'ready' | 'failed';

export interface GeneratedOutput {
  id: string;
  brandId: string;
  outputType: OutputTypeId;
  campaignBrief?: string;
  toneVariant?: string;
  status: OutputStatus;
  content: AiCopyContent;
  /** Snapshot of the token system at generation time (sans functions). */
  tokensSnapshot: SerializedBrandTokens;
  isAI: boolean;
  provider: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export type SerializedBrandTokens = Omit<BrandTokens, 'logo'> & {
  logo: Omit<BrandTokens['logo'], 'pickFor'>;
};

export interface IBrandConsistencyService {
  list(brandId: string): Promise<GeneratedOutput[]>;
  save(output: GeneratedOutput): Promise<void>;
  delete(brandId: string, outputId: string): Promise<void>;
  clear(brandId: string): Promise<void>;
}
