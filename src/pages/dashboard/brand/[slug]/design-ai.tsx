/**
 * Design with AI — brand-scoped canvas-first design surface.
 *
 * Fullscreen layout (no brand shell), built around a Fabric.js infinite
 * canvas. Direct-manipulation is primary; AI is an overlay assistant.
 *
 *   ┌─────────────────────────────────────────────┐
 *   │  topbar: back · title · undo/redo · zoom · export │
 *   ├─────────────────────────────────────────┬───┤
 *   │                                         │ I │
 *   │   [toolrail]    artboard (1080×1080)    │ n │
 *   │                                         │ s │
 *   │            ▼ floating AI bar ▼          │ p │
 *   └─────────────────────────────────────────┴───┘
 */
import { useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { DesignCanvas, type CanvasHandle } from '@/features/design-ai/Canvas';
import { Toolrail } from '@/features/design-ai/Toolrail';
import { Inspector } from '@/features/design-ai/Inspector';
import { TopBar } from '@/features/design-ai/TopBar';
import { AiBar } from '@/features/design-ai/AiBar';
import { useDesignAiStore } from '@/features/design-ai/store';
import { runAgent } from '@/features/ai-design/lib/aiAgent';
import type { SkillId } from '@/features/ai-design/types';

export default function DesignWithAiPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand } = useBrandBySlug(slug);
  const canvasRef = useRef<CanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const init = useDesignAiStore((s) => s.init);
  const undo = useDesignAiStore((s) => s.undo);
  const redo = useDesignAiStore((s) => s.redo);
  const setTool = useDesignAiStore((s) => s.setTool);
  const setGenerating = useDesignAiStore((s) => s.setGenerating);

  useEffect(() => {
    if (slug) init(slug);
  }, [slug, init]);

  // Hotkeys.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          const j = redo();
          if (j) canvasRef.current?.loadFromJson(j);
        } else {
          const j = undo();
          if (j) canvasRef.current?.loadFromJson(j);
        }
        return;
      }
      if (inField) return;
      const map: Record<string, Parameters<typeof setTool>[0]> = {
        v: 'select',
        t: 'text',
        r: 'rect',
        o: 'ellipse',
        l: 'line',
        f: 'frame',
      };
      const next = map[e.key.toLowerCase()];
      if (next) setTool(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, setTool]);

  const handleExport = useCallback(() => {
    const url = canvasRef.current?.exportPng();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${brand?.slug ?? 'design'}-${Date.now()}.png`;
    a.click();
    toast.success('Design exported');
  }, [brand]);

  const handlePickImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImageFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = '';
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const fabric = await import('fabric');
        const img = await fabric.FabricImage.fromURL(dataUrl);
        const canvas = canvasRef.current?.canvas;
        if (!canvas || !img) return;
        const max = 600;
        const scale = Math.min(1, max / Math.max(img.width ?? max, img.height ?? max));
        img.set({ left: 120, top: 120, scaleX: scale, scaleY: scale });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const handleAiSubmit = useCallback(
    async (userText: string, skill: SkillId | null) => {
      setGenerating(true);
      try {
        const turn = await runAgent({
          brand,
          history: [],
          userMessage: userText,
          skill: skill ?? undefined,
        });
        if (turn.nodes.length) {
          canvasRef.current?.addNodes(turn.nodes);
          toast.success(turn.message || `Added ${turn.nodes.length} element${turn.nodes.length === 1 ? '' : 's'}`);
        } else {
          toast.message(turn.message || 'No design produced — try a more specific prompt.');
        }
      } catch {
        toast.error('AI failed to respond. Try again.');
      } finally {
        setGenerating(false);
      }
    },
    [brand, setGenerating],
  );

  const zoomIn = () => {
    const c = canvasRef.current?.canvas;
    if (!c) return;
    canvasRef.current?.zoomTo(Math.min(4, c.getZoom() * 1.2));
  };
  const zoomOut = () => {
    const c = canvasRef.current?.canvas;
    if (!c) return;
    canvasRef.current?.zoomTo(Math.max(0.1, c.getZoom() / 1.2));
  };
  const zoomFit = () => canvasRef.current?.zoomToFit();

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
      <TopBar
        brand={brand}
        slug={slug ?? ''}
        onUndo={() => {
          const j = undo();
          if (j) canvasRef.current?.loadFromJson(j);
        }}
        onRedo={() => {
          const j = redo();
          if (j) canvasRef.current?.loadFromJson(j);
        }}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomFit={zoomFit}
        onExport={handleExport}
      />

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 relative bg-[radial-gradient(circle_at_1px_1px,_rgba(0,0,0,0.06)_1px,_transparent_0)] bg-[length:24px_24px]">
          <DesignCanvas ref={canvasRef} brand={brand} />
          <Toolrail onPickImage={handlePickImage} />
          <AiBar onSubmit={handleAiSubmit} />
        </div>
        <Inspector brand={brand} canvasHandle={canvasRef} />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFile}
      />
    </div>
  );
}
