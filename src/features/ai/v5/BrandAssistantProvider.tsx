/**
 * BrandAssistantProvider — mounts the floating AI assistant FAB and drawer.
 *
 * Listens for `brandos:open-assistant` window events (dispatched from the
 * command palette) so any surface can open the assistant without imports.
 *
 * Provider is the default mock; the Claude provider is opt-in via env.
 */
import * as React from 'react';
import { BrandAssistantDrawer } from './BrandAssistantDrawer';
import { AssistantTrigger } from './AssistantTrigger';
import { mockProvider } from './providers/mockProvider';
import type { AssistantMessage, AssistantProvider } from './types';
import { useBrandStore } from '@/shared/store/brandStore';

interface AssistantContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  messages: AssistantMessage[];
  send: (text: string) => Promise<void>;
  isThinking: boolean;
  reset: () => void;
}

const AssistantContext = React.createContext<AssistantContextValue | null>(null);

export function useBrandAssistant() {
  const ctx = React.useContext(AssistantContext);
  if (!ctx) throw new Error('useBrandAssistant must be used inside <BrandAssistantProvider>');
  return ctx;
}

export function BrandAssistantProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<AssistantMessage[]>([]);
  const [isThinking, setIsThinking] = React.useState(false);
  const currentBrand = useBrandStore((s) => s.current);
  const provider: AssistantProvider = mockProvider;

  // Listen for global open events (from command palette etc.)
  React.useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('brandos:open-assistant', onOpen);
    return () => window.removeEventListener('brandos:open-assistant', onOpen);
  }, []);

  // ⌘J keyboard shortcut
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setOpen((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const send = React.useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      const userMsg: AssistantMessage = { id: crypto.randomUUID(), role: 'user', content: text, createdAt: Date.now() };
      setMessages((prev) => [...prev, userMsg]);
      setIsThinking(true);
      try {
        const reply = await provider.send({ message: text, brand: currentBrand, history: messages });
        const assistantMsg: AssistantMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: reply.content,
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: 'assistant', content: 'Sorry — something went wrong. Try again.', createdAt: Date.now() },
        ]);
      } finally {
        setIsThinking(false);
      }
    },
    [provider, currentBrand, messages],
  );

  const reset = React.useCallback(() => setMessages([]), []);

  const value = React.useMemo<AssistantContextValue>(
    () => ({ open, setOpen, messages, send, isThinking, reset }),
    [open, messages, send, isThinking, reset],
  );

  return (
    <AssistantContext.Provider value={value}>
      {children}
      <AssistantTrigger />
      <BrandAssistantDrawer />
    </AssistantContext.Provider>
  );
}
