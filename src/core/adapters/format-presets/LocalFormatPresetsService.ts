// Phase 5.1b — Local IFormatPresetsService impl.
//
// Reads from the in-memory CONTENT_TYPES registry. Returns presets
// with deterministic ids (`<contentTypeId>:<index>`) so test snapshots
// are stable. Supabase impl will replace this with a real list+cache
// once the format_presets migration deploys.
import {
  CONTENT_TYPES,
  getContentTypeConfig,
} from '@/features/editor/content-types';
import type {
  FormatPreset,
  IFormatPresetsService,
} from '@/core/services/IFormatPresetsService';

export class LocalFormatPresetsService implements IFormatPresetsService {
  async listForContentType(contentTypeId: string): Promise<FormatPreset[]> {
    let cfg;
    try {
      cfg = getContentTypeConfig(contentTypeId);
    } catch {
      return [];
    }
    return cfg.dimensionPresets.map((p, index) => ({
      id: `${contentTypeId}:${index}`,
      contentTypeId,
      label: p.label,
      width: p.width,
      height: p.height,
      displayOrder: index,
    }));
  }

  async listAll(): Promise<FormatPreset[]> {
    const out: FormatPreset[] = [];
    for (const [contentTypeId, cfg] of Object.entries(CONTENT_TYPES)) {
      cfg.dimensionPresets.forEach((p, index) => {
        out.push({
          id: `${contentTypeId}:${index}`,
          contentTypeId,
          label: p.label,
          width: p.width,
          height: p.height,
          displayOrder: index,
        });
      });
    }
    return out;
  }
}
