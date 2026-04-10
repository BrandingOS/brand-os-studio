// Unified Editor Core — Public API
//
// See README.md in this folder for the unification status, the migration
// guide for adopting these primitives in an existing editor, and the list
// of editors that still need to be migrated.

// State / context (existing — zero adoption today, see README §3)
export { UnifiedEditorProvider, useEditor } from './EditorContext';
export type { EditorViewMode, EditorTool, EditorElement, EditorPage, EditorState, EditorActions } from './EditorContext';
export { EditorTopToolbar, EditorToolSidebar, EditorStatusBar } from './EditorToolbar';
export { EditorCanvas } from './EditorCanvas';

// Shared chrome + save model (Stage 12 slice — adopt incrementally)
export { EditorChrome, SaveStateIndicator } from './EditorChrome';
export type { EditorSaveState } from './EditorChrome';
export { useAutoSave } from './useAutoSave';
