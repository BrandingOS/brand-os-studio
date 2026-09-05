/**
 * State 1 — the setup screen's second panel, with a website in it.
 *
 * Everything on this screen is the real onboarding UI (`BriefHandoff`,
 * `BrandDropzone`, the cosmos header and footer). The only addition is the
 * site chip between the description and the dropzone.
 *
 * DISPOSABLE — Gate 2 only.
 */
import { useEffect, useMemo, useState } from 'react';
import { CosmosShell } from '@/features/onboarding-v4/components/CosmosShell';
import { BrandMark } from '@/features/onboarding-v4/components/BrandMark';
import { BriefHandoff } from '@/features/onboarding-v4/components/BriefHandoff';
import { BrandDropzone } from '@/features/onboarding-v4/components/BrandDropzone';
import { FooterCTA } from '@/features/onboarding-v4/components/FooterCTA';
import { useV4Store } from '@/features/onboarding-v4/store/onboardingV4Store';
import { websiteOf } from '@/features/onboarding/bridge/reviewWriteThrough';
import { DetectedSiteChip } from './DetectedSiteChip';
import { detectSiteInText } from './detectSite';
import { DESCRIPTIONS, SITE, linkItem, type EntryVariant } from './fixtures';

interface Props {
  variant: EntryVariant;
  onContinue(): void;
}

export function EntryState({ variant, onContinue }: Props) {
  useEffect(() => {
    const s = useV4Store.getState();
    s.reset();
    s.setSetupPanel(2);
    s.updateDefine({ name: SITE.name, description: DESCRIPTIONS[variant] });
    if (variant === 'pill' || variant === 'both') s.addAsset(linkItem(SITE.url, 'website', 'Link'));
  }, [variant]);

  const define = useV4Store((s) => s.define);
  const assets = useV4Store((s) => s.assets);
  const update = useV4Store((s) => s.updateDefine);
  const addAsset = useV4Store((s) => s.addAsset);
  const removeAsset = useV4Store((s) => s.removeAsset);

  const [dismissed, setDismissed] = useState<string | null>(null);
  const pillUrl = websiteOf(assets);
  const pill = useMemo(() => (pillUrl ? new URL(pillUrl).hostname.replace(/^www\./, '') : null), [pillUrl]);
  const found = detectSiteInText(define.description);
  const detected = found && found !== dismissed ? found : null;

  const useDetected = () => {
    if (!detected) return;
    for (const a of assets) if (a.kind === 'link' && a.sourceUrl === pillUrl) removeAsset(a.id);
    addAsset(linkItem(`https://${detected}`, 'website', 'Link'));
  };

  return (
    <CosmosShell variant="setup">
      <div className="container">
        <header className="cosmos-header">
          <BrandMark />
          <h1>Tell us about it</h1>
          <p className="subtitle">Describe the brand, and bring anything you already have.</p>
        </header>

        <section className="panel is-active setup-panel-form">
          <form className="cosmos-form" autoComplete="off" noValidate onSubmit={(e) => e.preventDefault()}>
            <div className="field">
              <BriefHandoff brandName={define.name} value={define.description} onChange={(v) => update({ description: v })} />
            </div>

            <DetectedSiteChip
              pill={pill}
              detected={detected}
              onDismiss={() => setDismissed(found)}
              onUseDetected={useDetected}
            />

            <div className="field">
              <BrandDropzone />
            </div>
          </form>
        </section>

        <FooterCTA
          caption={pill || detected ? `We'll read ${pill ?? detected} as soon as you continue.` : undefined}
          label="Continue"
          onClick={onContinue}
          onBack={() => {}}
        />
      </div>
    </CosmosShell>
  );
}
