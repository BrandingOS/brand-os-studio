// Talking to the deployed image service from node, with the money guard in front.
//
// Two rules this file exists to keep:
//
//   1. NOTHING is generated before the whole run has been priced by the SERVER
//      and the total checked against the budget. The browser never prices a
//      request in this product and neither does the harness — `estimate` is
//      free, so there is no reason to guess.
//   2. Every cell carries an idempotency key derived from its own id, so a
//      resumed or retried run returns the job that was already paid for rather
//      than buying a second copy of it.

import { createHash } from 'node:crypto';

const SUPABASE_URL = 'https://ciojgoozobzbeglwdxcz.supabase.co';
const FN = `${SUPABASE_URL}/functions/v1/ai-generate-image`;

/** Publishable anon key — the same one the shipped bundle carries. */
const ANON = process.env.SUPABASE_ANON_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpb2pnb296b2J6YmVnbHdkeGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDQ4ODgsImV4cCI6MjA5MTMyMDg4OH0.qwfviBXKJh1i2-vyUYtCIdUXMZM5ICBJtBTEmqDYbng';

export interface Estimate {
  model: string;
  credits: number;
  usd: number;
  pricingVersion: string;
  settings: { aspectRatio: string; size: number; count: number; maxReferences: number };
}

export interface JobOutput { url: string; storagePath?: string; width?: number; height?: number; seed?: number }
export interface JobResult {
  job: {
    id: string; status: string; model: string; provider: string;
    outputs: JobOutput[]; warnings?: string[];
    settings?: Record<string, unknown>;
    failure?: { code: string; message: string; retryable?: boolean } | null;
  };
  /**
   * The server reports the BALANCE, not the charge. Deriving the charge from
   * the balance delta is the only reading that cannot drift from the ledger —
   * an earlier version of this file invented a `charged` field, recorded 0 for
   * every cell, and would have reported a paid run as free.
   */
  credits?: { balance: number; reserved: number };
}

/** A user access token. Money-spending actions refuse the anon key alone. */
export function requireJwt(): string {
  const jwt = process.env.JWT?.trim();
  if (!jwt) {
    throw new Error(
      'JWT is required for live mode.\n' +
      '  In the app, signed in, run in the browser console:\n' +
      '    JSON.parse(localStorage["sb-ciojgoozobzbeglwdxcz-auth-token"]).access_token\n' +
      '  Or sign in from the shell with an account that has credits.',
    );
  }
  return jwt;
}

async function post<T>(body: unknown, jwt: string, timeoutMs = 200_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(FN, {
      method: 'POST',
      headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let parsed: unknown = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
    if (!res.ok) {
      const p = (parsed ?? {}) as Record<string, unknown>;
      const err = new Error((p.message as string) ?? `Image service error ${res.status}`);
      (err as Error & { code?: string }).code = (p.error as string) ?? 'unknown';
      throw err;
    }
    return parsed as T;
  } finally {
    clearTimeout(timer);
  }
}

export function listModels(jwt: string) {
  return post<{ models: Array<{ id: string; available: boolean; tier: string; caps: Record<string, unknown> }> }>(
    { action: 'models' }, jwt, 30_000,
  );
}

export function estimate(
  input: { model?: string; aspectRatio?: string; size?: number; quality?: string; count?: number; referenceCount?: number },
  jwt: string,
): Promise<Estimate> {
  return post<Estimate>({
    action: 'estimate',
    model: input.model,
    aspectRatio: input.aspectRatio,
    size: input.size,
    quality: input.quality,
    count: input.count,
    references: Array.from({ length: input.referenceCount ?? 0 }, () => ({ role: 'image' })),
  }, jwt, 30_000);
}

export interface GenerateInput {
  brandId: string;
  userPrompt: string;
  compiledPrompt?: string;
  negativePrompt?: string;
  model?: string;
  aspectRatio?: string;
  size?: number;
  count?: number;
  references?: Array<{ role: string; dataUrl?: string; storagePath?: string }>;
  /** Derived from the record id, so a rerun of the same cell is never charged twice. */
  idempotencyKey: string;
}

export function generate(input: GenerateInput, jwt: string): Promise<JobResult> {
  return post<JobResult>({ action: 'generate', ...input }, jwt);
}

/** Stable across reruns of the same cell in the same run. */
/** The workspace balance, straight from the ledger table. */
export async function currentBalance(jwt: string): Promise<number | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/credit_accounts?select=balance_credits`, {
      headers: { apikey: ANON, Authorization: `Bearer ${jwt}` },
    });
    const rows = (await res.json()) as Array<{ balance_credits?: number }>;
    return rows?.[0]?.balance_credits ?? null;
  } catch {
    return null;
  }
}

export function idempotencyKeyFor(recordId: string, runId: string): string {
  return `eval_${createHash('sha256').update(`${runId}::${recordId}`).digest('hex').slice(0, 32)}`;
}

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

/**
 * Price every cell, sum it, and refuse the whole run if it exceeds the budget.
 * Refusing BEFORE the first call is the only useful place to refuse: a guard
 * that trips halfway through has already spent the money it was protecting.
 */
export async function priceRun(
  cells: Array<{ id: string; model?: string; aspectRatio?: string; size?: number; count?: number; referenceCount?: number }>,
  budgetCredits: number,
  jwt: string,
): Promise<{ total: number; perCell: Map<string, Estimate> }> {
  const perCell = new Map<string, Estimate>();
  let total = 0;
  for (const cell of cells) {
    const e = await estimate(cell, jwt);
    perCell.set(cell.id, e);
    total += e.credits;
  }
  if (total > budgetCredits) {
    throw new Error(
      `This run would cost ${total} credits, over the ${budgetCredits}-credit budget. ` +
      `Reduce --models, --count or --tasks, or raise --budget-credits deliberately.`,
    );
  }
  return { total, perCell };
}
