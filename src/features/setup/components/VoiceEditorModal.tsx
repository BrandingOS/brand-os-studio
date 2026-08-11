import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DsButton, DsInput, DsModal, DsTextArea } from '@/shared/ds';

type Props = {
  open: boolean;
  essay: string;
  pillars: string[];
  onClose: () => void;
  onSave: (next: { essay: string; pillars: string[] }) => void;
};

/**
 * Voice & Tone editor modal. Ported from the source HTML prototype's
 * buildVoiceEditor (new-ui/brandos/brandOS brand board.html): an essay
 * textarea, comma-separated pillars input, and a small drop-zone that
 * accepts PDF/DOC/TXT references.
 *
 * Only .txt files are actually read in-browser — PDF/DOC are
 * acknowledged via a toast so the user knows their guide was received
 * but the essay stays under their control (we don't have a client-side
 * PDF extractor). Real extraction should happen server-side.
 */
export function VoiceEditorModal({
  open,
  essay,
  pillars,
  onClose,
  onSave,
}: Props) {
  const [essayVal, setEssayVal] = useState(essay);
  const [pillarsVal, setPillarsVal] = useState(pillars.join(', '));
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Reset local state whenever the modal reopens with fresh props.
  useEffect(() => {
    if (!open) return;
    setEssayVal(essay);
    setPillarsVal(pillars.join(', '));
    // Push focus to the textarea so the user can type immediately.
    const id = window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, essay, pillars]);

  const handleSave = () => {
    onSave({
      essay: essayVal.trim(),
      pillars: pillarsVal
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.type === 'text/plain') {
      const r = new FileReader();
      r.onload = (ev) => {
        setEssayVal(String(ev.target?.result ?? '').slice(0, 1200));
      };
      r.readAsText(f);
      return;
    }
    toast.message(`Imported ${f.name}`, {
      description: 'PDF/DOC parsing isn’t wired yet — edit the text above.',
    });
  };

  return (
    <DsModal
      open={open}
      onClose={onClose}
      title="Voice & Tone"
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
        Describe how your brand speaks — or upload a reference doc.
      </p>
      <div>
        <DsTextArea
          ref={textareaRef}
          label="How your brand speaks"
          placeholder="We speak plainly. We make complex things feel simple. We respect our readers — and their intelligence."
          value={essayVal}
          onChange={(e) => setEssayVal(e.target.value)}
        />
        <div style={{ marginTop: 16 }}>
          <DsInput
            type="text"
            label="Pillars (comma-separated)"
            placeholder="Clear, Warm, Precise, Confident"
            value={pillarsVal}
            onChange={(e) => setPillarsVal(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="modal-or">Or upload a guide</div>

        <div
          className="mini-drop"
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <svg className="mini-drop-border" aria-hidden>
            <rect />
          </svg>
          <div className="mini-drop-inset">
            <div className="mini-drop-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
            </div>
            <p className="mini-drop-title">Drop a brand guide</p>
            <p className="mini-drop-sub">
              PDF, DOC, or TXT — we’ll extract the voice
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            hidden
            onChange={handleFileChange}
          />
        </div>
      </div>
    </DsModal>
  );
}
