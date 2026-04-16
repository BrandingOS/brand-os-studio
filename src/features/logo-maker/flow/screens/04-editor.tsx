import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Canvas as FabricCanvas } from 'fabric';
import { ArrowLeft, ArrowRight, Undo2, Redo2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAutoSave, EditorChrome } from '@/features/editor/core';

import { Canvas } from '../components/editor/Canvas';
import { ToolsPanel } from '../components/editor/ToolsPanel';
import { PropertiesPanel } from '../components/editor/PropertiesPanel';
import { PreviewChips, type PreviewBg } from '../components/editor/PreviewChips';
import { useEditorHistory } from '../hooks/useEditorHistory';
import { useEditorShortcuts, type ToolId } from '../hooks/useEditorShortcuts';
import { addCircle, addLine, addRect, addText, loadSVGIntoCanvas } from '../utils/fabric-setup';
import { useLogoMakerStore } from '../state/useLogoMakerStore';

// Local draft key per logo. Replaced by Supabase persistence in Phase 9.
const draftKey = (id: string) => `logo-maker-flow-editor:${id}`;

export default function EditorScreen() {
  const navigate = useNavigate();
  const { logoId = 'blank' } = useParams();

  const [canvas, setCanvas] = useState<FabricCanvas | null>(null);
  const [tool, setTool] = useState<ToolId>('select');
  const [previewBg, setPreviewBg] = useState<PreviewBg>('primary');
  const [zoom, setZoom] = useState(1);
  const [initialSVG, setInitialSVG] = useState<string | null>(null);
  const didLoadDraft = useRef(false);

  const storeEditedSVG = useLogoMakerStore((s) => s.editedSVG);
  const setEditedSVG = useLogoMakerStore((s) => s.setEditedSVG);
  const setScreen = useLogoMakerStore((s) => s.setScreen);

  useEffect(() => {
    setScreen(4);
  }, [setScreen]);

  // Resolve initial SVG: route-driven takes precedence, then store, then blank.
  useEffect(() => {
    if (didLoadDraft.current) return;
    didLoadDraft.current = true;
    const saved = localStorage.getItem(draftKey(logoId));
    if (saved) {
      setInitialSVG(saved);
      return;
    }
    if (logoId !== 'blank' && storeEditedSVG) {
      setInitialSVG(storeEditedSVG);
      return;
    }
    setInitialSVG(null);
  }, [logoId, storeEditedSVG]);

  const history = useEditorHistory(canvas);

  // Derived, always-up-to-date SVG for auto-save.
  const currentSVG = useMemo(() => {
    if (!canvas) return null;
    try {
      return canvas.toSVG();
    } catch {
      return null;
    }
  }, [canvas, history.canUndo, history.canRedo]); // recompute after history changes

  const { saveState, markDirty, flush, retry } = useAutoSave({
    value: currentSVG,
    save: async (next) => {
      if (!next) return;
      localStorage.setItem(draftKey(logoId), next);
      setEditedSVG(next);
    },
    debounceMs: 1200,
    enabled: !!canvas,
  });

  // Anything Fabric emits is a dirty event.
  useEffect(() => {
    if (!canvas) return;
    const onChange = () => markDirty();
    canvas.on('object:added', onChange);
    canvas.on('object:modified', onChange);
    canvas.on('object:removed', onChange);
    return () => {
      canvas.off('object:added', onChange);
      canvas.off('object:modified', onChange);
      canvas.off('object:removed', onChange);
    };
  }, [canvas, markDirty]);

  const onReady = useCallback(
    (c: FabricCanvas) => {
      setCanvas(c);
      if (initialSVG) void loadSVGIntoCanvas(c, initialSVG);
    },
    [initialSVG],
  );

  const fit = useCallback(() => setZoom(0.8), []);
  const hundred = useCallback(() => setZoom(1), []);
  const zoomIn = useCallback(() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2))), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(0.25, +(z - 0.1).toFixed(2))), []);

  useEditorShortcuts({
    canvas,
    history,
    setTool,
    addText: () => canvas && addText(canvas),
    onSave: () => void flush(),
    onFit: fit,
    onHundred: hundred,
  });

  return (
    <div className="flex flex-col h-screen bg-background">
      <EditorChrome
        backTo="/logo-maker/brief"
        title="Logo editor"
        saveState={saveState}
        onRetry={retry}
        actions={
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={history.undo}
              disabled={!history.canUndo}
              title="Undo (⌘Z)"
            >
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={history.redo}
              disabled={!history.canRedo}
              title="Redo (⌘⇧Z)"
            >
              <Redo2 className="w-4 h-4" />
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button asChild size="sm" className="gap-2">
              <Link to={`/logo-maker/brand-kit/${logoId}`}>
                Build brand kit
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-1 min-h-0">
        <ToolsPanel
          activeTool={tool}
          onSelectTool={setTool}
          onAddText={() => canvas && addText(canvas)}
          onAddRect={() => canvas && addRect(canvas)}
          onAddCircle={() => canvas && addCircle(canvas)}
          onAddLine={() => canvas && addLine(canvas)}
        />

        <div className="flex-1 flex flex-col min-h-0 relative">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <PreviewChips value={previewBg} onChange={setPreviewBg} />
          </div>

          <div
            className={cn(
              'flex-1 flex items-center justify-center overflow-auto',
              'bg-[image:radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.08)_1px,transparent_0)]',
              '[background-size:20px_20px]',
            )}
          >
            <Canvas onReady={onReady} previewBg={previewBg} zoom={zoom} />
          </div>

          <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 rounded-md border border-border bg-card/90 backdrop-blur p-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut} title="Zoom out">
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums w-11 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn} title="Zoom in">
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <div className="w-px h-4 bg-border mx-0.5" />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fit} title="Fit (⌘0)">
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          <footer className="shrink-0 border-t border-border bg-card/40 px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Tool: <span className="text-foreground font-medium capitalize">{tool}</span>
              <span className="mx-3 text-muted-foreground/30">|</span>
              V · T · R · O · L
              <span className="mx-3 text-muted-foreground/30">|</span>
              ⌘Z / ⌘⇧Z · ⌘D · Del
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/logo-maker/brief')}
              className="gap-1.5 h-7"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to brief
            </Button>
          </footer>
        </div>

        <PropertiesPanel canvas={canvas} />
      </div>
    </div>
  );
}
