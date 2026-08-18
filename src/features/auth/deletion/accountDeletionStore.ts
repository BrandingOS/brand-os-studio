/**
 * Where the pending-deletion state lives.
 *
 * Deliberately NOT `sessionStore`: `AuthState` is a shared contract that
 * ProtectedRoute, useAuth and the auth tests all read, and one feature's
 * lifecycle does not belong in it.
 */
import { create } from 'zustand';
import type { PendingDeletion } from './accountDeletion';

interface AccountDeletionStore {
  /** False when migration 029 is not deployed — the whole control hides. */
  available: boolean;
  pending: PendingDeletion | null;
  setState: (available: boolean, pending: PendingDeletion | null) => void;
  clear: () => void;
}

export const useAccountDeletionStore = create<AccountDeletionStore>((set) => ({
  available: false,
  pending: null,
  setState: (available, pending) => set({ available, pending }),
  clear: () => set({ pending: null }),
}));
