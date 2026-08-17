// Credits, read from the database and refreshed after every job.
//
// The number shown is always the server's. A generation returns the new
// balance, so the display never drifts from what was actually charged.

import { useCallback, useEffect, useState } from 'react';
import { getCreditAccount, listCreditHistory, type CreditAccount, type CreditEntry } from '@/features/image-generation';

export interface CreditsState {
  account: CreditAccount | null;
  history: CreditEntry[];
  loading: boolean;
  /** Apply the balance a job just reported, without a round trip. */
  applyBalance: (balance: number) => void;
  refresh: () => Promise<void>;
}

export function useCredits(workspaceId: string | null | undefined): CreditsState {
  const [account, setAccount] = useState<CreditAccount | null>(null);
  const [history, setHistory] = useState<CreditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!workspaceId) { setAccount(null); setHistory([]); return; }
    setLoading(true);
    try {
      const [acct, entries] = await Promise.all([
        getCreditAccount(workspaceId),
        listCreditHistory(workspaceId, 20),
      ]);
      setAccount(acct);
      setHistory(entries);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const applyBalance = useCallback((balance: number) => {
    setAccount((a) => (a ? { ...a, balance } : a));
  }, []);

  return { account, history, loading, applyBalance, refresh };
}
