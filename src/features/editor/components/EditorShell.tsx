import { Container } from '@/shared/ui/Container';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Palette, Type, Image, Settings } from 'lucide-react';

interface EditorShellProps {
  moduleId?: string;
  brandId?: string;
}

export function EditorShell({ moduleId, brandId }: EditorShellProps) {
  return (
    <div className="h-[calc(100vh-200px)] flex gap-6">
      {/* Left Sidebar - Tools */}
      <div className="w-64 flex-shrink-0">
        <Card className="p-4 h-full">
          <h3 className="font-semibold mb-4">Tools</h3>
          <div className="space-y-2">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Palette className="w-4 h-4 mr-2" />
              Colors
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Type className="w-4 h-4 mr-2" />
              Typography
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Image className="w-4 h-4 mr-2" />
              Assets
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </Card>
      </div>

      {/* Center Canvas */}
      <div className="flex-1">
        <Card className="p-8 h-full bg-muted/20">
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold mb-4">Editor Canvas</h2>
            <p className="text-muted-foreground mb-6">
              Module: {moduleId} | Brand: {brandId}
            </p>
            <p className="text-sm text-muted-foreground">
              This is a placeholder for the visual editor canvas.
              Future implementation will include drag-and-drop design tools.
            </p>
          </div>
        </Card>
      </div>

      {/* Right Panel - Properties */}
      <div className="w-64 flex-shrink-0">
        <Card className="p-4 h-full">
          <h3 className="font-semibold mb-4">Properties</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Width</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-border rounded-md text-sm" 
                placeholder="Auto"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Height</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-border rounded-md text-sm" 
                placeholder="Auto"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Background</label>
              <input 
                type="color" 
                className="w-full h-10 border border-border rounded-md" 
                defaultValue="#ffffff"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}