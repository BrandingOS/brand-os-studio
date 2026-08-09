/**
 * Pure mappers between the canonical Brand and a persistence row (Stage 2B).
 *
 * No I/O — just the shape translation, so it can be unit-tested for semantic
 * round-trip and reused by any adapter (Supabase, in-memory, or the real-Postgres
 * PGlite harness in `scratchpad/pgverify/verify_2b.mjs`, recorded in
 * docs/phase-2/stage-2b). This is the ONE place the canonical identity is
 * (de)serialized for storage; it never reads or writes the `guidelines` mirror.
 */
import type { Brand } from '@/shared/types/brand';
import {
  CANONICAL_BRAND_SCHEMA_VERSION,
  fromLegacyBrand,
  type CanonicalBrand,
} from '@/domain/brand';

/**
 * A persistence row for a brand. The `identity`/`identity_schema_version` columns
 * (migration 013) are the canonical home; the legacy scalar columns are written
 * for backward compatibility with not-yet-migrated readers.
 */
export interface BrandRow {
  id: string;
  slug: string;
  name: string;
  // Canonical (013)
  identity: unknown | null;
  identity_schema_version: number | null;
  // Legacy scalar columns kept in sync (compat).
  primary_color?: string | null;
  secondary_color?: string | null;
  fonts?: { primary?: string; secondary?: string } | null;
  tone?: string | null;
  audience?: string | null;
  strategy?: string | null;
  is_public?: boolean | null;
  public_url?: string | null;
  logo_url?: string | null;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
}

/** Fields written on save. Legacy scalars mirror the canonical values so
 *  un-migrated consumers stay consistent; `guidelines` is deliberately absent. */
export interface BrandRowWrite {
  identity: unknown;
  identity_schema_version: number;
  name: string;
  primary_color: string;
  secondary_color?: string;
  fonts: { primary: string; secondary?: string };
  tone?: string;
  audience?: string;
  strategy?: string;
  is_public: boolean;
  public_url?: string;
}

/** CanonicalBrand → row payload for INSERT/UPDATE.
 *  Writes the full identity JSONB (authoritative) plus the legacy scalar columns
 *  that have a canonical source, so un-migrated readers stay consistent.
 *  (`logo_url` is NOT synced here — it derives from a logo Asset, resolved in
 *  Stage 2C; tracked as MIGRATION-BACKLOG F3.) */
export function canonicalToRow(c: CanonicalBrand): BrandRowWrite {
  const { colors, typography, strategy, voice } = c.identity;
  return {
    identity: c.identity,
    identity_schema_version: c.identitySchemaVersion,
    name: c.name,
    primary_color: colors.primary.hex,
    secondary_color: colors.secondary?.hex,
    fonts: {
      primary: typography.primary.family,
      secondary: typography.secondary?.family,
    },
    tone: voice.tone,
    audience: strategy.targetAudience,
    strategy: strategy.mission,
    is_public: c.isPublic,
    public_url: c.publicUrl,
  };
}

function toDate(v: string | Date | null | undefined): Date {
  if (v instanceof Date) return v;
  if (typeof v === 'string') return new Date(v);
  return new Date(0);
}

/**
 * Row → CanonicalBrand. Prefers the stored canonical `identity` (authoritative —
 * no re-derivation). Only when a row predates migration 013 (no identity) does it
 * derive once from the legacy columns via `fromLegacyBrand` (read-time backfill).
 */
export function rowToCanonical(row: BrandRow): CanonicalBrand {
  // Prefer the stored canonical identity whenever it is present — a missing
  // schema version must NOT cause the stored identity to be silently discarded
  // and re-derived from legacy columns (reviewer F4). Default the version.
  if (row.identity != null) {
    const identity = (
      typeof row.identity === 'string' ? JSON.parse(row.identity) : row.identity
    ) as CanonicalBrand['identity'];
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      identity,
      isPublic: row.is_public ?? false,
      publicUrl: row.public_url ?? undefined,
      identitySchemaVersion: row.identity_schema_version ?? CANONICAL_BRAND_SCHEMA_VERSION,
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
    };
  }

  // Legacy row (pre-013): derive canonical once from the legacy shape.
  const legacy = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    primaryColor: row.primary_color ?? '#000000',
    secondaryColor: row.secondary_color ?? undefined,
    fonts: { primary: row.fonts?.primary ?? 'Inter', secondary: row.fonts?.secondary },
    tone: row.tone ?? '',
    audience: row.audience ?? '',
    strategy: row.strategy ?? undefined,
    logo: row.logo_url ?? undefined,
    assets: [],
    isPublic: row.is_public ?? false,
    publicUrl: row.public_url ?? undefined,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  } as Brand;
  return fromLegacyBrand(legacy);
}
