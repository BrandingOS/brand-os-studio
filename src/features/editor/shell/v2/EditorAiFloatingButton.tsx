// EditorAiFloatingButton — floating "✦ Ask AI" pill anchored at the
// bottom of the editor canvas region. Click opens a popover that
// hosts the existing EditorAiPromptBar.
//
// Replaces the always-visible AI prompt bar that used to live in the
// editor's top chrome (Phase 3.5 commit 5). The bar took ~360px in
// the topbar and crowded out the brand picker / segmented nav. This
// surface keeps the AI affordance one click away without polluting
// the workspace topbar.

import { useEffect, useRef, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { EditorAiPromptBar } from './EditorAiPromptBar';
import type { AIAgent, AICommandContext, AICommandResult } from '@/features/editor/ai/types';
import type { BrandOSDocument } from '@/features/editor/schema';

interface Props {
  agent: AIAgent;
  getDoc: () => BrandOSDocument;
  getContext: () => AICommandContext;
  onApply: (result: AICommandResult) => void;
  initialValue?: string;
}

export function EditorAiFloatingButton(props: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Auto-open if the editor mounted with a pre-filled prompt — the
  // user typed it on the Design hero before navigating here and
  // expects it to land visibly so they can tweak / submit.
  useEffect(() => {
    if (props.initialValue) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={wrapRef}
      data-editor-ai-floating
      className="absolute bottom-5 right-1/2 translate-x-1/2 z-30"
    >
      {open ? (
        <div
          data-editor-ai-floating-popover
          role="dialog"
          aria-label="Ask AI"
          className="absolute bottom-12 left-1/2 -translate-x-1/2 rounded-2xl border bg-background shadow-2xl"
          style={{
            borderColor: 'var(--border)',
            padding: 10,
            width: 420,
            maxWidth: 'calc(100vw - 32px)',
          }}
        >
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[12px] font-medium text-muted-foreground">
              Ask AI to edit your design
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <EditorAiPromptBar
            agent={props.agent}
            getDoc={props.getDoc}
            getContext={props.getContext}
            onApply={props.onApply}
            initialValue={props.initialValue}
          />
        </div>
      ) : null}

      <button
        type="button"
        data-editor-ai-floating-trigger
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close AI prompt' : 'Open AI prompt'}
        aria-expanded={open}
        title="Ask AI to edit your design"
        className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium shadow-lg transition-transform hover:-translate-y-0.5"
        style={{
          background: 'var(--accent)',
          color: 'var(--accent-contrast)',
          border: '1px solid var(--accent)',
        }}
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        <span>Ask AI</span>
      </button>
    </div>
  );
}
