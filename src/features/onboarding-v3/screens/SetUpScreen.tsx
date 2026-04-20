import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useOnboardingStore } from '../store/onboardingStore';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { OnboardingDropzone } from '../components/OnboardingDropzone';
import { UrlPillInput } from '../components/UrlPillInput';
import { SparkleAssist } from '../components/SparkleAssist';
import { finalizeAssets } from '../services/finalizeAssets';
import { createBrandFromOnboardingV3 } from '@/features/onboarding/utils/createBrandFromAnswers';

export function SetUpScreen() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const then = sp.get('then') || null;
  const [busy, setBusy] = useState(false);

  const sessionId = useOnboardingStore(s => s.sessionId);
  const define = useOnboardingStore(s => s.define);
  const assets = useOnboardingStore(s => s.assets);
  const update = useOnboardingStore(s => s.updateDefine);
  const reset = useOnboardingStore(s => s.reset);
  const setFlow = useOnboardingStore(s => s.setFlow);

  useEffect(() => {
    setFlow('setup');
  }, [setFlow]);

  const canSubmit = define.name.trim().length > 0 && assets.length >= 1 && assets.every(a => a.uploadStatus !== 'uploading');

  async function onSetup() {
    setBusy(true);
    try {
      const { brandId, slug } = await createBrandFromOnboardingV3({
        mode: 'import',
        define,
        assets,
      });
      const uploaded = assets.filter(a => a.uploadStatus === 'done' && a.scratchPath);
      if (uploaded.length) {
        const result = await finalizeAssets(sessionId, brandId, uploaded.map(a => a.id));
        if (result.failed.length) {
          toast.error(`${result.failed.length} asset(s) failed — retry from the Identity page.`);
        }
      }
      reset();
      navigate(then ?? `/b/${slug}/identity`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-full h-[44px] rounded-xl border border-cosmos-border bg-cosmos-surface px-3.5 text-[14px] placeholder:text-cosmos-muted focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-ring)]';
  const textarea = 'w-full min-h-[96px] rounded-xl border border-cosmos-border bg-cosmos-surface p-3.5 text-[14px] placeholder:text-cosmos-muted focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-ring)]';

  return (
    <div data-onboarding="cosmos" className="min-h-screen">
      <OnboardingHeader
        title="Set up your Brand"
        subtitle="Upload what you already have — logos, PDFs, fonts, references."
        crossLink={{ to: `/onboarding-v3/create${then ? `?then=${encodeURIComponent(then)}` : ''}`, label: 'or create one from scratch →' }}
      />

      <main className="max-w-[620px] mx-auto px-6 py-8 flex flex-col gap-5">
        <input
          type="text"
          className={input}
          placeholder="Brand name"
          value={define.name}
          onChange={(e) => update({ name: e.target.value })}
        />

        <div className="relative">
          <textarea
            className={textarea}
            placeholder="Describe your brand"
            value={define.description}
            onChange={(e) => update({ description: e.target.value })}
          />
          <SparkleAssist
            brandName={define.name}
            onText={(t) => update({ description: t })}
          />
        </div>

        <OnboardingDropzone />
        <UrlPillInput />

        <button
          type="button"
          onClick={onSetup}
          disabled={!canSubmit || busy}
          className="self-end rounded-full h-10 px-6 bg-cosmos-accent text-cosmos-accent-contrast text-[13px] font-medium disabled:opacity-40"
        >
          {busy ? 'Setting up…' : 'Set up'}
        </button>
      </main>
    </div>
  );
}
