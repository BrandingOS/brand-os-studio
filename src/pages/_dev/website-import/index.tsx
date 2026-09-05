/**
 * /_dev/website-import — Website Brand Import, Gate 2 visual proof.
 *
 * Six states of the perceived journey on fixture data and a scripted event
 * stream. No network, no Edge Function, no AI, no persistence. The screens
 * are the real onboarding UI; only the site chip, the scan notice and this
 * switcher are prototype-local.
 *
 *   ?scenario=complete|partial|unavailable|extracted   which scan plays
 *   ?phase=entry|scan|review                            where to start
 *   ?variant=empty|detected|pill|both                   entry screen only
 *   ?chrome=0                                           hide the switcher
 *
 * Self-gated: DEV or ?dev=1. DISPOSABLE.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { DsSegmented } from '@/shared/ds';
import { EntryState } from './EntryState';
import { ScanState } from './ScanState';
import { ReviewState } from './ReviewState';
import { SITE, type EntryVariant, type Scenario } from './fixtures';
import './websiteImport.css';

type Phase = 'entry' | 'scan' | 'review';

const SCENARIOS: Scenario[] = ['complete', 'partial', 'unavailable', 'extracted'];
const PHASES: Phase[] = ['entry', 'scan', 'review'];
const VARIANTS: EntryVariant[] = ['empty', 'detected', 'pill', 'both'];

function pick<T extends string>(raw: string | null, allowed: readonly T[], fallback: T): T {
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

export default function WebsiteImportPrototypePage() {
  const [sp, setSp] = useSearchParams();
  const gated = import.meta.env.DEV || sp.has('dev');

  const scenario = pick(sp.get('scenario'), SCENARIOS, 'complete');
  const variant = pick(sp.get('variant'), VARIANTS, 'detected');
  const chrome = sp.get('chrome') !== '0';
  const [phase, setPhase] = useState<Phase>(() => pick(sp.get('phase'), PHASES, 'entry'));
  const [run, setRun] = useState(0);

  useEffect(() => {
    setPhase(pick(sp.get('phase'), PHASES, 'entry'));
  }, [sp]);

  const set = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(sp);
      for (const [k, v] of Object.entries(patch)) next.set(k, v);
      setSp(next, { replace: true });
    },
    [sp, setSp],
  );

  const replay = useCallback(() => {
    setRun((n) => n + 1);
    setPhase('scan');
  }, []);

  const onScanDone = useCallback(() => {
    setPhase('review');
    if (scenario === 'unavailable') {
      toast.warning(`We couldn't reach ${SITE.host}`, {
        description: 'Your brief and uploads are here. Everything else can wait for the site.',
        action: { label: 'Try again', onClick: replay },
      });
    } else if (scenario === 'partial') {
      toast(`Read ${SITE.host} — the About page didn't load`, {
        description: 'Logo, colours, fonts and links are in. Mission and values are still yours to add.',
      });
    }
  }, [scenario, replay]);

  const screen = useMemo(() => {
    if (phase === 'entry') return <EntryState variant={variant} onContinue={() => setPhase('scan')} />;
    if (phase === 'scan') return <ScanState key={`${scenario}-${run}`} scenario={scenario} onDone={onScanDone} />;
    return <ReviewState key={`${scenario}-${run}`} scenario={scenario} onRetry={replay} />;
  }, [phase, variant, scenario, run, onScanDone, replay]);

  if (!gated) return null;

  return (
    <>
      {screen}
      {chrome && (
        <aside className="wi-switcher" data-workspace aria-label="Prototype states">
          <span className="wi-switcher-label">Prototype · scenario</span>
          <DsSegmented
            options={SCENARIOS.map((s) => ({ value: s, label: s }))}
            value={scenario}
            onChange={(v) => {
              set({ scenario: v, phase: 'scan' });
              setRun((n) => n + 1);
            }}
          />
          <span className="wi-switcher-label">phase</span>
          <DsSegmented options={PHASES.map((p) => ({ value: p, label: p }))} value={phase} onChange={(v) => set({ phase: v })} />
          {phase === 'entry' && (
            <>
              <span className="wi-switcher-label">entry variant</span>
              <DsSegmented options={VARIANTS.map((p) => ({ value: p, label: p }))} value={variant} onChange={(v) => set({ variant: v })} />
            </>
          )}
        </aside>
      )}
    </>
  );
}
