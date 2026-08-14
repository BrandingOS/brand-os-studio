/**
 * /onboard-brand — "Set up your Brand".
 *
 * The screen is unchanged. What changed is everything under it: this used to
 * assemble a legacy payload at the end — data-URL logos, an inline `assets[]`,
 * a tiered create-then-patch fallback around the browser storage budget — and
 * now it drives the V3 pipeline instead.
 *
 *   Continue    creates the brand (brand-first), sends the supplied material to
 *               the Library, then runs understanding
 *   processing  the BrandingOS 9-dot mark, narrating only work that is running
 *   review      the same "Review your uploads" panel, now a projection of the
 *               canonical brand
 *   Open my     finishes: marks onboarding complete and hands off to Setup
 *   brand
 *
 * The ~180 lines of storage-budget recovery are gone with the model that needed
 * them: because the brand exists from the first Continue, every later write is
 * an ordinary write against a real id, and material is in the Library rather
 * than embedded on the record.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CosmosShell } from '../components/CosmosShell';
import { BrandMark } from '../components/BrandMark';
import { FlowSwitch } from '../components/FlowSwitch';
import { FooterCTA } from '../components/FooterCTA';
import { SetupPanel } from '../panels/SetupPanel';
import { UploadsReviewPanel } from '../panels/UploadsReviewPanel';

import { useV4Store } from '../store/onboardingV4Store';
import { useBrandStore } from '@/shared/store/brandStore';
import { useSessionStore } from '@/shared/store/sessionStore';
import { container } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS } from '@/core/types/services';
import type { IBrandContextService } from '@/core/services/IBrandContextService';
import type { Brand } from '@/shared/types/brand';
import { placeholderPaths } from '@/shared/onboarding/onboardingState';
import { UnderstandingStage } from '@/features/onboarding/steps/UnderstandingStage';
import { planStages, findingsFrom, type Finding } from '@/features/onboarding/understanding/stages';
import { groupFontFamilies } from '@/features/onboarding/understanding/fonts';
import { classifyLogos } from '@/features/onboarding/understanding/logoClassify';
import { looksLikeBrief } from '@/features/onboarding/brief/parseBrief';
import {
  brandRepository,
  createBrand as createTheBrand,
  labelOf,
  project,
  toLibrary,
  understand,
  type Projection,
} from '@/features/onboarding/bridge/v4Bridge';
import { destinationAfterFinish, finishOnboarding } from '@/features/onboarding/understanding/finish';

const PANEL_META: Record<1 | 2, { caption?: string; label: string }> = {
  1: { label: 'Continue' },
  2: { label: 'Open my brand' },
};

export function SetUpScreen() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const then = sp.get('then');
  const define = useV4Store((s) => s.define);
  const assets = useV4Store((s) => s.assets);
  const setupPanel = useV4Store((s) => s.setupPanel);
  const setSetupPanel = useV4Store((s) => s.setSetupPanel);
  const updateAsset = useV4Store((s) => s.updateAsset);

  const createBrand = useBrandStore((s) => s.create);
  const updateBrand = useBrandStore((s) => s.update);
  const userId = useSessionStore((s) => s.user?.id);

  const [busy, setBusy] = useState(false);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [processing, setProcessing] = useState(false);
  const [findings, setFindings] = useState<Record<string, Finding | null>>({});
  const [projection, setProjection] = useState<Projection | null>(null);

  // `busy` disables the CTA only after the next render — a second click in the
  // same tick still reaches submit and created a DUPLICATE brand. The ref is
  // the synchronous re-entrancy gate; `busy` is just the UI.
  const busyRef = useRef(false);

  useEffect(() => {
    if (setupPanel !== 1) setSetupPanel(1);
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const target = (e.state as { setupPanel?: 1 | 2 } | null)?.setupPanel ?? 1;
      setSetupPanel(target);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [setSetupPanel]);

  const hasUploadInFlight = assets.some((a) => a.uploadStatus === 'uploading');

  const canAdvance = useMemo(() => {
    if (setupPanel === 1) return define.name.trim().length > 0 && !hasUploadInFlight;
    return !hasUploadInFlight;
  }, [setupPanel, define.name, hasUploadInFlight]);

  const humanActor = useMemo(
    () => ({ kind: 'human' as const, userId: userId ?? 'unattributed' }),
    [userId],
  );

  /** Reads the brand back and re-projects it onto the review. */
  const refresh = useCallback(async (b: Brand) => {
    const canonical = await brandRepository().getById(b.id);
    if (!canonical) return;
    setProjection(project(canonical, useV4Store.getState().assets, placeholderPaths(b)));
  }, []);

  // ── Continue from the setup panel ──────────────────────────────────
  const beginUnderstanding = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      // The website is whatever the dropzone's URL pill captured — it is
      // optional and stays optional.
      const website = useV4Store
        .getState()
        .assets.find((a) => a.kind === 'link' && a.socialPlatform === 'website')?.sourceUrl;
      const created = await createTheBrand(
        createBrand as never,
        updateBrand as never,
        {
          name: define.name,
          description: define.description ?? '',
          ...(website ? { website } : {}),
        },
      );
      setBrand(created);

      // Material was held while there was no brand to attach it to. It goes to
      // the Library now — before the review, so what the review shows is what
      // the Library holds.
      const held = useV4Store.getState().assets.filter((a) => a.kind !== 'color');
      for (const item of held) {
        await toLibrary(created.id, item, (id, reason) =>
          updateAsset(id, { uploadStatus: 'error', sub: reason }),
        );
      }

      setProcessing(true);
    } catch (err) {
      busyRef.current = false;
      setBusy(false);
      const message =
        err instanceof Error && /duplicate|unique/i.test(err.message)
          ? 'You already have a brand with that name. Try another, or add a word to tell them apart.'
          : "Couldn't save that just now. Your details are still here — try again.";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }, [createBrand, updateBrand, define, updateAsset]);

  /** The real work the processing screen observes. It observes nothing back. */
  const runUnderstanding = useCallback(async () => {
    if (!brand) return;
    const items = useV4Store.getState().assets;
    const { understanding, notSaved } = await understand(
      brand,
      items,
      updateBrand as never,
      define.description,
    );

    if (notSaved.length) {
      toast.warning(`Couldn't save ${notSaved.join(' and ')}.`, {
        description: 'Everything else is here.',
      });
    }

    const logos = classifyLogos(items);
    setFindings(
      findingsFrom({
        logoGroups: logos.groups.length,
        logoVariants: logos.groups.reduce((n, g) => n + g.variants.length, 0),
        colors: understanding.proposals.filter((p) => p.corePath.startsWith('colors.')).length,
        typeface: groupFontFamilies(items)[0]?.family,
        industryLabel: labelOf('industry', understanding.business.industry),
        fileCount: items.filter((a) => a.kind !== 'color').length,
      }),
    );

    await refresh(brand);
  }, [brand, updateBrand, refresh, define.description]);

  // ── Open my brand ──────────────────────────────────────────────────
  const finish = useCallback(async () => {
    if (!brand || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const report = await finishOnboarding({
        brand,
        live: (id) => useBrandStore.getState().list.find((b) => b.id === id),
        ...(brand.publicUrl ? { businessInfo: { contact: { website: brand.publicUrl } } } : {}),
        updateBrand: async (id, patch) => {
          await updateBrand(id, patch);
        },
        context: container.get<IBrandContextService>(SERVICE_KEYS.BRAND_CONTEXT),
      });
      // Never report success for something we did not store.
      if (report.notSaved.length) {
        toast.warning(`Couldn't save ${report.notSaved.join(' and ')}.`);
      }
      useV4Store.getState().reset();
      navigate(destinationAfterFinish(brand.slug, then));
    } catch {
      busyRef.current = false;
      setBusy(false);
      toast.error("Couldn't finish just now. Nothing was lost — try again.");
    }
  }, [brand, updateBrand, navigate, then]);

  const goNext = () => {
    if (setupPanel === 1) {
      void beginUnderstanding();
    } else {
      void finish();
    }
  };

  const goBack = () => {
    if (setupPanel > 1) window.history.back();
  };

  const createHref = then ? `/onboard-brand/create?then=${encodeURIComponent(then)}` : '/onboard-brand/create';
  const meta = PANEL_META[setupPanel];

  // ── The processing moment ──────────────────────────────────────────
  if (processing && brand) {
    const items = useV4Store.getState().assets;
    const stages = planStages({
      brandName: brand.name,
      hasText: Boolean(define.description?.trim()),
      hasBrief: looksLikeBrief(define.description ?? ''),
      website: brand.publicUrl,
      items,
      results: () => findings,
    });
    return (
      <CosmosShell variant="setup">
        <div className="container">
          <UnderstandingStage
            brandName={brand.name}
            stages={stages}
            work={runUnderstanding}
            onDone={() => {
              setProcessing(false);
              busyRef.current = false;
              window.history.pushState({ setupPanel: 2 }, '', window.location.pathname + window.location.search);
              setSetupPanel(2);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      </CosmosShell>
    );
  }

  return (
    <CosmosShell variant="setup">
      <div className="container">
        {setupPanel === 1 && (
          <header className="cosmos-header">
            <BrandMark />
            <h1>Set up your Brand</h1>
            <p className="subtitle">Upload your brand and let the system structure everything for you.</p>
            <FlowSwitch to={createHref} prefix="No brand yet?" emphasis="Create one from scratch" />
          </header>
        )}

        {setupPanel === 1 && <SetupPanel key="setup" />}
        {setupPanel === 2 && (
          <UploadsReviewPanel
            key="uploads"
            brandId={brand?.id}
            projection={projection}
            actor={humanActor}
            onChanged={() => brand && void refresh(brand)}
          />
        )}

        <FooterCTA
          caption={meta.caption}
          label={busy ? (setupPanel === 1 ? 'Setting up…' : 'Opening…') : meta.label}
          onClick={goNext}
          disabled={!canAdvance || busy}
          onBack={setupPanel > 1 ? goBack : undefined}
          backDisabled={busy}
        />
      </div>
    </CosmosShell>
  );
}
