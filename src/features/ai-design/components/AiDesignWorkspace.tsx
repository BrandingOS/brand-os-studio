/**
 * AiDesignWorkspace — the post-submit split layout.
 *
 * Left: chat/agent panel (ChatPanel). Right: infinite canvas (InfiniteCanvas).
 * Resizable via react-resizable-panels so the user can expand the canvas.
 */
import type { Brand } from '@/shared/types/brand';
import { ChatPanel } from './ChatPanel';
import { InfiniteCanvas } from './InfiniteCanvas';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { useAiDesignStore } from '../hooks/useAiDesignStore';
import { useMemo } from 'react';

interface Props {
  brand: Brand | null | undefined;
  onSend: (text: string) => void;
}

export function AiDesignWorkspace({ brand, onSend }: Props) {
  const messages = useAiDesignStore((s) => s.messages);
  const nodes = useAiDesignStore((s) => s.nodes);
  const isThinking = useAiDesignStore((s) => s.isThinking);
  const selectedNodeId = useAiDesignStore((s) => s.selectedNodeId);
  const activeSkill = useAiDesignStore((s) => s.activeSkill);
  const setActiveSkill = useAiDesignStore((s) => s.setActiveSkill);
  const selectNode = useAiDesignStore((s) => s.selectNode);
  const moveNode = useAiDesignStore((s) => s.moveNode);

  // Derive latest suggestions from the most recent assistant message that
  // produced any. We store suggestions on the AgentTurn but keep only the
  // message text in the transcript — so we trim `(suggestions: ...)` out
  // and pull them from producedNodeIds metadata in future work. For now,
  // surface any trailing parenthesized list in the last assistant message.
  const suggestions = useMemo(() => {
    const last = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!last) return undefined;
    const match = last.content.match(/suggestions:\s*\[(.+?)\]\s*$/i);
    if (!match) return undefined;
    return match[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
  }, [messages]);

  return (
    <div className="w-full h-full">
      <PanelGroup direction="horizontal" autoSaveId="ai-design-workspace">
        <Panel defaultSize={28} minSize={20} maxSize={45}>
          <ChatPanel
            messages={messages}
            isThinking={isThinking}
            activeSkill={activeSkill}
            onSkillChange={setActiveSkill}
            onSend={onSend}
            suggestions={suggestions}
          />
        </Panel>
        <PanelResizeHandle className="w-px bg-border hover:bg-primary/40 transition-colors" />
        <Panel defaultSize={72}>
          <InfiniteCanvas
            nodes={nodes}
            brand={brand}
            selectedId={selectedNodeId}
            onSelect={selectNode}
            onMove={moveNode}
          />
        </Panel>
      </PanelGroup>
    </div>
  );
}
