import { useState } from 'react';
import { Container } from '@/shared/ui/Container';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Palette, Type, Image, Settings } from 'lucide-react';
import { editorRegistry, getToolById } from '../registry';
import type { EditorContext } from '../registry';

interface EditorShellProps {
  moduleId?: string;
  brandId?: string;
}

export function EditorShell({ moduleId, brandId }: EditorShellProps) {
  const [activeTab, setActiveTab] = useState('tools');
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  
  const editorContext: EditorContext = {
    currentTool: currentTool || undefined,
    canvasSize: { width: 800, height: 600 },
    brandId,
  };

  const availableTools = Object.values(editorRegistry.tools);
  const activeTool = currentTool ? getToolById(currentTool) : null;

  const tools = [
    { id: 'colors', name: 'Colors', icon: Palette },
    { id: 'typography', name: 'Typography', icon: Type },
    { id: 'assets', name: 'Assets', icon: Image },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  return (
    <Container className="h-screen flex">
      {/* Left Sidebar - Tools */}
      <Card className="w-64 h-full rounded-none border-r">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Tools</h2>
        </div>
        <div className="p-2">
          {/* Brand Tools */}
          <div className="mb-4">
            <p className="text-xs text-muted-foreground px-2 py-1 font-medium">Brand Tools</p>
            {availableTools.map((tool) => (
              <Button
                key={tool.id}
                variant={currentTool === tool.id ? "default" : "ghost"}
                className="w-full justify-start mb-1"
                onClick={() => setCurrentTool(tool.id)}
              >
                <Palette className="h-4 w-4 mr-2" />
                {tool.name}
              </Button>
            ))}
          </div>
          
          {/* General Tools */}
          <div>
            <p className="text-xs text-muted-foreground px-2 py-1 font-medium">General</p>
            {tools.map((tool) => (
              <Button
                key={tool.id}
                variant="ghost"
                className="w-full justify-start mb-1"
                disabled
              >
                <tool.icon className="h-4 w-4 mr-2" />
                {tool.name}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Center - Canvas */}
      <div className="flex-1 flex flex-col">
        <Card className="h-full rounded-none">
          <div className="p-4 border-b">
            <h1 className="text-xl font-semibold">
              {activeTool ? activeTool.name : 'Editor'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Module: {moduleId || 'None'} | Brand: {brandId || 'None'}
            </p>
          </div>
          <div className="flex-1 p-8 overflow-auto">
            {activeTool && brandId ? (
              <activeTool.component brandId={brandId} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-64 h-64 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center mb-4">
                    <p className="text-muted-foreground">Canvas Area</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {brandId ? 'Select a tool to begin editing' : 'Brand ID required'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Right Sidebar - Properties */}
      <Card className="w-64 h-full rounded-none border-l">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Properties</h2>
        </div>
        <div className="p-4 space-y-4">
          {activeTool ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Active Tool</p>
                <p className="text-sm text-muted-foreground">{activeTool.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Brand Context</p>
                <p className="text-sm text-muted-foreground">{brandId || 'None'}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Width</label>
                <Input placeholder="Auto" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Height</label>
                <Input placeholder="Auto" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Background</label>
                <Input placeholder="#ffffff" />
              </div>
            </div>
          )}
        </div>
      </Card>
    </Container>
  );
}