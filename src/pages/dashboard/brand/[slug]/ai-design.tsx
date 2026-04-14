/**
 * AI Design — brand-scoped Lovart-style design agent.
 *
 * Two phases:
 *   1. Entry screen — hero + prompt + skill pills.
 *   2. Workspace   — split: chat/agent panel | infinite canvas.
 *
 * Uses the shared BrandLayout (via BrandRouteLayout) with `maxWidth: 'full'`
 * so the canvas extends edge-to-edge.
 */
import { useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { useBrandPageConfig } from '@/shared/layouts/brandPageConfig';
import { toast } from 'sonner';
import { EntryScreen } from '@/features/ai-design/components/EntryScreen';
import { AiDesignWorkspace } from '@/features/ai-design/components/AiDesignWorkspace';
import { useAiDesignStore } from '@/features/ai-design/hooks/useAiDesignStore';
import { runAgent } from '@/features/ai-design/lib/aiAgent';
import type { ChatMessage } from '@/features/ai-design/types';

function uid() {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function AiDesignPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand } = useBrandBySlug(slug);

  useBrandPageConfig({
    brandName: brand?.name,
    maxWidth: 'full',
    innerNav: undefined,
  });

  const {
    phase,
    activeSkill,
    init,
    setPhase,
    setActiveSkill,
    addMessage,
    addNodes,
    setThinking,
  } = useAiDesignStore();

  // Reset per brand.
  useEffect(() => {
    if (!slug) return;
    init(slug);
  }, [slug, init]);

  const runTurn = useCallback(
    async (userText: string) => {
      const history = useAiDesignStore.getState().messages;
      const skill = useAiDesignStore.getState().activeSkill ?? undefined;

      const userMsg: ChatMessage = {
        id: uid(),
        role: 'user',
        content: userText,
        skill,
        createdAt: Date.now(),
      };
      addMessage(userMsg);
      setThinking(true);
      setPhase('workspace');

      try {
        const turn = await runAgent({
          brand,
          history,
          userMessage: userText,
          skill,
        });

        const suggestionSuffix = turn.suggestions?.length
          ? `\n\nsuggestions: [${turn.suggestions.map((s) => `"${s}"`).join(', ')}]`
          : '';

        const assistantMsg: ChatMessage = {
          id: uid(),
          role: 'assistant',
          content: turn.message + suggestionSuffix,
          createdAt: Date.now(),
          producedNodeIds: turn.nodes.map((n) => n.id),
        };
        addMessage(assistantMsg);
        if (turn.nodes.length) addNodes(turn.nodes);
      } catch (err) {
        toast.error('Design agent failed to respond. Try again?');
        addMessage({
          id: uid(),
          role: 'assistant',
          content: 'Something went wrong — please try again.',
          createdAt: Date.now(),
        });
      } finally {
        setThinking(false);
      }
    },
    [brand, addMessage, addNodes, setThinking, setPhase],
  );

  return (
    <div
      className="flex flex-col"
      style={{ height: 'calc(100vh - 3.5rem)' }}
    >
      {phase === 'entry' ? (
        <EntryScreen
          brand={brand}
          activeSkill={activeSkill}
          onSkillChange={setActiveSkill}
          onSubmit={runTurn}
        />
      ) : (
        <AiDesignWorkspace brand={brand} onSend={runTurn} />
      )}
    </div>
  );
}
