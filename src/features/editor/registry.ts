import { ComponentType } from 'react';
import { ColorPaletteTool } from './tools/ColorPaletteTool';
import { LogoTool } from './tools/LogoTool';
import { BusinessCardTool } from './tools/BusinessCardTool';
import { LetterheadTool } from './tools/LetterheadTool';
import { SocialMediaTool } from './tools/SocialMediaTool';
import { FontTool } from './tools/FontTool';
import { BrandInfoTool } from './tools/BrandInfoTool';

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
    'business-cards': {
      id: 'business-cards',
      name: 'Business Cards',
      icon: 'CreditCard',
      component: BusinessCardTool,
    },
    'letterhead': {
      id: 'letterhead',
      name: 'Letterhead',
      icon: 'FileText',
      component: LetterheadTool,
    },
    'social-media': {
      id: 'social-media',
      name: 'Social Media Kit',
      icon: 'Share2',
      component: SocialMediaTool,
    },
    'fonts': {
      id: 'fonts',
      name: 'Typography',
      icon: 'Type',
      component: FontTool,
    },
    'brand-info': {
      id: 'brand-info',
      name: 'Brand Strategy',
      icon: 'FileText',
      component: BrandInfoTool,
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