/**
 * State 2 — the processing moment, running a scripted scan.
 *
 * The screen is the real `UnderstandingStage`; the stages are the website
 * scan's eight, and each lights on its scripted event.
 *
 * DISPOSABLE — Gate 2 only.
 */
import { useMemo } from 'react';
import { CosmosShell } from '@/features/onboarding-v4/components/CosmosShell';
import { UnderstandingStage } from '@/features/onboarding/steps/UnderstandingStage';
import '@/features/onboarding/onboarding.css';
import { SCRIPTS, SITE, type Scenario } from './fixtures';
import { scriptedScan } from './scan';

interface Props {
  scenario: Scenario;
  onDone(): void;
}

export function ScanState({ scenario, onDone }: Props) {
  const scan = useMemo(() => scriptedScan(SCRIPTS[scenario]), [scenario]);
  return (
    <CosmosShell variant="setup">
      <div className="container">
        <UnderstandingStage key={scenario} brandName={SITE.name} stages={scan.stages} work={scan.work} onDone={onDone} />
      </div>
    </CosmosShell>
  );
}
