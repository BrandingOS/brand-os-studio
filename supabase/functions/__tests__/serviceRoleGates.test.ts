// ============================================================================
// A function holding the service-role key bypasses RLS, so it must authorize the caller
// itself. This test reads every Edge Function and fails when one reaches for that key
// without a gate in front of it — the class of hole that let `check-plan-limit` report
// any workspace's plan and `cleanup-onboarding-scratch` delete anyone's uploads.
//
// It is a grep, not a proof. It cannot tell a good check from a bad one; it can tell that
// SOMEONE thought about it, which is what stopped being true twice.
// ============================================================================
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FUNCTIONS_DIR = join(process.cwd(), 'supabase/functions');

/** Ways a function can legitimately establish who is calling. */
const GATES = [
  'requireCaller(',          // a verified user
  'requireCronSecret(',      // a scheduled job with a shared secret
  'auth.getUser()',          // the older hand-rolled form
  'constructEvent(',         // a signed Stripe webhook
  'PURGE_CRON_SECRET',       // purge-deleted-accounts' inline check
];

/** `_shared` modules are libraries: their callers carry the gate. */
const LIBRARY = new Set(['_shared', '__tests__']);

function functionDirs(): string[] {
  return readdirSync(FUNCTIONS_DIR)
    .filter((d) => !LIBRARY.has(d) && statSync(join(FUNCTIONS_DIR, d)).isDirectory())
    .filter((d) => existsSync(join(FUNCTIONS_DIR, d, 'index.ts')));
}

const read = (dir: string) => readFileSync(join(FUNCTIONS_DIR, dir, 'index.ts'), 'utf8');

describe('service-role Edge Functions authorize their caller', () => {
  const dirs = functionDirs();

  it('finds the functions', () => {
    expect(dirs.length).toBeGreaterThan(8);
  });

  it.each(dirs)('%s gates its service-role access', (dir) => {
    const source = read(dir);
    if (!/createServiceClient\(|SUPABASE_SERVICE_ROLE_KEY/.test(source)) return;
    const gated = GATES.some((g) => source.includes(g));
    expect(gated, `${dir} uses the service role with no caller check`).toBe(true);
  });

  it('no function trusts a workspaceId from the request body without resolving it', () => {
    for (const dir of dirs) {
      const source = read(dir);
      const takesWorkspaceFromBody = /body\??\.workspaceId/.test(source)
        || /\{[^}]*\bworkspaceId\b[^}]*\}\s*=\s*await req\.json\(\)/.test(source);
      if (!takesWorkspaceFromBody) continue;
      const verifies = /resolveWorkspaceContext\(|resolveBrandContext\(|workspace_members/.test(source);
      expect(verifies, `${dir} reads workspaceId from the body without verifying membership`).toBe(true);
    }
  });

  // A29, A31 — a signed-in client must not be able to drop the header and reach a free,
  // unmetered path; the proxy requires a JWT and spends from the wallet.
  it('the text-AI proxy requires a JWT rather than a body-supplied session id', () => {
    const proxy = read('anthropic-proxy');
    expect(proxy).toContain('requireCaller(');
    expect(proxy).not.toMatch(/\brequireSession\(/);
    expect(proxy).toMatch(/holdTextCredits|reserve_credits/);
  });

  // A26
  it('the scratch cleanup job is cron-only', () => {
    expect(read('cleanup-onboarding-scratch')).toContain('requireCronSecret(');
  });

  // A27
  it('finalize-onboarding-assets proves the scratch session belongs to the caller', () => {
    const finalize = read('finalize-onboarding-assets');
    expect(finalize).toMatch(/owner !== user\.id/);
    expect(finalize).toContain('effective_capabilities');
  });

  // A2
  it('check-plan-limit answers from the database, not a TypeScript table', () => {
    const check = read('check-plan-limit');
    expect(check).toContain('resolveWorkspaceContext(');
    expect(check).toContain('check_limit');
    expect(check).not.toContain('getPlanLimit');
  });
});
