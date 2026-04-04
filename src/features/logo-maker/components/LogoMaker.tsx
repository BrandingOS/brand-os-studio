import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/shared/design-system';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LogoCanvas } from './LogoCanvas';
import { IconSelector } from './IconSelector';
import { TextEditor } from './TextEditor';
import { LayoutSelector } from './LayoutSelector';
import { StylePanel } from './StylePanel';
import { AILogoSuggestions } from './AILogoSuggestions';
import { LogoExportPanel } from './LogoExportPanel';
import type { LogoConfig, LogoLayout } from '../types';
import { DEFAULT_LOGO_CONFIG } from '../types';
import {
  Shapes,
  Type,
  LayoutGrid,
  Palette,
  Sparkles,
  Download,
  Sun,
  Moon,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Wand2,
} from 'lucide-react';

export function LogoMaker() {
  const [config, setConfig] = useState<LogoConfig>(DEFAULT_LOGO_CONFIG);
  const [darkBg, setDarkBg] = useState(false);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);

  const updateConfig = useCallback((updates: Partial<LogoConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_LOGO_CONFIG);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-border">
        <PageHeader
          title="Logo Maker"
          description="Design a professional logo for your brand"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={resetConfig} className="gap-1.5 text-muted-foreground">
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
            </div>
          }
        />
      </div>

      {/* Main 3-column layout */}
      <div className="flex-1 flex min-h-0">
        {/* ─── LEFT PANEL ──────────────────────────────────────────── */}
        <div className="w-[320px] shrink-0 border-r border-border bg-card/50 flex flex-col min-h-0">
          <Tabs defaultValue="icons" className="flex flex-col h-full">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-2 h-auto py-0 shrink-0">
              <TabsTrigger
                value="icons"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 text-xs py-2.5"
              >
                <Shapes className="w-3.5 h-3.5" />
                Icons
              </TabsTrigger>
              <TabsTrigger
                value="text"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 text-xs py-2.5"
              >
                <Type className="w-3.5 h-3.5" />
                Text
              </TabsTrigger>
              <TabsTrigger
                value="layout"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 text-xs py-2.5"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Layout
              </TabsTrigger>
            </TabsList>

            <TabsContent value="icons" className="flex-1 overflow-y-auto p-4 mt-0">
              <IconSelector
                selected={config.icon}
                onSelect={(icon) => updateConfig({ icon })}
              />
            </TabsContent>

            <TabsContent value="text" className="flex-1 overflow-y-auto p-4 mt-0">
              <TextEditor config={config} onChange={updateConfig} />
            </TabsContent>

            <TabsContent value="layout" className="flex-1 overflow-y-auto p-4 mt-0">
              <LayoutSelector
                selected={config.layout}
                onSelect={(layout: LogoLayout) => updateConfig({ layout })}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* ─── CENTER: CANVAS ──────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Canvas toolbar */}
          <div className="shrink-0 flex items-center justify-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setDarkBg(!darkBg)}
              title={darkBg ? 'Light background' : 'Dark background'}
            >
              {darkBg ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <div className="w-px h-5 bg-border" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
              disabled={zoom >= 2}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          {/* Canvas area */}
          <div
            className={cn(
              'flex-1 flex items-center justify-center transition-colors duration-300 overflow-auto',
              darkBg ? 'bg-zinc-900' : 'bg-[#f8f9fb]',
            )}
          >
            {/* Checkerboard pattern underneath to indicate transparency */}
            <div
              className="relative"
              style={{
                transform: `scale(${zoom})`,
                transition: 'transform 0.15s ease',
              }}
            >
              {/* Subtle checkerboard behind logo */}
              <div
                className="absolute inset-0 rounded-lg opacity-[0.04]"
                style={{
                  backgroundImage:
                    'linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                }}
              />
              <LogoCanvas ref={canvasRef} config={config} />
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANEL ─────────────────────────────────────────── */}
        <div className="w-[300px] shrink-0 border-l border-border bg-card/50 flex flex-col min-h-0">
          <Tabs defaultValue="style" className="flex flex-col h-full">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-2 h-auto py-0 shrink-0">
              <TabsTrigger
                value="style"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 text-xs py-2.5"
              >
                <Palette className="w-3.5 h-3.5" />
                Style
              </TabsTrigger>
              <TabsTrigger
                value="ai"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 text-xs py-2.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI
              </TabsTrigger>
              <TabsTrigger
                value="export"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 text-xs py-2.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </TabsTrigger>
            </TabsList>

            <TabsContent value="style" className="flex-1 overflow-y-auto p-4 mt-0">
              <StylePanel config={config} onChange={updateConfig} />
            </TabsContent>

            <TabsContent value="ai" className="flex-1 overflow-y-auto p-4 mt-0">
              <AILogoSuggestions
                currentConfig={config}
                onApply={updateConfig}
              />
            </TabsContent>

            <TabsContent value="export" className="flex-1 overflow-y-auto p-4 mt-0">
              <LogoExportPanel config={config} canvasRef={canvasRef} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
