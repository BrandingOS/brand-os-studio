import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, UploadCloud, Loader2, AlertTriangle, FileImage } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { traceImageToSVG } from '@/features/tools/logo-to-svg/traceImage';
import { useLogoMakerStore } from '../state/useLogoMakerStore';

const ACCEPTED = 'image/png,image/jpeg,image/svg+xml';
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

type State =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'vectorizing' }
  | { kind: 'error'; message: string };

export default function UploadScreen() {
  const navigate = useNavigate();
  const setEditedSVG = useLogoMakerStore((s) => s.setEditedSVG);
  const setMode = useLogoMakerStore((s) => s.setMode);

  const [state, setState] = useState<State>({ kind: 'idle' });
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_BYTES) {
        setState({ kind: 'error', message: 'File is larger than 8 MB.' });
        return;
      }
      if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
        setState({ kind: 'error', message: 'Only PNG, JPG, or SVG are supported.' });
        return;
      }

      try {
        let svg: string;
        if (file.type === 'image/svg+xml') {
          setState({ kind: 'reading' });
          svg = await file.text();
        } else {
          setState({ kind: 'vectorizing' });
          svg = await traceImageToSVG(file);
        }

        setMode('upload');
        setEditedSVG(svg);
        const id = `upload-${Date.now()}`;
        localStorage.setItem(`logo-maker-flow-editor:${id}`, svg);
        toast.success('Logo vectorized — opening editor.');
        navigate(`/logo-maker/editor/${id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Vectorize failed.';
        setState({ kind: 'error', message });
      }
    },
    [navigate, setEditedSVG, setMode],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const isBusy = state.kind === 'reading' || state.kind === 'vectorizing';

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 py-3">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to="/logo-maker">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </Button>
          <span className="text-xs text-muted-foreground">Step 2 of 6</span>
          <div className="w-[78px]" aria-hidden />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl">
          <header className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Upload your logo</h1>
            <p className="text-muted-foreground">
              We'll vectorize it and open the editor so you can refine or rebuild.
            </p>
          </header>

          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors',
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40 hover:bg-accent/30',
              isBusy && 'pointer-events-none opacity-70',
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
              disabled={isBusy}
            />

            {isBusy ? (
              <>
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <div>
                  <p className="font-medium">
                    {state.kind === 'reading' ? 'Reading SVG…' : 'Vectorizing…'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {state.kind === 'vectorizing' && 'Quantizing colors and tracing paths. This takes a few seconds for large images.'}
                    {state.kind === 'reading' && 'Parsing the file.'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <UploadCloud className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Drop a logo file here</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or SVG · up to 8 MB</p>
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => inputRef.current?.click()}>
                  <FileImage className="w-4 h-4 mr-2" />
                  Choose a file
                </Button>
              </>
            )}
          </label>

          {state.kind === 'error' && (
            <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-start gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-destructive">{state.message}</p>
                <button
                  type="button"
                  onClick={() => setState({ kind: 'idle' })}
                  className="text-xs text-destructive underline mt-1"
                >
                  Try a different file
                </button>
              </div>
            </div>
          )}

          <p className="mt-6 text-xs text-center text-muted-foreground">
            Vectorization is a local imagetracerjs pass. Recraft fallback for
            complex images lands with API integration.
          </p>
        </div>
      </main>
    </div>
  );
}
