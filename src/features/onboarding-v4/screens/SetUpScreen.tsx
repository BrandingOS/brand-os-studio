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
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CosmosShell } from '../components/CosmosShell';
import { BrandMark } from '../components/BrandMark';
import { FlowSwitch } from '../components/FlowSwitch';
import { FooterCTA } from '../components/FooterCTA';
import { SetupPanel } from '../panels/SetupPanel';
import { UploadsReviewPanel } from '../panels/UploadsReviewPanel';

import { useV4Store } from '../store/onboardingV4Store';
import { extractDominantColors, genId, normalizeHex } from '../utils/assetUpload';
import { useBrandStore } from '@/shared/store/brandStore';
import { useSessionStore } from '@/shared/store/sessionStore';
import { container } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS } from '@/core/types/services';
import type { IBrandContextService } from '@/core/services/IBrandContextService';
import type { Brand } from '@/shared/types/brand';
import { atStep, placeholderPaths, readOnboardingState, resumeStep } from '@/shared/onboarding/onboardingState';
import { UnderstandingStage } from '@/features/onboarding/steps/UnderstandingStage';
import { planStages, findingsFrom, type Finding } from '@/features/onboarding/understanding/stages';
import { groupFontFamilies } from '@/features/onboarding/understanding/fonts';
import { classifyLogos } from '@/features/onboarding/understanding/logoClassify';
import { looksLikeBrief } from '@/features/onboarding/brief/parseBrief';
import { fingerprint, type Print } from '@/features/onboarding/understanding/imageFingerprint';
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

const PANEL_META: Record<1 | 2 | 3, { caption?: string; label: string }> = {
  1: { label: 'Continue' },
  2: { label: 'Continue' },
  3: { label: 'Open my brand' },
};

const HEADINGS: Record<1 | 2, { title: string; subtitle: string }> = {
  1: {
    title: 'Set up your Brand',
    subtitle: 'Upload your brand and let the system structure everything for you.',
  },
  2: {
    title: 'Tell us about it',
    subtitle: 'Describe the brand, and bring anything you already have.',
  },
};

/**
 * Which panel a URL asks for.
 *
 * The step is in the URL rather than only in memory, so refreshing, sharing or
 * landing back on the flow does something sensible, and so each step is
 * distinguishable in analytics. A hash was rejected: it is not sent to the
 * server, collides with in-page anchoring, and reads as a fragment of one page
 * rather than a step of a flow.
 *
 * The pre-brand steps hold nothing durable, so `?step=details` on a cold load
 * falls back to the first panel rather than showing a details screen for a
 * brand with no name. Review is different — the brand exists by then, so
 * `/onboard-brand/:slug?step=review` is genuinely restorable.
 */
const STEP_PARAM: Record<1 | 2 | 3, string | null> = { 1: null, 2: 'details', 3: 'review' };

export function SetUpScreen() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  const [sp] = useSearchParams();
  const then = sp.get('then');
  const askedStep = sp.get('step');
  const define = useV4Store((s) => s.define);
  const assets = useV4Store((s) => s.assets);
  const setupPanel = useV4Store((s) => s.setupPanel);
  const setSetupPanel = useV4Store((s) => s.setSetupPanel);
  const updateAsset = useV4Store((s) => s.updateAsset);

  const createBrand = useBrandStore((s) => s.create);
  const updateBrand = useBrandStore((s) => s.update);
  const brands = useBrandStore((s) => s.list);
  const userId = useSessionStore((s) => s.user?.id);

  const [busy, setBusy] = useState(false);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [processing, setProcessing] = useState(false);
  const [findings, setFindings] = useState<Record<string, Finding | null>>({});
  const [projection, setProjection] = useState<Projection | null>(null);
  /**
   * Visual fingerprints, computed once during processing and reused after.
   * Rendering eight images to a canvas on every projection would be wasteful,
   * and the artwork does not change while the review is open.
   */
  const printsRef = useRef<Map<string, Print | null>>(new Map());

  // `busy` disables the CTA only after the next render — a second click in the
  // same tick still reaches submit and created a DUPLICATE brand. The ref is
  // the synchronous re-entrancy gate; `busy` is just the UI.
  const busyRef = useRef(false);

  /**
   * The URL is the authority for which panel shows; the store follows it.
   *
   * That means browser Back and Forward simply work — they are ordinary route
   * changes — and there is no popstate listener to keep in step with a second
   * copy of the same fact.
   */
  useEffect(() => {
    const wanted: 1 | 2 | 3 =
      askedStep === 'review' && slug ? 3 : askedStep === 'details' && define.name.trim() ? 2 : 1;
    if (wanted !== setupPanel) setSetupPanel(wanted);
    // A details URL with nothing typed is a cold load or a stale share. Correct
    // the address rather than leaving it lying about where the user is.
    if (askedStep === 'details' && !define.name.trim()) {
      navigate('/onboard-brand' + (then ? `?then=${encodeURIComponent(then)}` : ''), { replace: true });
      return;
    }
    // Resuming an unfinished brand — `/onboard-brand/:slug` with no step named.
    // The brand's own marker knows where its owner stopped, so the address is
    // corrected to that step rather than dropping them at the first panel with
    // their review already built and invisible. A brand that never got past the
    // setup panel has nothing durable to restore and stays where it is.
    if (slug && !askedStep) {
      const resuming = brands.find((b) => b.slug === slug);
      if (resuming && resumeStep(resuming) === 'review') {
        const qs = then ? `?step=review&then=${encodeURIComponent(then)}` : '?step=review';
        navigate(`/onboard-brand/${slug}${qs}`, { replace: true });
      }
    }
  }, [askedStep, slug, define.name, setupPanel, setSetupPanel, navigate, then, brands]);

  /** Moves to a panel BY navigating, so history and the URL cannot disagree. */
  const goToPanel = useCallback(
    (panel: 1 | 2 | 3, brandSlug?: string) => {
      const params = new URLSearchParams();
      const step = STEP_PARAM[panel];
      if (step) params.set('step', step);
      if (then) params.set('then', then);
      const path = brandSlug ? `/onboard-brand/${brandSlug}` : '/onboard-brand';
      const qs = params.toString();
      navigate(qs ? `${path}?${qs}` : path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [navigate, then],
  );

  const hasUploadInFlight = assets.some((a) => a.uploadStatus === 'uploading');

  const canAdvance = useMemo(() => {
    // The name is the only thing the flow ever requires.
    if (setupPanel === 1) return define.name.trim().length > 0;
    return !hasUploadInFlight;
  }, [setupPanel, define.name, hasUploadInFlight]);

  const humanActor = useMemo(
    () => ({ kind: 'human' as const, userId: userId ?? 'unattributed' }),
    [userId],
  );

  /**
   * Reads the brand back and re-projects it onto the review.
   *
   * The sentinel list is read from the STORE, not from the `b` passed in: `b` is
   * usually the record as created, and understanding retires sentinels through a
   * separate write. Projecting against the stale copy treated a real extracted
   * colour as a stand-in and the Colors section rendered empty while the brand
   * held #231F20.
   */
  const refresh = useCallback(async (b: Brand) => {
    const canonical = await brandRepository().getById(b.id);
    if (!canonical) return;
    const live = useBrandStore.getState().list.find((x) => x.id === b.id) ?? b;
    setProjection(
      project(canonical, useV4Store.getState().assets, placeholderPaths(live), printsRef.current),
    );
  }, []);

  /**
   * Resume: `/onboard-brand/:slug?step=review` after a reload.
   *
   * The brand is the durable half of this flow, so a review URL can be restored
   * — the values are on the record, and the projection reads them back. What
   * cannot be restored is the transient upload list, so the logo board comes
   * back empty; the Library still holds the files.
   */
  const updateDefine = useV4Store((s) => s.updateDefine);
  useEffect(() => {
    if (!slug || brand?.slug === slug) return;
    const found = brands.find((b) => b.slug === slug);
    if (!found) {
      // Depends on `brands`, not just the slug: on a cold load the store is
      // still empty when this first runs, and without the list as a dependency
      // the effect never fired again — the review rendered its shell with
      // nothing in it.
      void useBrandStore.getState().loadAll();
      return;
    }
    setBrand(found);
    // The name lives on the brand; the transient store does not survive a
    // reload, so take it back from the record rather than showing a blank
    // brand bar.
    updateDefine({ name: found.name });
    void refresh(found);
  }, [slug, brand?.slug, brands, refresh, updateDefine]);

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

  /**
   * Pulls the palette out of the artwork the user brought.
   *
   * Runs BEFORE interpretation, which is the whole point: the review used to
   * show a single colour because extraction lived in the review panel's own
   * mount effect and therefore happened after understanding had already
   * decided the brand's palette from nothing.
   *
   * Capped at five. A brand has a palette, not a swatch library, and every
   * extra swatch past that is noise the user has to delete.
   */
  const extractColours = useCallback(async () => {
    const store = useV4Store.getState();
    if (store.assets.some((a) => a.kind === 'color')) return;
    const artwork = store.assets.filter((a) => a.kind === 'image' && a.previewUrl).slice(0, 3);
    if (!artwork.length) return;

    const found: string[] = [];
    for (const img of artwork) {
      if (found.length >= 5) break;
      try {
        for (const hex of await extractDominantColors(img.previewUrl as string, 6)) {
          const normalised = normalizeHex(hex);
          if (!normalised || found.includes(normalised)) continue;
          found.push(normalised);
          if (found.length >= 5) break;
        }
      } catch {
        /* one unreadable image costs its own colours, never the batch */
      }
    }

    found.forEach((hex, i) => {
      store.addAsset({
        id: genId(),
        name: hex,
        sub: i === 0 ? 'Primary' : 'Extracted',
        kind: 'color',
        value: hex,
        previewUrl: null,
        uploadStatus: 'done',
        uploadProgress: 1,
      });
    });
  }, []);

  /** The real work the processing screen observes. It observes nothing back. */
  const runUnderstanding = useCallback(async () => {
    if (!brand) return;

    // Fingerprint the artwork first: everything downstream — duplicate folding,
    // slot assignment, the logo count — depends on knowing which pictures are
    // the same picture, and filenames do not say.
    const images = useV4Store.getState().assets.filter((a) => a.kind === 'image' && a.previewUrl);
    for (const img of images) {
      if (printsRef.current.has(img.id)) continue;
      printsRef.current.set(img.id, await fingerprint(img.previewUrl as string));
    }

    await extractColours();
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

    // Fold redundant copies of the same artwork HERE, while the review does not
    // yet exist. Doing it in the panel raced its own logo router — the router
    // places any logo it can see on mount, so a copy removed a moment later had
    // already been handed a slot, and six uploads of three marks still drew six
    // tiles.
    const logos = classifyLogos(items, printsRef.current);
    const redundant = logos.groups.flatMap((g) => g.variants.map((v) => v.id));
    for (const id of redundant) useV4Store.getState().removeAsset(id);

    setFindings(
      findingsFrom({
        logoGroups: logos.groups.length,
        logoVariants: redundant.length,
        colors: understanding.proposals.filter((p) => p.corePath.startsWith('colors.')).length,
        typeface: groupFontFamilies(items)[0]?.family,
        industryLabel: labelOf('industry', understanding.business.industry),
        fileCount: items.filter((a) => a.kind !== 'color').length,
      }),
    );

    await refresh(brand);
  }, [brand, updateBrand, refresh, define.description, extractColours]);

  /**
   * Records that the user is standing on the review.
   *
   * Until this is written the brand's marker still says `setup`, so leaving
   * without finishing sent the user back to a blank name panel while a fully
   * built review sat on the record. The marker is read LIVE from the store
   * rather than from the `brand` captured at create time — understanding has
   * written to it in between, and a stale copy would put the placeholders back.
   */
  const recordAtReview = useCallback(
    async (b: Brand) => {
      const live = useBrandStore.getState().list.find((x) => x.id === b.id) ?? b;
      try {
        await updateBrand(b.id, { onboarding: atStep(readOnboardingState(live), 'review') });
      } catch {
        // Losing your place is a nuisance; blocking the review over it is worse.
      }
    },
    [updateBrand],
  );

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
    if (setupPanel === 1) goToPanel(2);
    else if (setupPanel === 2) void beginUnderstanding();
    else void finish();
  };

  const goBack = () => {
    if (setupPanel > 1) navigate(-1);
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
              // The brand exists now, so the review gets an address that can be
              // refreshed, shared and resumed — and the marker says so, which is
              // what makes "Resume" from the dashboard land back here.
              void recordAtReview(brand);
              goToPanel(3, brand.slug);
            }}
          />
        </div>
      </CosmosShell>
    );
  }

  return (
    <CosmosShell variant="setup">
      <div className="container">
        {setupPanel !== 3 && (
          <header className="cosmos-header">
            <BrandMark />
            <h1>{HEADINGS[setupPanel].title}</h1>
            <p className="subtitle">{HEADINGS[setupPanel].subtitle}</p>
            {setupPanel === 1 && (
              <FlowSwitch to={createHref} prefix="No brand yet?" emphasis="Create one from scratch" />
            )}
          </header>
        )}

        {setupPanel === 1 && (
          <SetupPanel key="name" part={1} onSubmit={() => canAdvance && goNext()} />
        )}
        {setupPanel === 2 && <SetupPanel key="details" part={2} />}
        {setupPanel === 3 && (
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
          label={busy ? (setupPanel === 3 ? 'Opening…' : 'Setting up…') : meta.label}
          onClick={goNext}
          disabled={!canAdvance || busy}
          onBack={setupPanel > 1 ? goBack : undefined}
          backDisabled={busy}
        />
      </div>
    </CosmosShell>
  );
}
