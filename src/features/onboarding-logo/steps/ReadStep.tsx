/**
 * Step 2 — the product looks at the mark.
 *
 * Every finding is paired with the decision it drives, and the one reading
 * a machine can genuinely get wrong — symbol, name, or both — is offered back
 * as a question. Nothing here is decoration: the read feeds the direction
 * ranking, the type choice, the logo rules and the lockup.
 */
import { useEffect, useState } from 'react';
import { BrandMark, DsBanner, DsSegmented } from '@/shared/ds';
import { useLogoFlow } from '../model/flowStore';
import type { Composition } from '../model/types';
import { clearSpaceFor, fallbackRead, findingsFor, minWidthFor, readLogo } from '../engine/logoRead';
import { LogoMark } from '../components/LogoMark';

const COMPOSITIONS: Array<{ value: Composition; label: string }> = [
  { value: 'symbol', label: 'A symbol' },
  { value: 'wordmark', label: 'Our name' },
  { value: 'combination', label: 'Both' },
];

export function ReadStep() {
  const logo = useLogoFlow((s) => s.logo);
  const read = useLogoFlow((s) => s.read);
  const setRead = useLogoFlow((s) => s.setRead);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!logo || read) return;
    let live = true;
    readLogo(logo)
      .then((r) => live && setRead(r))
      .catch(() => {
        if (!live) return;
        setError('We couldn’t measure this file precisely, so we used sensible defaults. You can still correct the reading below.');
        setRead(fallbackRead());
      });
    return () => {
      live = false;
    };
  }, [logo, read, setRead]);

  if (!logo) return null;

  if (!read) {
    return (
      <div className="lf-reading" aria-live="polite">
        <BrandMark size={44} loading />
        <p>{error ?? 'Measuring proportions, weight, symmetry and detail…'}</p>
      </div>
    );
  }

  const correct = (composition: Composition) => {
    const traits = { ...read.traits, composition };
    setRead({ ...read, traits, findings: findingsFor(traits, read.metrics) });
  };
  const clear = clearSpaceFor(read.traits);

  return (
    <div className="lf-read">
      <div className="lf-read-stage">
        <div className="lf-clearspace" style={{ padding: `calc(${clear} * 120px)` }}>
          <LogoMark logo={logo} color="#111111" height={120} style={{ maxWidth: '100%' }} />
        </div>
        <div className="lf-read-facts">
          <span>Clear space · {Math.round(clear * 100)}% of height</span>
          <span>Minimum width · {minWidthFor(read.traits)}px</span>
        </div>
      </div>

      <div className="lf-stack">
        <div className="lf-question">
          <span className="lf-question-label">Is your logo a symbol, your name, or both?</span>
          <DsSegmented
            aria-label="What the logo is"
            options={COMPOSITIONS}
            value={read.traits.composition === 'unclear' ? 'symbol' : read.traits.composition}
            onChange={(v) => correct(v as Composition)}
          />
        </div>
        <ul className="lf-findings">
          {read.findings.map((f) => (
            <li key={f.id}>
              <strong>{f.title}</strong>
              <span>{f.detail}</span>
            </li>
          ))}
        </ul>
        {error && <DsBanner tone="warning">{error}</DsBanner>}
      </div>
    </div>
  );
}
