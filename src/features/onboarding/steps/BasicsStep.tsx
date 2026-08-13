/**
 * Screen 1 — Tell us about your brand.
 *
 * One required field. No self-classification: "do you already have a brand?" is
 * a question about a spectrum, and the next screen finds out the truth by
 * watching whether the user has anything to give us.
 *
 * Continue CREATES the brand. Everything after this writes to a real record.
 */
import { useState } from 'react';
import { DsButton, DsInput, DsTextArea } from '@/shared/ds';

export interface BasicsValues {
  name: string;
  description: string;
  website: string;
}

export function BasicsStep({
  busy,
  error,
  onContinue,
}: {
  busy: boolean;
  /** Shown inline — a name collision or a save that did not land. */
  error: string | null;
  onContinue(values: BasicsValues): void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');

  const canContinue = name.trim().length > 0 && !busy;

  return (
    <div className="onb-step">
      <h1 className="onb-h">Tell us about your brand</h1>
      <p className="onb-sub">Just the name is enough. Everything else can wait.</p>

      {error && (
        <div className="onb-note onb-note--warn" role="status">
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canContinue) onContinue({ name: name.trim(), description, website: website.trim() });
        }}
      >
        <div style={{ marginBottom: 'var(--ds-space-5)' }}>
          <DsInput
            id="onb-name"
            label="Brand name"
            value={name}
            autoFocus
            autoComplete="off"
            placeholder="What is it called?"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 'var(--ds-space-5)' }}>
          <DsTextArea
            id="onb-description"
            label="What does it do? — optional"
            rows={4}
            value={description}
            placeholder="A sentence or a page. Paste anything you've already written."
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          {/* The one optional field that earns its place: people know it by
              heart, it seeds Business Info directly, and it gives the
              description something to corroborate. */}
          <DsInput
            id="onb-website"
            label="Website — optional"
            value={website}
            autoComplete="off"
            placeholder="yourbrand.com"
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        <div className="onb-foot">
          <span className="onb-hint">Nothing here is permanent.</span>
          <DsButton type="submit" arrow disabled={!canContinue}>
            {busy ? 'Setting up…' : 'Continue'}
          </DsButton>
        </div>
      </form>
    </div>
  );
}
