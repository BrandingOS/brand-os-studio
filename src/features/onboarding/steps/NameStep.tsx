/**
 * Screen 1 — the brand's name, and nothing else.
 *
 * The title says "brand" plainly. The retired flow's "What are we building?"
 * was ambiguous enough that people typed a product or a project, and the brand
 * they got was named after the wrong thing.
 *
 * Pressing Continue CREATES the brand record. Every later step writes to that
 * real brand, which is what makes resume work across sessions and devices —
 * and it is why a name collision is resolved here, visibly, rather than
 * silently renamed behind the user's back at the end.
 */
import { useState, type FormEvent } from 'react';
import { DsButton, DsInput } from '@/shared/ds';
import { SplitShell } from '../components/SplitShell';

export interface NameStepProps {
  busy: boolean;
  error: string | null;
  onContinue(name: string): void;
  onExit?: () => void;
}

export function NameStep({ busy, error, onContinue, onExit }: NameStepProps) {
  const [name, setName] = useState('');
  const ready = name.trim().length > 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
    onContinue(name.trim());
  };

  return (
    <SplitShell nodes={[]} step={1} total={3} onExit={onExit}>
      <div>
        <h1 className="onb-split-h">Let&rsquo;s set up your brand</h1>
        <p className="onb-split-sub">Start with the name. Everything else can change later.</p>
      </div>

      <form className="onb-field" onSubmit={submit} noValidate>
        <DsInput
          id="brand-name"
          label="Brand name"
          value={name}
          autoFocus
          autoComplete="off"
          placeholder="Your brand"
          onChange={(e) => setName(e.target.value)}
          {...(error ? { error } : {})}
        />
        <div className="onb-split-cta">
          <DsButton type="submit" disabled={!ready || busy}>
            {busy ? 'Setting up…' : 'Continue'}
          </DsButton>
        </div>
      </form>
    </SplitShell>
  );
}
