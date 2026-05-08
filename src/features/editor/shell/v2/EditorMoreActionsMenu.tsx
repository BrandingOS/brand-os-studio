// EditorMoreActionsMenu — single "⋯" dropdown that consolidates the
// editor's secondary actions (Share, Variants, Duplicate, Save as
// template, Export family, Republish family). Only the active set of
// children is rendered, so the menu stays compact when most slots are
// inapplicable.
//
// Each child here is the existing standalone action button component
// (EditorSaveAsTemplateButton, EditorGenerateVariantsButton, …). They
// keep their own internal popovers + data-test selectors, so e2e tests
// like saveAsTemplate.flows.browser.test still find their triggers
// — they just need to click the "More" trigger first.

import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export function EditorMoreActionsMenu({ children }: Props) {
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

  return (
    <div ref={wrapRef} className="relative" data-editor-more-actions>
      <button
        type="button"
        data-editor-more-actions-trigger
        onClick={() => setOpen((v) => !v)}
        aria-label="More actions"
        aria-expanded={open}
        title="More actions"
        className="theme-toggle"
      >
        <MoreHorizontal size={16} aria-hidden />
      </button>

      {open ? (
        <div
          data-editor-more-actions-popover
          role="menu"
          className="absolute right-0 top-full mt-2 z-50 flex flex-col gap-1 rounded-xl border bg-background p-1.5 shadow-xl"
          style={{
            borderColor: 'var(--border)',
            minWidth: 200,
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
