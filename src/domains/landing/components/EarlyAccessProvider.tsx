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
