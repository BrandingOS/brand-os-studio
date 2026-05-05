// Phase 5.1b — Format presets service.
//
// Decouples the "Generate variants" UI from the data source for
// dimension presets. Today the LocalFormatPresetsService reads from
// ContentTypeConfig.dimensionPresets (hardcoded TS in
// src/features/editor/content-types/*.config.ts). Tomorrow a Supabase
// adapter reads from a `format_presets` table — 1-line DI swap in
// src/core/boot.ts, no UI changes.
//
// Async surface lets the Supabase impl batch + cache without changing
// the contract. Local impl returns Promise.resolve since CONTENT_TYPES
// is in-memory.
import type { DimensionPreset } from '@/features/editor/content-types/types';

/**
 * A format preset with its content-type association. Same shape as
 * DimensionPreset plus the contentTypeId — needed so the Supabase
 * impl can return a flat list joined to the categories table.
 */
export interface FormatPreset extends DimensionPreset {
  /** Stable id (UUID in the Supabase impl, deterministic-from-label in
   *  Local). Used as a stable React key in the picker. */
  id: string;
  /** Matches `ContentTypeConfig.id`. */
  contentTypeId: string;
  /** Optional sort key. Lower = earlier. Local impl uses array index. */
  displayOrder?: number;
}

export interface IFormatPresetsService {
  /**
   * Return every preset registered for a content type. Returns [] for
   * an unknown content type rather than throwing — the variants UI
   * shows "no alternate formats configured" in that case.
   */
  listForContentType(contentTypeId: string): Promise<FormatPreset[]>;

  /** All presets across all content types. Used by an admin UI when
   *  it lands; not consumed by the editor today. */
  listAll(): Promise<FormatPreset[]>;
}
