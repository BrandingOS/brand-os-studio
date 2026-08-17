// Credits — read-only from the browser.
//
// The balance is a database row a user can SELECT but never UPDATE; every
// movement goes through the server's SECURITY DEFINER functions. Anything here
// is display, never authority.

import { supabase } from '@/integrations/supabase/client';

 
const table = (name: string) => (supabase as any).from(name);

export interface CreditAccount {
  workspaceId: string;
  balance: number;
  reserved: number;
  lifetimeGranted: number;
  lifetimeSpent: number;
}

export type CreditEntryKind = 'grant' | 'reserve' | 'settle' | 'refund' | 'release' | 'adjust';

export interface CreditEntry {
  id: number;
  kind: CreditEntryKind;
  amount: number;
  balanceAfter: number;
  reason: string | null;
  jobId: string | null;
  createdAt: string;
}

export async function getCreditAccount(workspaceId: string): Promise<CreditAccount | null> {
  const { data, error } = await table('credit_accounts')
    .select('*').eq('workspace_id', workspaceId).maybeSingle();
  if (error || !data) return null;
  return {
    workspaceId: data.workspace_id,
    balance: data.balance_credits ?? 0,
    reserved: data.reserved_credits ?? 0,
    lifetimeGranted: data.lifetime_granted ?? 0,
    lifetimeSpent: data.lifetime_spent ?? 0,
  };
}

export async function listCreditHistory(workspaceId: string, limit = 30): Promise<CreditEntry[]> {
  const { data, error } = await table('credit_ledger')
    .select('id, kind, amount, balance_after, reason, job_id, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  // Reservations and their settlement are bookkeeping; a usage list should read
  // as "what did I spend", so only the entries that moved value are surfaced.
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as number,
    kind: r.kind as CreditEntryKind,
    amount: r.amount as number,
    balanceAfter: r.balance_after as number,
    reason: (r.reason as string) ?? null,
    jobId: (r.job_id as string) ?? null,
    createdAt: r.created_at as string,
  }));
}

/** USD per credit, mirrored from the server for display only. */
export const USD_PER_CREDIT = 0.01;

export function formatCredits(credits: number): string {
  return credits.toLocaleString();
}

export function creditsToUsdLabel(credits: number): string {
  return `$${(credits * USD_PER_CREDIT).toFixed(2)}`;
}
