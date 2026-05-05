// Phase 11.1 — First-visit welcome tip for the unified editor.
//
// Single dismissible card pinned above the AI prompt bar that
// announces the editor's key affordances (AI prompt, comments,
// presence). Shown once per browser per featureId; re-show by
// clearing localStorage entry 'brandos:features-seen'.[id].
//
// Mounts as a portal-free positioned div so it renders inside the
// workspace theme without inheriting the prompt bar's layout.

import { useEffect, useState } from 'react';
import { Sparkles, X, MessageSquare, Users } from 'lucide-react';
import { useFeatureSeen } from '@/shared/hooks/useFeatureSeen';

interface EditorWelcomeTipProps {
  /** Stable feature id. Bump when material changes happen so previously
   *  dismissed users see the new tip. v1 = 'editor-welcome-2026-05'. */
  featureId?: string;
  /** Delay (ms) before showing the tip on first paint, so it doesn't
   *  fight the editor's own load + AI prompt bar entry animation. */
  delayMs?: number;
}

export function EditorWelcomeTip({
  featureId = 'editor-welcome-2026-05',
  delayMs = 600,
}: EditorWelcomeTipProps) {
  const { isSeen, markSeen } = useFeatureSeen(featureId);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isSeen) return;
    const id = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(id);
  }, [isSeen, delayMs]);

  if (isSeen || !visible) return null;

  const dismiss = () => {
    setVisible(false);
    markSeen();
  };

  return (
    <div
      data-editor-welcome-tip
      role="dialog"
      aria-labelledby="editor-welcome-tip-title"
      style={{
        position: 'fixed',
        top: 76,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 70,
        background: 'var(--surface)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.18)',
        padding: '14px 16px',
        maxWidth: 480,
        animation: 'fadeIn 220ms ease-out',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: 'var(--surface-sunken, rgba(0,0,0,0.04))' }}
        >
          <Sparkles size={16} aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <h2
            id="editor-welcome-tip-title"
            className="text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Three new things in the editor
          </h2>
          <ul className="mt-2 flex flex-col gap-1 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            <li className="flex items-center gap-1.5">
              <Sparkles size={11} aria-hidden /> Type a prompt up top — AI edits your design.
            </li>
            <li className="flex items-center gap-1.5">
              <MessageSquare size={11} aria-hidden /> Comment on the design from the bottom-right.
            </li>
            <li className="flex items-center gap-1.5">
              <Users size={11} aria-hidden /> See teammates' cursors live as they edit.
            </li>
          </ul>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss tip"
          className="rounded-md p-1 hover:bg-muted/40"
          style={{ color: 'var(--text-secondary)' }}
        >
          <X size={14} />
        </button>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md px-3 py-1 text-[12px] font-medium"
          style={{
            background: 'var(--accent, #1A1A2E)',
            color: '#fff',
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
