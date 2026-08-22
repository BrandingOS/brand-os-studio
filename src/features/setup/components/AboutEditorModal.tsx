import { useEffect, useRef, useState } from 'react';
import { DsButton, DsInput, DsModal, DsTextArea } from '@/shared/ds';
import { AiPromptMenu } from '@/shared/ai-handoff/AiPromptMenu';

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
  /**
   * The chips to offer, when the caller knows better than the generic list.
   *
   * Onboarding passes the strategy fields its brand has not answered yet, so
   * the chips are the actual questions outstanding rather than a fixed set of
   * suggestions that may already be filled in.
   */
  suggestions?: string[];
  /**
   * What a chip means, when it means more than filling in the title.
   *
   * Industry is a choice from a vocabulary, not a paragraph — so onboarding
   * takes the chip as "open that field" and returns `true` to say it handled
   * it. Anything else falls through to the old behaviour.
   */
  onPickSuggestion?: (title: string) => boolean;
  /**
   * A prompt for the section being written, built from its current title.
   *
   * Someone who pressed + has already decided they want to write something, so
   * the same AI help the section header offers belongs in here too. There is
   * nothing to parse: the reply IS the content, and it goes straight into the
   * box below the menu. Omit to hide the control.
   */
  buildPrompt?: (title: string) => string;
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
  suggestions,
  onPickSuggestion,
  buildPrompt,
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

  const handleSave = () => {
    const t = title.trim();
    if (!t) return;
    onSave({ id: initial?.id, title: t, content: content.trim() });
  };

  return (
    <DsModal
      open={open}
      onClose={onClose}
      title={initial?.id ? 'Edit section' : 'New section'}
      secondaryActions={
        initial?.id && onDelete ? (
          <DsButton tone="secondary" onClick={() => onDelete(initial.id!)}>
            Delete
          </DsButton>
        ) : undefined
      }
      actions={
        <>
          <DsButton tone="secondary" onClick={onClose}>
            Cancel
          </DsButton>
          <DsButton tone="primary" onClick={handleSave}>
            Save
          </DsButton>
        </>
      }
    >
      <p style={{ margin: '-8px 0 0', fontSize: 13, color: 'var(--ds-text-muted)' }}>
        Describe this part of your brand in your own words.
      </p>
      <div>
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
            {(suggestions ?? SUGGESTED_TITLES)
              .filter((s) => !(takenTitles ?? []).some((t) => t.toLowerCase() === s.toLowerCase()))
              .map((s) => (
                <button
                  key={s}
                  type="button"
                  className="about-suggestion-chip"
                  onClick={() => {
                    if (onPickSuggestion?.(s)) return;
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
          {buildPrompt && (
            <div className="about-ai-row">
              <span className="about-ai-label">Content</span>
              <AiPromptMenu
                label="Write it with AI"
                prompt={() => buildPrompt(title)}
              />
            </div>
          )}
          <DsTextArea
            ref={contentRef}
            label={buildPrompt ? undefined : 'Content'}
            placeholder="Who you're speaking to, what you're saying, where you're going…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
      </div>
    </DsModal>
  );
}
