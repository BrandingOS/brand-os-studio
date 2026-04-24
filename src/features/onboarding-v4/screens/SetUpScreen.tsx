import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CosmosShell } from '../components/CosmosShell';
import { BrandMark } from '../components/BrandMark';
import { FlowSwitch } from '../components/FlowSwitch';
import { BrandDropzone } from '../components/BrandDropzone';
import { FooterCTA } from '../components/FooterCTA';
import { useV4Store } from '../store/onboardingV4Store';
import { useBrandStore } from '@/shared/store/brandStore';
import { initialPalettes } from '../data/seedPalettes';

export function SetUpScreen() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const then = sp.get('then');
  const define = useV4Store((s) => s.define);
  const assets = useV4Store((s) => s.assets);
  const update = useV4Store((s) => s.updateDefine);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // reset step on mount so returning to setup doesn't resume a create step
  }, []);

  const hasUploadInFlight = assets.some((a) => a.uploadStatus === 'uploading');
  const canSubmit = define.name.trim().length > 0 && assets.length > 0 && !hasUploadInFlight;

  const handleSubmit = async () => {
    setBusy(true);
    try {
      const palette = initialPalettes()[0];
      const brand = await useBrandStore.getState().create({
        name: define.name.trim(),
        primaryColor: palette.colors[1],
        secondaryColor: palette.colors[2],
        fonts: { primary: 'Inter', secondary: 'Inter' },
        tone: 'Neutral',
        audience: define.description.trim(),
      });
      toast.success('Brand created!');
      useV4Store.getState().reset();
      navigate(then ?? `/b/${brand.slug}/setup`);
    } catch (err) {
      console.error('Failed to create brand:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create brand');
      setBusy(false);
    }
  };

  const createHref = then ? `/onboarding-v4/create?then=${encodeURIComponent(then)}` : '/onboarding-v4/create';

  return (
    <CosmosShell variant="setup">
      <div className="container">
        <header className="cosmos-header">
          <BrandMark />
          <h1>Set up your Brand</h1>
          <p className="subtitle">Upload your brand and let the system structure everything for you.</p>
          <FlowSwitch to={createHref} prefix="No brand yet?" emphasis="Create one from scratch" />
        </header>

        <form className="cosmos-form" autoComplete="off" noValidate onSubmit={(e) => e.preventDefault()}>
          <div className="field">
            <label htmlFor="brand-name">Brand name</label>
            <input
              id="brand-name"
              className="input"
              type="text"
              placeholder="Enter your brand name"
              value={define.name}
              onChange={(e) => update({ name: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              className="textarea"
              placeholder="Tell us about your brand — your vision, your style, your system…"
              value={define.description}
              onChange={(e) => update({ description: e.target.value })}
            />
          </div>

          <div className="field">
            <BrandDropzone />
          </div>
        </form>

        <FooterCTA
          caption="Uploaded everything?"
          label={busy ? 'Setting up…' : 'Set up'}
          onClick={handleSubmit}
          disabled={!canSubmit || busy}
        />
      </div>
    </CosmosShell>
  );
}
