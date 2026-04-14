/**
 * AI Design — brand-scoped Lovart/Luma-style design agent.
 *
 * Fullscreen surface (NO brand shell). Layout:
 *   ┌───────────────────────────────────────────────┐
 *   │  topbar (h-12): back · title · share           │
 *   ├────────────┬──────────────────────────────────┤
 *   │ chat panel │  infinite canvas (fills remaining)│
 *   │ (w-80)     │                                  │
 *   │            │                                  │
 *   └────────────┴──────────────────────────────────┘
 *
 * The root uses `h-screen overflow-hidden fixed inset-0` so the outer page
 * never scrolls — only the chat panel scrolls internally; the canvas owns
 * its own pan/zoom.
 *
 * When there are zero messages we render an "entry overlay" inside the
 * canvas area (Lovart-home style: hero + prompt + skill pills). The first
 * submit hides the overlay and keeps the workspace mounted.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PanelLeftClose, PanelLeft, Share2, Settings, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { ChatPanel } from '@/features/ai-design/components/ChatPanel';
import { InfiniteCanvas } from '@/features/ai-design/components/InfiniteCanvas';
import { EntryOverlay } from '@/features/ai-design/components/EntryOverlay';
import { useAiDesignStore } from '@/features/ai-design/hooks/useAiDesignStore';
import { runAgent } from '@/features/ai-design/lib/aiAgent';
import type { ChatMessage } from '@/features/ai-design/types';
import { cn } from '@/lib/utils';

function uid() {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function AiDesignPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand } = useBrandBySlug(slug);
  const [chatOpen, setChatOpen] = useState(true);

  const {
    messages,
    nodes,
    isThinking,
    selectedNodeId,
    activeSkill,
    init,
    setActiveSkill,
    addMessage,
    addNodes,
    setThinking,
    selectNode,
    moveNode,
  } = useAiDesignStore();

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

      try {
        const turn = await runAgent({ brand, history, userMessage: userText, skill });
        const suffix = turn.suggestions?.length
          ? `\n\nsuggestions: [${turn.suggestions.map((s) => `"${s}"`).join(', ')}]`
          : '';
        addMessage({
          id: uid(),
          role: 'assistant',
          content: turn.message + suffix,
          createdAt: Date.now(),
          producedNodeIds: turn.nodes.map((n) => n.id),
        });
        if (turn.nodes.length) addNodes(turn.nodes);
      } catch {
        toast.error('Design agent failed to respond.');
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
    [brand, addMessage, addNodes, setThinking],
  );

  const isEmpty = messages.length === 0;

  // Latest-assistant suggestions parsed from transcript (kept simple to
  // avoid a separate store field; matches trailing `suggestions: [...]`).
  const suggestions = (() => {
    const last = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!last) return undefined;
    const match = last.content.match(/suggestions:\s*\[(.+?)\]\s*$/i);
    if (!match) return undefined;
    return match[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
  })();

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden select-none">
      {/* ─── Topbar (h-12) ────────────────────────────────────────────── */}
      <header className="h-12 shrink-0 border-b flex items-center justify-between px-3 bg-background/80 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate(`/b/${slug}`)}
            title="Back to brand"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-5 w-px bg-border" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setChatOpen((v) => !v)}
            title={chatOpen ? 'Hide agent' : 'Show agent'}
          >
            {chatOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>
          <div className="flex items-center gap-2 px-2 min-w-0">
            <Wand2 className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-semibold truncate">
              AI Design
            </span>
            <span className="text-xs text-muted-foreground truncate">
              · {brand?.name ?? slug}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs">Settings</span>
          </Button>
          <Button size="sm" className="h-8 gap-1.5">
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs">Share</span>
          </Button>
        </div>
      </header>

      {/* ─── Main workspace ──────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex">
        {/* Chat rail — fixed width, collapsible. */}
        <div
          className={cn(
            'shrink-0 border-r bg-background transition-[width] duration-200',
            chatOpen ? 'w-80' : 'w-0 overflow-hidden',
          )}
        >
          {chatOpen && (
            <ChatPanel
              messages={messages}
              isThinking={isThinking}
              activeSkill={activeSkill}
              onSkillChange={setActiveSkill}
              onSend={runTurn}
              suggestions={suggestions}
              hideHeader
            />
          )}
        </div>

        {/* Canvas column — fills remaining width and height. */}
        <div className="flex-1 min-w-0 relative">
          <InfiniteCanvas
            nodes={nodes}
            brand={brand}
            selectedId={selectedNodeId}
            onSelect={selectNode}
            onMove={moveNode}
          />

          {isEmpty && !isThinking && (
            <EntryOverlay
              brand={brand}
              activeSkill={activeSkill}
              onSkillChange={setActiveSkill}
              onSubmit={runTurn}
            />
          )}
        </div>
      </div>
    </div>
  );
}
