import { useState, useCallback, useRef } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Upload, Download, Loader2, Sparkles, RotateCcw,
  ImageIcon, FileCode2, Minus, Plus, ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { traceImageToSVG, downloadSVG, DEFAULT_OPTIONS, type TraceOptions } from './traceImage';
import { toast } from 'sonner';

export default function LogoToSvgPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [svgResult, setSvgResult] = useState<string | null>(null);
  const [tracing, setTracing] = useState(false);
  const [options, setOptions] = useState<TraceOptions>(DEFAULT_OPTIONS);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WebP)');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setSvgResult(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleTrace = async () => {
    if (!file) return;
    setTracing(true);
    try {
      const svg = await traceImageToSVG(file, options);
      setSvgResult(svg);
      toast.success('SVG generated!');
    } catch (error: any) {
      console.error('Trace error:', error);
      toast.error('Failed to convert image. Try a different image or settings.');
    } finally {
      setTracing(false);
    }
  };

  const handleDownload = () => {
    if (!svgResult) return;
    const name = file?.name?.replace(/\.[^.]+$/, '') || 'logo';
    downloadSVG(svgResult, `${name}.svg`);
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setSvgResult(null);
    setOptions(DEFAULT_OPTIONS);
  };

  const svgSize = svgResult ? new Blob([svgResult]).size : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <FileCode2 className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold">Logo to SVG</h1>
                <p className="text-xs text-muted-foreground">Convert raster images to vector</p>
              </div>
            </div>
          </div>
          {svgResult && (
            <Button onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" /> Download SVG
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {!file ? (
          /* Upload Area */
          <div className="max-w-2xl mx-auto">
            <div
              className="border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 flex items-center justify-center mb-6">
                <Upload className="h-8 w-8 text-violet-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Upload your logo</h2>
              <p className="text-muted-foreground mb-4">
                Drop a PNG, JPG, or WebP image here, or click to browse
              </p>
              <Badge variant="secondary" className="text-xs">
                Supports transparent PNGs for best results
              </Badge>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4 text-center">
              {[
                { icon: ImageIcon, label: 'Upload raster image', desc: 'PNG, JPG, WebP' },
                { icon: Sparkles, label: 'Auto-trace to paths', desc: 'Client-side processing' },
                { icon: FileCode2, label: 'Download clean SVG', desc: 'Scalable vector output' },
              ].map((step, i) => (
                <div key={i} className="p-4">
                  <step.icon className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Editor */
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            {/* Preview Area */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Original */}
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" /> Original
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {(file.size / 1024).toFixed(0)} KB
                    </Badge>
                  </div>
                  <div className="aspect-square bg-[url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22><rect width=%2210%22 height=%2210%22 fill=%22%23f0f0f0%22/><rect x=%2210%22 y=%2210%22 width=%2210%22 height=%2210%22 fill=%22%23f0f0f0%22/></svg>')] rounded-lg flex items-center justify-center p-4">
                    <img
                      src={preview!}
                      alt="Original"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </Card>

                {/* SVG Result */}
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <FileCode2 className="h-4 w-4" /> SVG Result
                    </span>
                    {svgResult && (
                      <Badge variant="default" className="text-xs">
                        {(svgSize / 1024).toFixed(0)} KB
                      </Badge>
                    )}
                  </div>
                  <div className="aspect-square bg-[url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22><rect width=%2210%22 height=%2210%22 fill=%22%23f0f0f0%22/><rect x=%2210%22 y=%2210%22 width=%2210%22 height=%2210%22 fill=%22%23f0f0f0%22/></svg>')] rounded-lg flex items-center justify-center p-4">
                    {tracing ? (
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-violet-500 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Tracing paths...</p>
                      </div>
                    ) : svgResult ? (
                      <div
                        className="max-w-full max-h-full [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
                        dangerouslySetInnerHTML={{ __html: svgResult }}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Adjust settings and click Convert
                      </p>
                    )}
                  </div>
                </Card>
              </div>
            </div>

            {/* Controls Sidebar */}
            <div className="space-y-4">
              <Card className="p-5 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold mb-4">Trace Settings</h3>

                  <div className="space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs">Colors</Label>
                        <span className="text-xs text-muted-foreground font-mono">
                          {options.colorCount}
                        </span>
                      </div>
                      <Slider
                        value={[options.colorCount]}
                        onValueChange={([v]) => setOptions({ ...options, colorCount: v })}
                        min={2}
                        max={32}
                        step={1}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Fewer colors = simpler, cleaner SVG
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs">Detail Level</Label>
                        <span className="text-xs text-muted-foreground font-mono">
                          {options.minPathLength}
                        </span>
                      </div>
                      <Slider
                        value={[options.minPathLength]}
                        onValueChange={([v]) => setOptions({ ...options, minPathLength: v })}
                        min={0}
                        max={20}
                        step={1}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Higher = less noise, fewer small details
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs">Smoothing</Label>
                        <span className="text-xs text-muted-foreground font-mono">
                          {options.blur}
                        </span>
                      </div>
                      <Slider
                        value={[options.blur]}
                        onValueChange={([v]) => setOptions({ ...options, blur: v })}
                        min={0}
                        max={5}
                        step={1}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Blur before tracing for smoother curves
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs">Stroke Width</Label>
                        <span className="text-xs text-muted-foreground font-mono">
                          {options.strokeWidth}
                        </span>
                      </div>
                      <Slider
                        value={[options.strokeWidth]}
                        onValueChange={([v]) => setOptions({ ...options, strokeWidth: v })}
                        min={0}
                        max={5}
                        step={0.5}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        0 = filled shapes, higher = outlined paths
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <Button
                onClick={handleTrace}
                disabled={tracing}
                className="w-full gap-2 h-11 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
              >
                {tracing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Converting...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Convert to SVG
                  </>
                )}
              </Button>

              {svgResult && (
                <Button onClick={handleDownload} variant="outline" className="w-full gap-2">
                  <Download className="h-4 w-4" /> Download SVG
                </Button>
              )}

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1 gap-1"
                  onClick={() => {
                    setOptions(DEFAULT_OPTIONS);
                    setSvgResult(null);
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset Settings
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 gap-1"
                  onClick={handleReset}
                >
                  <Upload className="h-3.5 w-3.5" /> New Image
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
