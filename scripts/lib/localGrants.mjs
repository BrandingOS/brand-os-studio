// ============================================================================
// The local Supabase stack's default privileges are wrong. Production's are right.
//
// Symptom: anything that reads a tenant table as `authenticated` fails with
// `permission denied for table brands ... GRANT SELECT ON public.brands TO authenticated`,
// and a 22-suite SQL run reports as 6.
//
// Cause, found 2026-09-03 by reading `pg_default_acl`: the local database carries TWO
// default-ACL entries for tables in `public`. The one for `supabase_admin` grants
// `arwdDxtm` — everything. The one for **`postgres`**, which is the role migrations
// actually run as, grants anon/authenticated/service_role only `Dxtm`: TRUNCATE,
// REFERENCES, TRIGGER, MAINTAIN, and no SELECT/INSERT/UPDATE/DELETE. So every table a
// migration creates is unreadable by the app's roles, on that machine only. A
// `supabase db reset` puts it back.
//
// It is NOT the migrations, and three independent things say so:
//   • the grants survive a full down→up cycle — all twelve down files, then all twelve up
//     files, with the grants confirmed present before and after;
//   • `npm run test:db:stock`, which restores the migrated schema into a stock
//     `postgres:17`, is 22/22;
//   • no migration in the repo contains a REVOKE on any tenant table.
//
// PRODUCTION IS CONFIGURED CORRECTLY. Its own schema dump (read-only, same day) contains
// `ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO
// "anon" / "authenticated" / "service_role"` and `GRANT ALL ON TABLE "public"."brands"` for
// all three — so every table created by 035–046 gets its grants automatically and the
// deployment needs no grant step.
//
// The repair below is exactly what production already has. It is deliberately NOT a
// migration: production does not need it, and a migration granting DML on every table
// would change a security posture nobody asked to change.
// ============================================================================
import { execFileSync } from 'node:child_process';

export const REPAIR_SQL = `
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
`;

const CHECK = "select has_table_privilege('authenticated','public.brands','SELECT')";

/** True when the app's roles can actually read a tenant table. */
export function grantsPresent(dbUrl) {
  try {
    return execFileSync('psql', [dbUrl, '-tAc', CHECK], { encoding: 'utf8' }).trim() === 't';
  } catch {
    return false;
  }
}

/**
 * Bring the local database up to production's configuration if it is not already there.
 * Returns 'ok' (nothing needed), 'repaired', or throws.
 */
export function ensureLocalGrants(dbUrl, log = console.log) {
  if (grantsPresent(dbUrl)) return 'ok';
  log("▸ repairing the local stack's default privileges (scripts/lib/localGrants.mjs)");
  execFileSync('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1', '-q', '-c', REPAIR_SQL], { stdio: 'inherit' });
  if (!grantsPresent(dbUrl)) {
    throw new Error(
      "'authenticated' still has no SELECT on public.brands after the repair. " +
      'Local stack problem, not the migrations — try `supabase stop && supabase start`.');
  }
  return 'repaired';
}
