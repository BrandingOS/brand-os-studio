/**
 * Unified Editor Toolbar
 *
 * Consistent toolbar used across all editor experiences.
 * Adapts available tools based on editor mode configuration.
 */
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useEditor, type EditorTool, type EditorViewMode } from './EditorContext';
import {
  MousePointer2, Type, Square, Image, Sparkles, Pencil, Hand, ZoomIn,
  Undo2, Redo2, Save, Grid3X3, Magnet, Minus, Plus,
  PanelLeftClose, PanelRightClose, PanelLeft, PanelRight,
  Monitor, Layers, Maximize2, ChevronDown,
} from 'lucide-react';

// ─── Top Toolbar ─────────────────────────────────────────────────────

interface EditorTopToolbarProps {
  title?: string;
  onBack?: () => void;
  extraLeft?: React.ReactNode;
  extraRight?: React.ReactNode;
  className?: string;
}

export function EditorTopToolbar({ title, onBack, extraLeft, extraRight, className }: EditorTopToolbarProps) {
  const {
    viewMode, setViewMode, zoom, zoomIn, zoomOut, zoomToFit,
    canUndo, canRedo, undo, redo, save, isDirty, isSaving,
    showGrid, toggleGrid, snapToGrid, toggleSnap,
    leftPanelOpen, rightPanelOpen, toggleLeftPanel, toggleRightPanel,
  } = useEditor();

  return (
    <header className={cn('h-12 border-b bg-background flex items-center px-2 shrink-0', className)}>
      {/* Left section */}
      <div className="flex items-center gap-1">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8">
            <ChevronDown className="h-4 w-4 rotate-90" /> Back
          </Button>
        )}
        {title && <span className="text-sm font-medium ml-2 mr-4">{title}</span>}

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleLeftPanel}>
          {leftPanelOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={!canUndo}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={!canRedo}>
          <Redo2 className="h-4 w-4" />
        </Button>

        {extraLeft}
      </div>

      {/* Center section — View mode and zoom */}
      <div className="flex-1 flex items-center justify-center gap-2">
        {/* View mode switcher */}
        <div className="flex items-center bg-muted rounded-lg p-0.5">
          {([
            { mode: 'fixed' as const, icon: Monitor, label: 'Fixed' },
            { mode: 'slides' as const, icon: Layers, label: 'Slides' },
            { mode: 'freeform' as const, icon: Maximize2, label: 'Freeform' },
          ]).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                viewMode === mode ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-0.5 bg-muted rounded-lg px-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut}>
            <Minus className="h-3 w-3" />
          </Button>
          <button onClick={zoomToFit} className="px-2 text-xs font-medium text-muted-foreground hover:text-foreground min-w-[3rem] text-center">
            {zoom}%
          </button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1">
        {extraRight}

        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', showGrid && 'bg-muted')}
          onClick={toggleGrid}
        >
          <Grid3X3 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', snapToGrid && 'bg-muted')}
          onClick={toggleSnap}
        >
          <Magnet className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleRightPanel}>
          {rightPanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
        </Button>

        <Button
          variant={isDirty ? 'default' : 'ghost'}
          size="sm"
          className="h-8"
          onClick={save}
          disabled={!isDirty || isSaving}
        >
          <Save className="h-4 w-4 mr-1" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </header>
  );
}

// ─── Tool Sidebar ────────────────────────────────────────────────────

interface ToolConfig {
  tool: EditorTool;
  icon: typeof MousePointer2;
  label: string;
  shortcut?: string;
}

const defaultTools: ToolConfig[] = [
  { tool: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { tool: 'text', icon: Type, label: 'Text', shortcut: 'T' },
  { tool: 'shape', icon: Square, label: 'Shape', shortcut: 'R' },
  { tool: 'image', icon: Image, label: 'Image', shortcut: 'I' },
  { tool: 'logo', icon: Sparkles, label: 'Logo', shortcut: 'L' },
  { tool: 'draw', icon: Pencil, label: 'Draw', shortcut: 'P' },
  { tool: 'hand', icon: Hand, label: 'Pan', shortcut: 'H' },
  { tool: 'zoom', icon: ZoomIn, label: 'Zoom', shortcut: 'Z' },
];

interface EditorToolSidebarProps {
  tools?: ToolConfig[];
  className?: string;
}

export function EditorToolSidebar({ tools = defaultTools, className }: EditorToolSidebarProps) {
  const { activeTool, setActiveTool } = useEditor();

  return (
    <div className={cn('w-12 border-r bg-background flex flex-col items-center py-2 gap-0.5 shrink-0', className)}>
      {tools.map(({ tool, icon: Icon, label, shortcut }) => (
        <button
          key={tool}
          onClick={() => setActiveTool(tool)}
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center transition-colors relative group',
            activeTool === tool ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
          title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
        >
          <Icon className="h-4 w-4" />
          {/* Tooltip */}
          <div className="absolute left-full ml-2 px-2 py-1 bg-primary text-primary-foreground rounded text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            {label}{shortcut && <span className="ml-1 opacity-60">{shortcut}</span>}
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Bottom Status Bar ──────────────────────────────────────────────��

interface EditorStatusBarProps {
  extra?: React.ReactNode;
  className?: string;
}

export function EditorStatusBar({ extra, className }: EditorStatusBarProps) {
  const { activePage, selectedElementIds, zoom, lastSaved, isDirty } = useEditor();

  return (
    <footer className={cn('h-7 border-t bg-background flex items-center justify-between px-3 text-[11px] text-muted-foreground shrink-0', className)}>
      <div className="flex items-center gap-3">
        {activePage && (
          <span>{activePage.width} x {activePage.height}px</span>
        )}
        {selectedElementIds.length > 0 && (
          <span>{selectedElementIds.length} selected</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {extra}
        <span>{zoom}%</span>
        {lastSaved && (
          <span className={isDirty ? 'text-amber-500' : ''}>
            {isDirty ? 'Unsaved changes' : `Saved ${lastSaved.toLocaleTimeString()}`}
          </span>
        )}
      </div>
    </footer>
  );
}
