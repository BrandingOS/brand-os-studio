/**
 * EditorChrome — the canonical editor top-bar primitive.
 *
 * Every editor surface in BrandOS should mount this at the top, so the
 * back button, title/breadcrumb, save-state indicator, and actions all
 * look and behave the same. See docs/ux-redesign/ARCHITECTURE.md §4
 * for the spec.
 *
 * This is intentionally NOT a layout — it's a single-row chrome that any
 * editor can drop into its existing layout. Adoption is incremental: a
 * specific editor opts in by replacing its bespoke top bar with this.
 *
 * Save state semantics:
 *  - 'idle'   → no pending changes
 *  - 'saving' → debounced save in flight
 *  - 'saved'  → just successfully saved (auto-fades to idle)
 *  - 'error'  → last save failed; user can retry
 *
 * Pair this with `useAutoSave` (./useAutoSave.ts) for the typical flow.
 */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export type EditorSaveState = 'idle' | 'saving' | 'saved' | 'error';

interface EditorChromeProps {
  /** Path to navigate to when the back button is clicked. Required. */
  backTo: string;
  /**
   * Breadcrumb segments shown next to the back arrow.
   * E.g. ['Acme', 'Identity', 'Logo'] renders "Acme · Identity · Logo".
   */
  breadcrumb?: string[];
  /** The document title (largest piece of text in the chrome). */
  title: ReactNode;
  /** Current save state. Defaults to 'idle'. */
  saveState?: EditorSaveState;
  /** Optional retry handler shown when saveState === 'error'. */
  onRetry?: () => void;
  /** Right-aligned actions (Share, Export, etc.). */
  actions?: ReactNode;
  className?: string;
}

const SAVE_LABEL: Record<EditorSaveState, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save failed',
};

export function SaveStateIndicator({
  state,
  onRetry,
}: {
  state: EditorSaveState;
  onRetry?: () => void;
}) {
  if (state === 'idle') return null;

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {state === 'saving' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">{SAVE_LABEL.saving}</span>
        </>
      )}
      {state === 'saved' && (
        <>
          <Check className="h-3 w-3 text-emerald-500" />
          <span className="text-muted-foreground">{SAVE_LABEL.saved}</span>
        </>
      )}
      {state === 'error' && (
        <>
          <AlertCircle className="h-3 w-3 text-destructive" />
          <span className="text-destructive">{SAVE_LABEL.error}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="ml-1 text-destructive underline hover:no-underline"
            >
              Retry
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function EditorChrome({
  backTo,
  breadcrumb,
  title,
  saveState = 'idle',
  onRetry,
  actions,
  className,
}: EditorChromeProps) {
  const navigate = useNavigate();

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur',
        'h-12 px-3 sm:px-4 flex items-center gap-3',
        className,
      )}
    >
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(backTo)}
        className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground"
        aria-label="Back"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      {/* Title + breadcrumb */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {breadcrumb && breadcrumb.length > 0 && (
          <span className="hidden sm:inline text-xs text-muted-foreground truncate">
            {breadcrumb.join(' · ')}
          </span>
        )}
        {breadcrumb && breadcrumb.length > 0 && (
          <span className="hidden sm:inline text-xs text-muted-foreground/40">/</span>
        )}
        <span className="text-sm font-semibold truncate">{title}</span>
      </div>

      {/* Save state */}
      <SaveStateIndicator state={saveState} onRetry={onRetry} />

      {/* Actions */}
      {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
    </header>
  );
}
