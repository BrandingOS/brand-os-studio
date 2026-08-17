// Edge Function: ai-generate-image — the image generation job runner.
//
// ─── What this owns ──────────────────────────────────────────────────────────
//
//   authenticate → authorize (brand ⇒ workspace) → idempotency → estimate cost
//   → RESERVE credits → create job → call provider → store outputs durably
//   → SETTLE credits against real usage → return the job
//
// Everything that can cost money or leak data is decided here, on the server.
// The browser sends intent; it never sends a price, a balance, a model the
// registry doesn't know, or a URL we will fetch.
//
// ─── Actions ─────────────────────────────────────────────────────────────────
//
//   { action: 'models'  }                       capability + availability
//   { action: 'estimate', model, settings }     credits this would cost
//   { action: 'generate', … }                   run a job (default)
//   { action: 'cancel', jobId }                 release the reservation
//
// ─── Rules ───────────────────────────────────────────────────────────────────
//
//   • A real Supabase user is required. The anon key alone is not enough:
//     provider spend must always be attributable to an account.
//   • `brandId` must be a uuid the caller is an editor of; the workspace is
//     derived from the brand, never taken from the request.
//   • `idempotencyKey` makes a retry free: the same key returns the same job
//     instead of calling the provider (and charging) twice.
//   • Provider error bodies never reach the response. They go to
//     image_generation_job_diagnostics, which no client role can read.

import { corsHeaders } from '../_shared/cors.ts';
import { withCors } from '../_shared/rate_limit.ts';
import { createServiceClient, createUserClient } from '../_shared/supabase.ts';
import {
  IMAGE_MODELS,
  coerceSettings,
  findImageModel,
  isModelAvailable,
  resolveAutoModel,
  vendorModelFor,
  type ImageModelDef,
} from '../_shared/imageModels.ts';
import { providerFor } from '../_shared/imageProviders.ts';
import {
  ImageGenerationError,
  imageError,
  normalizeThrown,
  type NormalizedError,
} from '../_shared/imageErrors.ts';
import {
  computeCost,
  creditsToUsd,
  settleCost,
  PRICING_VERSION,
  USD_PER_CREDIT,
} from '../_shared/pricing.ts';
import {
  resolveReferences,
  storeOutputs,
  type ReferenceInput,
} from '../_shared/imageRefs.ts';

const FUNCTION_NAME = 'ai-generate-image';
/** Hard ceiling for one provider call chain. */
const PROVIDER_DEADLINE_MS = 170_000;
/** Concurrent in-flight jobs per workspace — stops a runaway loop. */
const MAX_CONCURRENT_JOBS = 6;

const cors = { ...corsHeaders, 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const getEnv = (k: string) => Deno.env.get(k);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Contract ────────────────────────────────────────────────────────────────

interface GenerateBody {
  action?: 'models' | 'estimate' | 'generate' | 'cancel';
  brandId?: string;
  projectId?: string;
  designId?: string;
  jobId?: string;
  idempotencyKey?: string;
  operation?: string;
  model?: string;
  userPrompt?: string;
  compiledPrompt?: string;
  negativePrompt?: string;
  aspectRatio?: string;
  size?: number;
  quality?: string;
  count?: number;
  seed?: number;
  references?: ReferenceInput[];
  /** Legacy fields kept so an old client still gets a clear answer. */
  prompt?: string;
  width?: number;
  height?: number;
}

interface JobResponse {
  job: {
    id: string;
    status: string;
    operation: string;
    provider: string;
    model: string;
    userPrompt: string;
    compiledPrompt: string | null;
    settings: Record<string, unknown>;
    outputs: unknown[];
    estimatedCredits: number;
    chargedCredits: number;
    costUsd: number | null;
    costSource: string | null;
    latencyMs: number | null;
    errorCode: string | null;
    errorMessage: string | null;
    createdAt: string;
    completedAt: string | null;
  };
  credits: { balance: number; reserved: number };
  warnings?: string[];
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: cors });
}

function errorResponse(e: NormalizedError, extra: Record<string, unknown> = {}): Response {
  return json({ error: e.code, message: e.message, retryable: e.retryable, ...extra }, e.status);
}

// ─── Auth + tenancy ──────────────────────────────────────────────────────────

interface Caller { userId: string; authHeader: string }

async function requireCaller(req: Request): Promise<Caller> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw imageError('authentication', { message: 'Sign in to generate images.' });
  }
  const userClient = createUserClient(authHeader);
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user?.id) {
    throw imageError('authentication', { message: 'Sign in to generate images.' });
  }
  return { userId: data.user.id, authHeader };
}

/**
 * The workspace is derived from the brand and the caller's membership is
 * checked against it — a client-supplied workspace id is never trusted.
 */
async function requireBrandAccess(
  caller: Caller,
  brandId: string | undefined,
): Promise<{ brandId: string; workspaceId: string }> {
  if (!brandId || !UUID_RE.test(brandId)) {
    throw imageError('invalid_input', {
      message: 'Open a saved brand to generate images. Local demo brands cannot be used.',
      providerError: `bad brandId: ${brandId}`,
    });
  }
  const userClient = createUserClient(caller.authHeader);
  // RLS decides: a brand the caller cannot see simply is not returned.
  const { data: brand, error } = await userClient
    .from('brands')
    .select('id, workspace_id, user_id')
    .eq('id', brandId)
    .maybeSingle();

  if (error || !brand) {
    throw imageError('invalid_input', {
      message: 'That brand is not available to your account.',
      providerError: `brand lookup failed: ${error?.message ?? 'not found'}`,
    });
  }

  let workspaceId = (brand as { workspace_id?: string }).workspace_id;
  if (!workspaceId) {
    // Legacy brand with no workspace — fall back to the caller's own workspace.
    const { data: ws } = await userClient
      .from('workspaces').select('id').eq('owner_id', caller.userId).limit(1).maybeSingle();
    workspaceId = (ws as { id?: string } | null)?.id;
  }
  if (!workspaceId) {
    throw imageError('invalid_input', { message: 'No workspace is associated with this brand.' });
  }
  return { brandId, workspaceId };
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function modelsAction() {
  const forceMock = (getEnv('AI_IMAGE_VENDOR') ?? '').toLowerCase() === 'mock';
  return {
    models: IMAGE_MODELS.map((m) => {
      const available = forceMock ? m.vendor === 'mock' : isModelAvailable(m, getEnv);
      return {
        id: m.id,
        vendor: m.vendor,
        tier: m.tier,
        available,
        reason: available ? undefined : 'unavailable',
        caps: m.caps,
      };
    }),
    auto: forceMock ? 'mock:svg' : resolveAutoModel(getEnv).id,
    pricingVersion: PRICING_VERSION,
    usdPerCredit: USD_PER_CREDIT,
  };
}

function resolveModel(requested: string | undefined): ImageModelDef {
  const forceMock = (getEnv('AI_IMAGE_VENDOR') ?? '').toLowerCase() === 'mock';
  if (forceMock) return findImageModel('mock:svg')!;
  if (!requested || requested === 'auto') return resolveAutoModel(getEnv);
  const def = findImageModel(requested);
  if (!def) {
    throw imageError('invalid_input', { message: `Unknown model: ${requested}` });
  }
  if (!isModelAvailable(def, getEnv)) {
    throw imageError('unsupported_setting', {
      message: `${def.id} is not enabled on this deployment.`,
      providerError: `model unavailable: ${def.id} (${def.keyEnv ?? 'n/a'})`,
    });
  }
  return def;
}

function estimateFor(body: GenerateBody) {
  const def = resolveModel(body.model);
  const settings = coerceSettings(def, {
    aspectRatio: body.aspectRatio,
    size: body.size,
    quality: body.quality,
    count: body.count,
    seed: body.seed,
    negativePrompt: body.negativePrompt,
    referenceCount: body.references?.length ?? 0,
  });
  const cost = computeCost({
    model: def.id,
    imageCount: settings.count,
    longEdge: settings.size,
    quality: settings.quality,
  });
  return { def, settings, cost };
}

// ─── Generate ────────────────────────────────────────────────────────────────

async function generateAction(req: Request, body: GenerateBody): Promise<Response> {
  const caller = await requireCaller(req);
  const { brandId, workspaceId } = await requireBrandAccess(caller, body.brandId);
  const service = createServiceClient();

  const userPrompt = (body.userPrompt ?? body.prompt ?? '').trim();
  if (!userPrompt) {
    throw imageError('invalid_input', { message: 'Describe the image you want.' });
  }
  if (userPrompt.length > 4000) {
    throw imageError('invalid_input', { message: 'That prompt is too long (4000 characters max).' });
  }

  // ── Idempotency: the same key returns the same job, never a second charge.
  const idempotencyKey = typeof body.idempotencyKey === 'string' && body.idempotencyKey.length <= 200
    ? body.idempotencyKey
    : null;
  if (idempotencyKey) {
    const { data: existing } = await service
      .from('image_generation_jobs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (existing) {
      return json(await shapeJobResponse(service, existing, workspaceId, ['duplicate request — returning the original job']));
    }
  }

  // ── Runaway guard.
  const { count: activeCount } = await service
    .from('image_generation_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .in('status', ['queued', 'running']);
  if ((activeCount ?? 0) >= MAX_CONCURRENT_JOBS) {
    throw imageError('rate_limited', {
      message: 'Too many generations running. Wait for one to finish.',
    });
  }

  const { def, settings, cost } = estimateFor(body);
  const warnings = [...settings.adjustments];

  // ── References: inline bytes or our own storage only. Never a caller URL.
  const { resolved: references, warnings: refWarnings } = await resolveReferences(
    body.references ?? [],
    { brandId, userId: caller.userId, maxCount: settings.maxReferences, client: service },
  );
  warnings.push(...refWarnings);

  // ── Create the job row FIRST so the work is durable before money moves.
  const jobInsert = {
    workspace_id: workspaceId,
    brand_id: brandId,
    user_id: caller.userId,
    project_id: body.projectId && UUID_RE.test(body.projectId) ? body.projectId : null,
    design_id: typeof body.designId === 'string' ? body.designId.slice(0, 200) : null,
    status: 'queued',
    operation: ['generate', 'variation', 'refine', 'regenerate'].includes(body.operation ?? '')
      ? body.operation
      : 'generate',
    provider: def.vendor,
    model: def.id,
    user_prompt: userPrompt,
    compiled_prompt: (body.compiledPrompt ?? '').trim() || null,
    negative_prompt: settings.negativePrompt ?? null,
    settings: {
      aspectRatio: settings.aspectRatio,
      size: settings.size,
      quality: settings.quality ?? null,
      count: settings.count,
      seed: settings.seed ?? null,
      vendorModel: vendorModelFor(def, getEnv),
    },
    input_assets: references.map((r) => r.descriptor),
    estimated_credits: cost.credits,
    pricing_version: cost.pricingVersion,
    pricing_snapshot: cost.snapshot,
    idempotency_key: idempotencyKey,
  };

  const { data: job, error: jobErr } = await service
    .from('image_generation_jobs').insert(jobInsert).select('*').single();
  if (jobErr || !job) {
    // A unique violation means a concurrent request with the same key won.
    if (idempotencyKey && jobErr?.code === '23505') {
      const { data: winner } = await service
        .from('image_generation_jobs').select('*')
        .eq('workspace_id', workspaceId).eq('idempotency_key', idempotencyKey).maybeSingle();
      if (winner) {
        return json(await shapeJobResponse(service, winner, workspaceId, ['duplicate request']));
      }
    }
    throw imageError('storage_failure', { providerError: `job insert: ${jobErr?.message}` });
  }

  const jobId = job.id as string;

  // ── Reserve credits. Atomic; a shortfall never reaches the provider.
  const { data: reservation, error: reserveErr } = await service.rpc('reserve_credits', {
    _workspace_id: workspaceId,
    _job_id: jobId,
    _amount: cost.credits,
    _idem_key: `reserve:${jobId}`,
  });
  if (reserveErr) {
    await failJob(service, jobId, imageError('storage_failure', {
      providerError: `reserve: ${reserveErr.message}`,
    }));
    throw imageError('storage_failure', { providerError: `reserve: ${reserveErr.message}` });
  }
  const reserved = reservation as { ok: boolean; error?: string; balance?: number; required?: number };
  if (!reserved?.ok) {
    const e = imageError('insufficient_credits', {
      message: `This needs ${cost.credits} credits and you have ${reserved?.balance ?? 0}.`,
    });
    await failJob(service, jobId, e);
    return errorResponse(e.normalized, {
      jobId,
      requiredCredits: cost.credits,
      balance: reserved?.balance ?? 0,
    });
  }

  // ── Run the provider under a deadline.
  const startedAt = Date.now();
  await service.from('image_generation_jobs')
    .update({ status: 'running', started_at: new Date().toISOString() }).eq('id', jobId);

  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), PROVIDER_DEADLINE_MS);

  try {
    const provider = providerFor(def);
    const result = await provider({
      def,
      prompt: (body.compiledPrompt ?? '').trim() || userPrompt,
      negativePrompt: settings.negativePrompt,
      aspectRatio: settings.aspectRatio,
      size: settings.size,
      count: settings.count,
      seed: settings.seed,
      quality: settings.quality,
      references: references.map((r) => ({ role: r.role, bytes: r.bytes, mime: r.mime })),
      getEnv,
      signal: controller.signal,
    });
    warnings.push(...result.warnings);

    // ── Durable storage. Bytes outlive the request and any provider CDN.
    const outputs = await storeOutputs(result.images, { brandId, jobId, client: service });

    // ── Settle against what was actually delivered, refund the difference.
    const settled = settleCost(
      { model: def.id, imageCount: outputs.length, longEdge: settings.size, quality: settings.quality },
      result.usage,
    );
    const { data: settlement } = await service.rpc('settle_credits', {
      _workspace_id: workspaceId,
      _job_id: jobId,
      _reserved: cost.credits,
      _actual: settled.credits,
      _idem_key: `settle:${jobId}`,
    });

    const latencyMs = Date.now() - startedAt;
    const { data: finished } = await service
      .from('image_generation_jobs')
      .update({
        status: 'succeeded',
        output_assets: outputs,
        usage: result.usage ?? null,
        provider_request_id: result.providerRequestId ?? null,
        cost_usd: settled.usd,
        cost_source: settled.source,
        pricing_version: settled.pricingVersion,
        pricing_snapshot: settled.snapshot,
        charged_credits: (settlement as { charged?: number } | null)?.charged ?? settled.credits,
        latency_ms: latencyMs,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .select('*')
      .single();

    return json(await shapeJobResponse(service, finished ?? job, workspaceId, warnings));
  } catch (err) {
    const e = err instanceof ImageGenerationError ? err : normalizeThrown(def.vendor, err);
    // The whole reservation goes back: a failed job costs nothing.
    await service.rpc('release_credits', {
      _workspace_id: workspaceId,
      _job_id: jobId,
      _reserved: cost.credits,
      _reason: `job ${e.normalized.code}`,
      _idem_key: `release:${jobId}`,
    });
    await failJob(service, jobId, e, Date.now() - startedAt);
    return errorResponse(e.normalized, { jobId, warnings: warnings.length ? warnings : undefined });
  } finally {
    clearTimeout(deadline);
  }
}

async function failJob(
  service: ReturnType<typeof createServiceClient>,
  jobId: string,
  err: ImageGenerationError,
  latencyMs?: number,
): Promise<void> {
  await service.from('image_generation_jobs').update({
    status: 'failed',
    error_code: err.normalized.code,
    error_message: err.normalized.message,
    latency_ms: latencyMs ?? null,
    completed_at: new Date().toISOString(),
  }).eq('id', jobId);

  // Raw provider material — private table, no client role can read it.
  if (err.normalized.providerError || err.normalized.providerStatus) {
    await service.from('image_generation_job_diagnostics').upsert({
      job_id: jobId,
      provider_status: err.normalized.providerStatus ?? null,
      provider_error: err.normalized.providerError ?? null,
      detail: { code: err.normalized.code },
    });
  }
}

async function cancelAction(req: Request, body: GenerateBody): Promise<Response> {
  const caller = await requireCaller(req);
  const jobId = body.jobId;
  if (!jobId || !UUID_RE.test(jobId)) {
    throw imageError('invalid_input', { message: 'A job id is required to cancel.' });
  }
  const service = createServiceClient();
  const { data: job } = await service
    .from('image_generation_jobs').select('*').eq('id', jobId).maybeSingle();
  if (!job) throw imageError('invalid_input', { message: 'That job no longer exists.' });
  if (job.user_id !== caller.userId) {
    throw imageError('authentication', { message: 'That job belongs to another account.' });
  }
  if (!['queued', 'running'].includes(job.status)) {
    return json(await shapeJobResponse(service, job, job.workspace_id, ['job had already finished']));
  }

  await service.rpc('release_credits', {
    _workspace_id: job.workspace_id,
    _job_id: jobId,
    _reserved: job.estimated_credits ?? 0,
    _reason: 'cancelled by user',
    _idem_key: `release:${jobId}`,
  });
  const { data: cancelled } = await service
    .from('image_generation_jobs')
    .update({ status: 'cancelled', error_code: 'cancelled', completed_at: new Date().toISOString() })
    .eq('id', jobId).select('*').single();

  return json(await shapeJobResponse(service, cancelled ?? job, job.workspace_id, []));
}

// ─── Response shaping ────────────────────────────────────────────────────────

async function shapeJobResponse(
  service: ReturnType<typeof createServiceClient>,
  job: Record<string, unknown>,
  workspaceId: string,
  warnings: string[],
): Promise<JobResponse> {
  const { data: account } = await service
    .from('credit_accounts')
    .select('balance_credits, reserved_credits')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  return {
    job: {
      id: job.id as string,
      status: job.status as string,
      operation: job.operation as string,
      provider: job.provider as string,
      model: job.model as string,
      userPrompt: job.user_prompt as string,
      compiledPrompt: (job.compiled_prompt as string) ?? null,
      settings: (job.settings as Record<string, unknown>) ?? {},
      outputs: (job.output_assets as unknown[]) ?? [],
      estimatedCredits: (job.estimated_credits as number) ?? 0,
      chargedCredits: (job.charged_credits as number) ?? 0,
      costUsd: (job.cost_usd as number) ?? null,
      costSource: (job.cost_source as string) ?? null,
      latencyMs: (job.latency_ms as number) ?? null,
      errorCode: (job.error_code as string) ?? null,
      errorMessage: (job.error_message as string) ?? null,
      createdAt: job.created_at as string,
      completedAt: (job.completed_at as string) ?? null,
    },
    credits: {
      balance: (account as { balance_credits?: number } | null)?.balance_credits ?? 0,
      reserved: (account as { reserved_credits?: number } | null)?.reserved_credits ?? 0,
    },
    warnings: warnings.length ? warnings : undefined,
  };
}

// ─── Entry ───────────────────────────────────────────────────────────────────

Deno.serve(withCors(cors, async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body: GenerateBody;
  try {
    body = (await req.json()) as GenerateBody;
  } catch {
    return json({ error: 'invalid_input', message: 'Malformed request.' }, 400);
  }

  try {
    switch (body.action) {
      case 'models':
        return json(modelsAction());

      case 'estimate': {
        await requireCaller(req);
        const { def, settings, cost } = estimateFor(body);
        return json({
          model: def.id,
          settings: {
            aspectRatio: settings.aspectRatio, size: settings.size,
            quality: settings.quality ?? null, count: settings.count,
            maxReferences: settings.maxReferences,
          },
          credits: cost.credits,
          usd: cost.usd,
          usdPerCredit: USD_PER_CREDIT,
          pricingVersion: cost.pricingVersion,
          adjustments: settings.adjustments,
        });
      }

      case 'cancel':
        return await cancelAction(req, body);

      default:
        return await generateAction(req, body);
    }
  } catch (err) {
    if (err instanceof ImageGenerationError) {
      // Log the private half; return only the normalized half.
      if (err.normalized.providerError) {
        console.error(`[${FUNCTION_NAME}] ${err.normalized.code}: ${err.normalized.providerError}`);
      }
      return errorResponse(err.normalized);
    }
    console.error(`[${FUNCTION_NAME}] unhandled:`, err);
    return json({ error: 'unknown', message: 'Image generation failed.' }, 500);
  }
}));

/** Exported for tests that import this module directly. */
export { creditsToUsd };
