/**
 * LocalMockupTemplatesService — reads from the bundled template index.
 *
 * Behind the `IMockupTemplatesService` contract so a Supabase-backed
 * implementation (admin uploads) can slot in during Phase 7 without
 * touching callers.
 */

import {
  getBundledTemplateById,
  getBundledTemplates,
} from '@/features/mockup-studio/data/templateIndex';
import type { TemplateMeta } from '@/features/mockup-studio/engine/types';
import type { IMockupTemplatesService } from '../../types/services';

export class LocalMockupTemplatesService implements IMockupTemplatesService {
  async list(): Promise<TemplateMeta[]> {
    return getBundledTemplates();
  }

  async getById(id: string): Promise<TemplateMeta | null> {
    return getBundledTemplateById(id);
  }
}
