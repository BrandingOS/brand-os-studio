export { EditorShell } from './components/EditorShell';
export { DesignEditor } from './components/DesignEditor';
export { DesignCanvas } from './components/DesignCanvas';
export { ToolPanel } from './components/ToolPanel';
export { PropertiesPanel } from './components/PropertiesPanel';
export { editorRegistry, registerTool, registerModule, getToolById, getModuleById } from './registry';
export type { EditorTool, EditorModule, EditorContext } from './registry';