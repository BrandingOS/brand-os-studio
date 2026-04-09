/**
 * EarlyAccessProvider
 *
 * Wraps the app in a context that exposes a single `openEarlyAccess()`
 * function. Any button anywhere in the page can call it to open the
 * early-access modal — there's only ONE modal mounted at App root, but
 * many CTAs trigger it.
 *
 * Pair with <EarlyAccessDialog /> mounted at App root.
 *
 * Usage:
 *   const { open } = useEarlyAccess();
 *   <button onClick={open}>Get Early Access</button>
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface EarlyAccessContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const EarlyAccessContext = createContext<EarlyAccessContextValue | null>(null);

export function EarlyAccessProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ isOpen, open, close }),
    [isOpen, open, close],
  );

  return (
    <EarlyAccessContext.Provider value={value}>
      {children}
    </EarlyAccessContext.Provider>
  );
}

export function useEarlyAccess(): EarlyAccessContextValue {
  const ctx = useContext(EarlyAccessContext);
  if (!ctx) {
    throw new Error(
      'useEarlyAccess must be used inside <EarlyAccessProvider>',
    );
  }
  return ctx;
}
