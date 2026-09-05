/**
 * State 6 — the real review, fed by the fixture.
 *
 * `UploadsReviewPanel` is mounted exactly as the flow mounts it. The store is
 * seeded before the panel's first render (a state initialiser, not an effect)
 * so the panel's own projection effect finds the logo items it expects.
 *
 * DISPOSABLE — Gate 2 only.
 */
import { useState } from 'react';
import { CosmosShell } from '@/features/onboarding-v4/components/CosmosShell';
import { FooterCTA } from '@/features/onboarding-v4/components/FooterCTA';
import { UploadsReviewPanel } from '@/features/onboarding-v4/panels/UploadsReviewPanel';
import { useV4Store } from '@/features/onboarding-v4/store/onboardingV4Store';
import type { Projection } from '@/features/onboarding/bridge/v4Bridge';
import { ScanNotice } from './ScanNotice';
import {
  DESCRIPTIONS,
  SITE,
  linkItem,
  projectionBriefOnly,
  projectionComplete,
  projectionExtractedOnly,
  projectionPartial,
  websiteColors,
  websiteLinks,
  websiteLogos,
  type Scenario,
} from './fixtures';

const ACTOR = { kind: 'human' as const, userId: 'prototype' };

function seed(scenario: Scenario): Projection {
  const s = useV4Store.getState();
  s.reset();
  s.setSetupPanel(3);
  s.updateDefine({ name: SITE.name, description: DESCRIPTIONS.detected });
  if (scenario === 'unavailable') {
    s.addAsset(linkItem(SITE.url, 'website', 'Link'));
    return projectionBriefOnly();
  }
  for (const a of websiteLogos()) s.addAsset(a);
  for (const a of websiteLinks()) s.addAsset(a);
  for (const a of websiteColors()) s.addAsset(a);
  if (scenario === 'partial') return projectionPartial();
  if (scenario === 'extracted') return projectionExtractedOnly();
  return projectionComplete();
}

interface Props {
  scenario: Scenario;
  onRetry(): void;
}

export function ReviewState({ scenario, onRetry }: Props) {
  const [projection] = useState(() => seed(scenario));
  return (
    <CosmosShell variant="setup">
      <div className="container">
        <ScanNotice scenario={scenario} onRetry={onRetry} onAddCredits={() => {}} />
        <UploadsReviewPanel key={scenario} projection={projection} actor={ACTOR} onChanged={() => {}} />
        <FooterCTA label="Open my brand" onClick={() => {}} onBack={() => {}} />
      </div>
    </CosmosShell>
  );
}
