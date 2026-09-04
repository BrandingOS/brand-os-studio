import { useEffect, useState } from 'react';
import { DsModal, DsButton, DsInput, DsRadio } from '@/shared/ds';

export interface PendingUpload {
  tileId: string;
  dataUrl: string;
  fileName: string;
  fileSize: number;
}

interface Props {
  pending: PendingUpload | null;
  onClose: () => void;
  /**
   * Fires with `saveToBrand`:
   *   - true  → caller should add the image to brand assets AND place into tile
   *   - false → caller places into tile only (one-time)
   */
  onConfirm: (args: { saveToBrand: boolean; assetName: string }) => void;
  /** If true, hides the save-to-brand choice (e.g. standalone mode without brand). */
  brandSaveDisabled?: boolean;
}

/**
 * ── Why radios and not the two checkboxes this replaced ──────────────────
 *
 * "Save to brand assets" and "Use once" were two checkboxes driven by ONE
 * boolean, each unticking the other. That is a radio group with the wrong
 * control on it: a checkbox promises an independent choice, and a screen
 * reader is told there are two of them. The options, their wording and the
 * value sent to `onConfirm` are unchanged — only the control is.
 */
export function ImageUploadPrompt({ pending, onClose, onConfirm, brandSaveDisabled }: Props) {
  const [saveToBrand, setSaveToBrand] = useState(true);
  const [name, setName] = useState('');

  // Reset for each new upload. Doing this in an effect rather than during
  // render means a user who clears the field keeps it cleared — the old
  // `if (pending && name === '')` refilled it on the next keystroke.
  useEffect(() => {
    if (!pending) return;
    setName(pending.fileName.replace(/\.[^.]+$/, ''));
    setSaveToBrand(!brandSaveDisabled);
  }, [pending, brandSaveDisabled]);

  if (!pending) return null;

  const keep = brandSaveDisabled ? false : saveToBrand;

  return (
    <DsModal
      open
      onClose={onClose}
      title="Add this image?"
      eyebrow="Upload"
      secondaryActions={<DsButton tone="tertiary" onClick={onClose}>Cancel</DsButton>}
      actions={
        <DsButton onClick={() => onConfirm({ saveToBrand: keep, assetName: name })}>
          Add image
        </DsButton>
      }
    >
      <p className="bento-modal-lede">
        Choose whether to save this image to this brand’s asset library so you can reuse it later.
      </p>

      <div className="bento-preview">
        <img src={pending.dataUrl} alt="" />
      </div>

      <div className="bento-choices" role="radiogroup" aria-label="Where this image lives">
        {!brandSaveDisabled && (
          <div className={`bento-choice${saveToBrand ? ' is-on' : ''}`}>
            <DsRadio
              checked={saveToBrand}
              onChange={() => setSaveToBrand(true)}
              label="Save to brand assets"
            />
            <p className="bento-choice-note">
              The image appears in this brand’s Assets section and can be reused across other designs.
            </p>
            {saveToBrand && (
              <DsInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Asset name"
                aria-label="Asset name"
              />
            )}
          </div>
        )}

        <div className={`bento-choice${keep ? '' : ' is-on'}`}>
          <DsRadio
            checked={!keep}
            onChange={() => setSaveToBrand(false)}
            label="Use once"
            disabled={brandSaveDisabled}
          />
          <p className="bento-choice-note">
            The image only lives inside this bento design — nothing is added to brand assets.
          </p>
        </div>
      </div>
    </DsModal>
  );
}
