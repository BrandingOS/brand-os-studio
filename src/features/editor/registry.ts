import { ComponentType } from 'react';
import { ColorPaletteTool } from './tools/ColorPaletteTool';
import { LogoTool } from './tools/LogoTool';

export interface EditorTool {
  id: string;
  name: string;
  icon: string;
  component: ComponentType<{ brandId: string }>;
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
  brandId?: string;
}

// Registry with actual tools
export const editorRegistry: {
  tools: Record<string, EditorTool>;
  modules: Record<string, EditorModule>;
} = {
  tools: {
    'brand-colors': {
      id: 'brand-colors',
      name: 'Color Palette',
      icon: 'Palette',
      component: ColorPaletteTool,
    },
    'logo': {
      id: 'logo',
      name: 'Logo Management',
      icon: 'Image',
      component: LogoTool,
    },
  },
  modules: {},
};

// Tool registration functions
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