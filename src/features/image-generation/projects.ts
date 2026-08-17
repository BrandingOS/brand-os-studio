// Image projects — the thing at /b/:brand/design/:projectId.
//
// The id is immutable and is the URL. The title is mutable (rename). Row-level
// security scopes every read and write to brand members, so these calls carry
// no tenant filter of their own beyond the brand they ask for.

import { supabase } from '@/integrations/supabase/client';
import type { GenerationJob, ImageProject } from './types';

// The generated Supabase types predate these tables; reach them untyped the
// same way SupabaseDesignStorage reaches `designs`.
 
const table = (name: string) => (supabase as any).from(name);

function toProject(row: Record<string, unknown>): ImageProject {
  return {
    id: row.id as string,
    brandId: row.brand_id as string,
    workspaceId: (row.workspace_id as string) ?? null,
    title: (row.title as string) ?? 'Untitled project',
    lastSettings: (row.last_settings as Record<string, unknown>) ?? {},
    coverUrl: (row.cover_url as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function createImageProject(input: {
  brandId: string;
  workspaceId?: string | null;
  title?: string;
  lastSettings?: Record<string, unknown>;
}): Promise<ImageProject> {
  const { data, error } = await table('image_projects')
    .insert({
      brand_id: input.brandId,
      workspace_id: input.workspaceId ?? null,
      title: (input.title ?? '').trim().slice(0, 120) || 'Untitled project',
      last_settings: input.lastSettings ?? {},
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return toProject(data);
}

export async function getImageProject(projectId: string): Promise<ImageProject | null> {
  const { data, error } = await table('image_projects').select('*').eq('id', projectId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toProject(data) : null;
}

export async function listImageProjects(brandId: string, limit = 24): Promise<ImageProject[]> {
  const { data, error } = await table('image_projects')
    .select('*')
    .eq('brand_id', brandId)
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(toProject);
}

export async function renameImageProject(projectId: string, title: string): Promise<void> {
  const clean = title.trim().slice(0, 120) || 'Untitled project';
  const { error } = await table('image_projects').update({ title: clean }).eq('id', projectId);
  if (error) throw new Error(error.message);
}

export async function updateProjectSettings(
  projectId: string,
  lastSettings: Record<string, unknown>,
  coverUrl?: string | null,
): Promise<void> {
  const patch: Record<string, unknown> = { last_settings: lastSettings };
  if (coverUrl !== undefined) patch.cover_url = coverUrl;
  const { error } = await table('image_projects').update(patch).eq('id', projectId);
  if (error) throw new Error(error.message);
}

export async function deleteImageProject(projectId: string): Promise<void> {
  const { error } = await table('image_projects').delete().eq('id', projectId);
  if (error) throw new Error(error.message);
}

// ─── Job history ─────────────────────────────────────────────────────────────

export function jobRowToJob(row: Record<string, unknown>): GenerationJob {
  return {
    id: row.id as string,
    status: row.status as GenerationJob['status'],
    operation: (row.operation as GenerationJob['operation']) ?? 'generate',
    provider: row.provider as string,
    model: row.model as string,
    userPrompt: (row.user_prompt as string) ?? '',
    compiledPrompt: (row.compiled_prompt as string) ?? null,
    settings: (row.settings as GenerationJob['settings']) ?? {},
    outputs: (row.output_assets as GenerationJob['outputs']) ?? [],
    estimatedCredits: (row.estimated_credits as number) ?? 0,
    chargedCredits: (row.charged_credits as number) ?? 0,
    costUsd: (row.cost_usd as number) ?? null,
    costSource: (row.cost_source as string) ?? null,
    latencyMs: (row.latency_ms as number) ?? null,
    errorCode: (row.error_code as GenerationJob['errorCode']) ?? null,
    errorMessage: (row.error_message as string) ?? null,
    createdAt: row.created_at as string,
    completedAt: (row.completed_at as string) ?? null,
  };
}

/** History survives refresh because it lives in the database, not the page. */
export async function listProjectJobs(projectId: string, limit = 60): Promise<GenerationJob[]> {
  const { data, error } = await table('image_generation_jobs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(jobRowToJob);
}

export async function listBrandJobs(brandId: string, limit = 40): Promise<GenerationJob[]> {
  const { data, error } = await table('image_generation_jobs')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(jobRowToJob);
}

export async function getJob(jobId: string): Promise<GenerationJob | null> {
  const { data, error } = await table('image_generation_jobs').select('*').eq('id', jobId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? jobRowToJob(data) : null;
}

/**
 * A signed output URL is long-lived but not eternal. Re-signing from the stored
 * path is what makes an output durable rather than merely persisted.
 */
export async function resignOutput(storagePath: string, ttlSeconds = 60 * 60 * 24 * 7): Promise<string | null> {
  const { data, error } = await supabase.storage.from('brand-assets').createSignedUrl(storagePath, ttlSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
