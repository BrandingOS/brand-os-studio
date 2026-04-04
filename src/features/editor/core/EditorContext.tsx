/**
 * Unified Editor Context
 *
 * Provides shared state and behavior for all editor experiences in BrandOS.
 * Every editor (design, guidelines, social media, logo) shares the same
 * context model but can configure different view modes and available tools.
 */
import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────

export type EditorViewMode = 'fixed' | 'slides' | 'freeform';
export type EditorTool = 'select' | 'text' | 'shape' | 'image' | 'logo' | 'draw' | 'hand' | 'zoom';

export interface EditorElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'logo' | 'group';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
  props: Record<string, unknown>;
}

export interface EditorPage {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  elements: EditorElement[];
}

export interface EditorState {
  // Document
  pages: EditorPage[];
  activePageIndex: number;
  activePage: EditorPage | null;

  // Selection
  selectedElementIds: string[];
  selectedElement: EditorElement | null;

  // View
  viewMode: EditorViewMode;
  zoom: number;
  panX: number;
  panY: number;

  // Tools
  activeTool: EditorTool;
  showGrid: boolean;
  snapToGrid: boolean;

  // Panels
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  leftPanelTab: string;
  rightPanelTab: string;

  // History
  canUndo: boolean;
  canRedo: boolean;

  // Status
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
}

export interface EditorActions {
  // Page management
  setActivePage: (index: number) => void;
  addPage: (page?: Partial<EditorPage>) => void;
  removePage: (index: number) => void;
  reorderPages: (fromIndex: number, toIndex: number) => void;

  // Element management
  selectElements: (ids: string[]) => void;
  clearSelection: () => void;
  addElement: (element: Partial<EditorElement>) => void;
  updateElement: (id: string, updates: Partial<EditorElement>) => void;
  removeElements: (ids: string[]) => void;
  duplicateElements: (ids: string[]) => void;

  // View controls
  setViewMode: (mode: EditorViewMode) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  setPan: (x: number, y: number) => void;

  // Tool selection
  setActiveTool: (tool: EditorTool) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;

  // Panel controls
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setLeftPanelTab: (tab: string) => void;
  setRightPanelTab: (tab: string) => void;

  // History
  undo: () => void;
  redo: () => void;

  // Save
  save: () => Promise<void>;
}

type EditorContextValue = EditorState & EditorActions;

// ─── Context ──────────────────────────────────────────────────────────

const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used within UnifiedEditorProvider');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────

interface EditorProviderProps {
  initialPages?: EditorPage[];
  initialViewMode?: EditorViewMode;
  onSave?: (pages: EditorPage[]) => Promise<void>;
  children: ReactNode;
}

export function UnifiedEditorProvider({
  initialPages,
  initialViewMode = 'fixed',
  onSave,
  children,
}: EditorProviderProps) {
  const defaultPage: EditorPage = {
    id: 'page-1',
    name: 'Page 1',
    width: 1080,
    height: 1080,
    background: '#FFFFFF',
    elements: [],
  };

  const [pages, setPages] = useState<EditorPage[]>(initialPages || [defaultPage]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<EditorViewMode>(initialViewMode);
  const [zoom, setZoom] = useState(100);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [leftPanelTab, setLeftPanelTab] = useState('elements');
  const [rightPanelTab, setRightPanelTab] = useState('properties');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // History (simplified)
  const [history, setHistory] = useState<EditorPage[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const activePage = pages[activePageIndex] || null;
  const selectedElement = activePage
    ? activePage.elements.find((e) => selectedElementIds.includes(e.id)) || null
    : null;

  const pushHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(structuredClone(pages));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex, pages]);

  const markDirty = useCallback(() => {
    setIsDirty(true);
    pushHistory();
  }, [pushHistory]);

  // Page management
  const addPage = useCallback((partial?: Partial<EditorPage>) => {
    const newPage: EditorPage = {
      id: `page-${Date.now()}`,
      name: `Page ${pages.length + 1}`,
      width: activePage?.width || 1080,
      height: activePage?.height || 1080,
      background: '#FFFFFF',
      elements: [],
      ...partial,
    };
    setPages((prev) => [...prev, newPage]);
    setActivePageIndex(pages.length);
    markDirty();
  }, [pages, activePage, markDirty]);

  const removePage = useCallback((index: number) => {
    if (pages.length <= 1) return;
    setPages((prev) => prev.filter((_, i) => i !== index));
    if (activePageIndex >= index && activePageIndex > 0) {
      setActivePageIndex((prev) => prev - 1);
    }
    markDirty();
  }, [pages, activePageIndex, markDirty]);

  const reorderPages = useCallback((fromIndex: number, toIndex: number) => {
    setPages((prev) => {
      const result = [...prev];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
    markDirty();
  }, [markDirty]);

  // Element management
  const addElement = useCallback((partial: Partial<EditorElement>) => {
    const element: EditorElement = {
      id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'shape',
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      props: {},
      ...partial,
    };
    setPages((prev) => prev.map((page, i) => {
      if (i !== activePageIndex) return page;
      return { ...page, elements: [...page.elements, element] };
    }));
    setSelectedElementIds([element.id]);
    markDirty();
  }, [activePageIndex, markDirty]);

  const updateElement = useCallback((id: string, updates: Partial<EditorElement>) => {
    setPages((prev) => prev.map((page, i) => {
      if (i !== activePageIndex) return page;
      return {
        ...page,
        elements: page.elements.map((el) => el.id === id ? { ...el, ...updates } : el),
      };
    }));
    markDirty();
  }, [activePageIndex, markDirty]);

  const removeElements = useCallback((ids: string[]) => {
    setPages((prev) => prev.map((page, i) => {
      if (i !== activePageIndex) return page;
      return { ...page, elements: page.elements.filter((el) => !ids.includes(el.id)) };
    }));
    setSelectedElementIds([]);
    markDirty();
  }, [activePageIndex, markDirty]);

  const duplicateElements = useCallback((ids: string[]) => {
    setPages((prev) => prev.map((page, i) => {
      if (i !== activePageIndex) return page;
      const dupes = page.elements
        .filter((el) => ids.includes(el.id))
        .map((el) => ({ ...el, id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, x: el.x + 20, y: el.y + 20 }));
      return { ...page, elements: [...page.elements, ...dupes] };
    }));
    markDirty();
  }, [activePageIndex, markDirty]);

  // View
  const zoomIn = useCallback(() => setZoom((z) => Math.min(z + 25, 500)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(z - 25, 10)), []);
  const zoomToFit = useCallback(() => setZoom(100), []);
  const setPan = useCallback((x: number, y: number) => { setPanX(x); setPanY(y); }, []);

  // History
  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setPages(structuredClone(history[newIndex]));
    setHistoryIndex(newIndex);
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setPages(structuredClone(history[newIndex]));
    setHistoryIndex(newIndex);
  }, [history, historyIndex]);

  // Save
  const save = useCallback(async () => {
    if (onSave) {
      setIsSaving(true);
      try {
        await onSave(pages);
        setIsDirty(false);
        setLastSaved(new Date());
      } finally {
        setIsSaving(false);
      }
    }
  }, [pages, onSave]);

  const value: EditorContextValue = {
    // State
    pages,
    activePageIndex,
    activePage,
    selectedElementIds,
    selectedElement,
    viewMode,
    zoom,
    panX,
    panY,
    activeTool,
    showGrid,
    snapToGrid,
    leftPanelOpen,
    rightPanelOpen,
    leftPanelTab,
    rightPanelTab,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    isDirty,
    isSaving,
    lastSaved,

    // Actions
    setActivePage: setActivePageIndex,
    addPage,
    removePage,
    reorderPages,
    selectElements: setSelectedElementIds,
    clearSelection: () => setSelectedElementIds([]),
    addElement,
    updateElement,
    removeElements,
    duplicateElements,
    setViewMode,
    setZoom,
    zoomIn,
    zoomOut,
    zoomToFit,
    setPan,
    setActiveTool,
    toggleGrid: () => setShowGrid((g) => !g),
    toggleSnap: () => setSnapToGrid((s) => !s),
    toggleLeftPanel: () => setLeftPanelOpen((o) => !o),
    toggleRightPanel: () => setRightPanelOpen((o) => !o),
    setLeftPanelTab,
    setRightPanelTab,
    undo,
    redo,
    save,
  };

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}
