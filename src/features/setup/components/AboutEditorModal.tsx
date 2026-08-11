import { useEffect, useRef, useState } from 'react';
import { DsButton, DsInput, DsTextArea } from '@/shared/ds';

export type AboutEditorInitial = {
  id?: string;
  title: string;
  content: string;
};

type Props = {
  open: boolean;
  initial: AboutEditorInitial | null;
  /** Titles already in use — their suggestion chips are suppressed so
   *  users don't create duplicates by accident. */
  takenTitles?: string[];
  onClose: () => void;
  onSave: (next: { id?: string; title: string; content: string }) => void;
  onDelete?: (id: string) => void;
};

const SUGGESTED_TITLES = [
  'Audience',
  'Messaging',
  'Vision',
  'Mission',
  'Voice & Tone',
  'Values',
  'Story',
  'Positioning',
];

/**
 * Lightweight editor for a single About-section entry. Mirrors the
 * VoiceEditorModal chrome so the two feel of-a-piece. The title is
 * freely editable (so users can rename "Audience" to anything) but
 * can't be blank.
 */
export function AboutEditorModal({
  open,
  initial,
  takenTitles,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const titleRef = useRef<HTMLInputElement | null>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? '');
    setContent(initial?.content ?? '');
    const id = window.requestAnimationFrame(() => {
      if (initial?.id) contentRef.current?.focus();
      else titleRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleSave = () => {
    const t = title.trim();
    if (!t) return;
    onSave({ id: initial?.id, title: t, content: content.trim() });
  };

  return (
    <div
      className={`editor-modal-backdrop${open ? ' is-open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      aria-labelledby="about-editor-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="editor-modal-shell">
        <header className="modal-head">
          <div className="modal-head-meta">
            <h3 id="about-editor-title">
              {initial?.id ? 'Edit section' : 'New section'}
            </h3>
            <p>Describe this part of your brand in your own words.</p>
          </div>
          <button
            type="button"
            className="modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <div className="modal-body">
          <DsInput
            ref={titleRef}
            type="text"
            label="Section name"
            placeholder="Audience, Messaging, Vision…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          {!initial?.id && (
            <div className="about-suggestions" aria-label="Suggested section names">
              {SUGGESTED_TITLES.filter(
                (s) => !(takenTitles ?? []).some((t) => t.toLowerCase() === s.toLowerCase()),
              ).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="about-suggestion-chip"
                  onClick={() => {
                    setTitle(s);
                    contentRef.current?.focus();
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <DsTextArea
              ref={contentRef}
              label="Content"
              placeholder="Who you're speaking to, what you're saying, where you're going…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </div>

        <footer className="modal-foot">
          {initial?.id && onDelete ? (
            <DsButton
              tone="secondary"
              onClick={() => onDelete(initial.id!)}
              style={{ marginRight: 'auto' }}
            >
              Delete
            </DsButton>
          ) : null}
          <DsButton tone="secondary" onClick={onClose}>
            Cancel
          </DsButton>
          <DsButton tone="primary" onClick={handleSave}>
            Save
          </DsButton>
        </footer>
      </div>
    </div>
  );
}
