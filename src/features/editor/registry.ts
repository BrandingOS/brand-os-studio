// Editor Registry - Placeholder for future tool registration system

export interface EditorTool {
  id: string;
  name: string;
  icon: string;
  component: React.ComponentType<any>;
}

export interface EditorModule {
  id: string;
  name: string;
  description: string;
  tools: EditorTool[];
}

export interface EditorContext {
  currentTool?: string;
  selectedElement?: string;
  canvasSize: { width: number; height: number };
}

// Empty registry - to be populated with actual tools later
export const editorRegistry: {
  tools: Record<string, EditorTool>;
  modules: Record<string, EditorModule>;
} = {
  tools: {},
  modules: {},
};

// Placeholder functions for future implementation
export function registerTool(tool: EditorTool): void {
  editorRegistry.tools[tool.id] = tool;
}

export function registerModule(module: EditorModule): void {
  editorRegistry.modules[module.id] = module;
}

export function getToolById(id: string): EditorTool | undefined {
  return editorRegistry.tools[id];
}

export function getModuleById(id: string): EditorModule | undefined {
  return editorRegistry.modules[id];
}