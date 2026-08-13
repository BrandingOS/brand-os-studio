/**
 * The flow shell — three steps, one brand, no wizard.
 *
 * The step machine takes its authority from the BRAND, not the URL: `?step=` is
 * advisory and an out-of-range value redirects to the recorded step. That is
 * what makes resume work from a bookmark, another device, or a stale tab.
 *
 * Understanding is a transition, not a stop. It renders between material and
 * review and advances itself; the step counter never counts it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BrandMark } from '@/shared/ds';
import { useBrandStore } from '@/shared/store/brandStore';
import { useSessionStore } from '@/shared/store/sessionStore';
import { container } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS, type IAssetsService } from '@/core/types/services';
import type { BrandRepository } from '@/domain/brand/repository';
import type { IBrandContextService } from '@/core/services/IBrandContextService';
import type { CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';
import {
  atStep,
  clearPlaceholders,
  placeholderPaths,
  readOnboardingState,
  type OnboardingStep,
} from '@/shared/onboarding/onboardingState';

import { BasicsStep, type BasicsValues } from './steps/BasicsStep';
import { MaterialStep } from './steps/MaterialStep';
import { ReviewStep } from './steps/ReviewStep';
import { useOnboardingStore } from './state/onboardingStore';
import { buildCreateInput } from './understanding/createBrand';
import { interpret, type StartingDirection } from './understanding/interpret';
import { applyProposals, sentinelsRetiredBy } from './understanding/applyProposals';
import { acceptAll, acceptProposal, editValue } from './understanding/acceptance';
import { destinationAfterFinish, finishOnboarding } from './understanding/finish';
import { generateDirections } from './understanding/directions';
import { hydrateReview } from './understanding/hydrate';
import { groupFontFamilies } from './understanding/fonts';
import './onboarding.css';

const STEP_INDEX: Record<OnboardingStep, number> = { basics: 0, material: 1, review: 2 };

export default function OnboardingFlow() {
  const { slug } = useParams<{ slug?: string }>();
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const then = sp.get('then');

  const brands = useBrandStore((s) => s.list);
  const createBrand = useBrandStore((s) => s.create);
  const updateBrand = useBrandStore((s) => s.update);
  const loadAll = useBrandStore((s) => s.loadAll);
  const userId = useSessionStore((s) => s.user?.id);

  const store = useOnboardingStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // `busy` only disables the control on the NEXT render, so a same-tick double
  // click would still reach create. The ref is the synchronous gate.
  const gate = useRef(false);

  const brand = useMemo(() => brands.find((b) => b.slug === slug), [brands, slug]);
  const marker = brand ? readOnboardingState(brand) : null;

  useEffect(() => {
    if (slug && !brand) void loadAll();
  }, [slug, brand, loadAll]);

  // ── Guards ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!slug || !brand) return;
    // Onboarding is not a back door for editing a finished brand.
    if (marker === null) navigate(`/b/${brand.slug}/setup`, { replace: true });
  }, [slug, brand, marker, navigate]);

  const step: OnboardingStep = useMemo(() => {
    if (!slug) return 'basics';
    const asked = sp.get('step');
    // The brand is the authority; the URL is a hint.
    const recorded = marker?.step ?? 'basics';
    return asked === 'material' || asked === 'review' ? (asked as OnboardingStep) : recorded;
  }, [slug, sp, marker]);

  // An out-of-range or absent `?step=` is corrected to the recorded step rather
  // than silently rendering something the brand does not agree with.
  useEffect(() => {
    if (!slug || !marker) return;
    if (sp.get('step') !== step) {
      const next = new URLSearchParams(sp);
      next.set('step', step);
      setSp(next, { replace: true });
    }
  }, [slug, marker, step, sp, setSp]);

  const goStep = useCallback(
    async (next: OnboardingStep) => {
      if (!brand) return;
      const nextMarker = atStep(readOnboardingState(brand), next);
      await updateBrand(brand.id, { onboarding: nextMarker });
      const params = new URLSearchParams(sp);
      params.set('step', next);
      // A real history entry, so browser Back rolls through steps.
      navigate(`/onboard-brand/${brand.slug}?${params.toString()}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [brand, updateBrand, navigate, sp],
  );

  // ── Step 1 → create the brand ───────────────────────────────────
  const onCreate = useCallback(
    async (values: BasicsValues) => {
      if (gate.current) return;
      gate.current = true;
      setBusy(true);
      setError(null);
      try {
        const input = buildCreateInput({ name: values.name, website: values.website });
        const created = await createBrand(input as never);
        useOnboardingStore.getState().reset();
        if (values.description.trim()) {
          sessionStorage.setItem(`onb:desc:${created.id}`, values.description.trim());
        }
        const params = new URLSearchParams();
        params.set('step', 'material');
        if (then) params.set('then', then);
        navigate(`/onboard-brand/${created.slug}?${params.toString()}`, { replace: true });
      } catch (e) {
        setError(
          e instanceof Error && /duplicate|unique/i.test(e.message)
            ? 'You already have a brand with that name. Try another, or add a word to tell them apart.'
            : "Couldn't save that just now. Your details are still here — try again.",
        );
        gate.current = false;
      } finally {
        setBusy(false);
      }
    },
    [createBrand, navigate, then],
  );

  // ── Material → Library ──────────────────────────────────────────
  const onUploaded = useCallback(
    async (item: OnboardingAsset) => {
      if (!brand) return;
      try {
        const assets = container.get<IAssetsService>(SERVICE_KEYS.ASSETS);
        await assets.create({
          brandId: brand.id,
          name: item.name,
          type: item.kind === 'font' ? 'document' : item.kind === 'image' ? 'image' : 'document',
          category: item.isLogo ? 'logo' : 'photo',
          source: 'upload',
          url: item.previewUrl ?? '',
          size: item._file?.size ?? 0,
          tags: [],
          metadata: { originalName: item.name, contentHash: item.contentHash },
          origin: 'uploaded',
        });
      } catch {
        // Per item, in place: one refusal never aborts the batch.
        useOnboardingStore.getState().updateItem(item.id, {
          uploadStatus: 'error',
          error: "Couldn't store this one. Everything else is fine.",
        });
      }
    },
    [brand],
  );

  // ── Understanding — a transition ────────────────────────────────
  const runUnderstanding = useCallback(async () => {
    if (!brand) return;
    const s = useOnboardingStore.getState();
    s.setUnderstanding(true);
    try {
      const description = sessionStorage.getItem(`onb:desc:${brand.id}`) ?? undefined;
      const proposals = await interpret(
        { description, items: s.items, direction: s.chosenDirection ?? undefined },
        { groupFonts: groupFontFamilies },
      );
      s.setProposals(proposals);

      const repo = container.get<BrandRepository>(SERVICE_KEYS.BRAND_REPOSITORY);
      const report = await applyProposals(repo, brand.id, proposals);

      // A real value retires its sentinel, permanently.
      const retired = sentinelsRetiredBy(report);
      if (retired.length) {
        const next = clearPlaceholders(readOnboardingState(brand), retired);
        if (next) await updateBrand(brand.id, { onboarding: next });
      }
      if (report.failed.length) {
        s.setProblem(
          `We couldn't save ${report.failed.length === 1 ? 'one thing' : `${report.failed.length} things`} we found. Everything else is here.`,
        );
      }
    } finally {
      useOnboardingStore.getState().setUnderstanding(false);
    }
  }, [brand, updateBrand]);

  // ── Resume: rebuild the review from the brand ───────────────────
  // Proposals are Core values below `confirmed`, so nothing needs restoring —
  // only reading. Without this, returning to review after a reload would look
  // like the flow had lost everything the user brought.
  const hydrated = useRef<string | null>(null);
  useEffect(() => {
    if (step !== 'review' || !brand) return;
    if (store.understanding) return;              // a fresh pass is running
    if (hydrated.current === brand.id) return;    // already read this brand
    if (store.proposals.length > 0) return;       // this session produced them
    hydrated.current = brand.id;
    void (async () => {
      const canonical = await container
        .get<BrandRepository>(SERVICE_KEYS.BRAND_REPOSITORY)
        .getById(brand.id);
      if (!canonical) return;
      const { proposals, confirmed } = hydrateReview(canonical, placeholderPaths(brand));
      const s = useOnboardingStore.getState();
      s.setProposals(proposals);
      if (confirmed.size) s.markConfirmed([...confirmed]);
    })();
  }, [step, brand, store.understanding, store.proposals.length]);

  // ── Review actions ──────────────────────────────────────────────
  const humanActor = useMemo(
    () => ({ kind: 'human' as const, userId: userId ?? 'unattributed' }),
    [userId],
  );
  const repo = () => container.get<BrandRepository>(SERVICE_KEYS.BRAND_REPOSITORY);

  const onAccept = useCallback(
    async (path: CoreFieldPath) => {
      if (!brand) return;
      setBusy(true);
      try {
        await acceptProposal(repo(), brand.id, path, humanActor);
        useOnboardingStore.getState().markConfirmed([path]);
      } catch {
        useOnboardingStore.getState().setProblem(
          "Couldn't confirm that just now. It's still saved as a suggestion.",
        );
      } finally {
        setBusy(false);
      }
    },
    [brand, humanActor],
  );

  const onAcceptSection = useCallback(
    async (paths: CoreFieldPath[]) => {
      if (!brand || !paths.length) return;
      setBusy(true);
      try {
        // A LOOP over the per-value act — never a section-level authority.
        await acceptAll(repo(), brand.id, paths, humanActor);
        useOnboardingStore.getState().markConfirmed(paths);
      } catch {
        useOnboardingStore.getState().setProblem(
          "Couldn't confirm all of those. Anything that didn't take is still a suggestion.",
        );
      } finally {
        setBusy(false);
      }
    },
    [brand, humanActor],
  );

  const onEdit = useCallback(
    async (path: CoreFieldPath, next: string) => {
      if (!brand) return;
      setBusy(true);
      try {
        await editValue(repo(), brand.id, path, next, humanActor);
        useOnboardingStore.getState().markConfirmed([path]);
      } catch {
        useOnboardingStore.getState().setProblem("Couldn't save that edit. Your text is still here.");
      } finally {
        setBusy(false);
      }
    },
    [brand, humanActor],
  );

  const onFinish = useCallback(async () => {
    if (!brand || gate.current) return;
    gate.current = true;
    setBusy(true);
    try {
      const website = brand.publicUrl;
      const report = await finishOnboarding({
        brand,
        ...(website ? { businessInfo: { contact: { website } } } : {}),
        updateBrand: async (id, patch) => { await updateBrand(id, patch); },
        context: container.get<IBrandContextService>(SERVICE_KEYS.BRAND_CONTEXT),
      });
      if (report.notSaved.length) {
        // Never a success screen for something we did not store.
        useOnboardingStore.getState().setProblem(`Couldn't save ${report.notSaved.join(' and ')}.`);
      }
      sessionStorage.removeItem(`onb:desc:${brand.id}`);
      useOnboardingStore.getState().reset();
      navigate(destinationAfterFinish(brand.slug, then));
    } catch {
      useOnboardingStore.getState().setProblem("Couldn't finish just now. Nothing was lost — try again.");
      gate.current = false;
    } finally {
      setBusy(false);
    }
  }, [brand, updateBrand, navigate, then]);

  // ── Render ──────────────────────────────────────────────────────
  const progress = ((STEP_INDEX[step] + 1) / 3) * 100;

  return (
    <div className="onb">
      <div className="onb-container">
        <div className="onb-top">
          <BrandMark size={20} />
          <button type="button" className="onb-exit" onClick={() => navigate('/dashboard/brands')}>
            Exit
          </button>
        </div>

        <div className="onb-rule" role="presentation">
          <i style={{ width: `${progress}%` }} />
        </div>
        <p className="onb-eyebrow ds-eyebrow">Step {STEP_INDEX[step] + 1} of 3</p>

        <div className="onb-body">
          {step === 'basics' && <BasicsStep busy={busy} error={error} onContinue={onCreate} />}

          {step === 'material' && brand && (
            <MaterialStep
              brandName={brand.name}
              directions={store.directions}
              chosenDirection={store.chosenDirection}
              onChooseDirection={(d: StartingDirection) => store.chooseDirection(d)}
              onAskForHelp={() =>
                store.setDirections(
                  generateDirections(
                    brand.name,
                    sessionStorage.getItem(`onb:desc:${brand.id}`) ?? '',
                  ),
                )
              }
              onAnotherDirection={() =>
                store.setDirections(
                  generateDirections(
                    brand.name,
                    sessionStorage.getItem(`onb:desc:${brand.id}`) ?? '',
                    store.directions.length,
                  ),
                )
              }
              onUploaded={(i) => void onUploaded(i)}
              onContinue={() => {
                void runUnderstanding();
                void goStep('review');
              }}
            />
          )}

          {step === 'review' && brand && (
            <ReviewStep
              proposals={store.proposals}
              confirmed={store.confirmed}
              material={store.items}
              busy={busy}
              problem={store.problem}
              stillReading={store.understanding}
              onAccept={(p) => void onAccept(p)}
              onAcceptSection={(p) => void onAcceptSection(p)}
              onEdit={(p, v) => void onEdit(p, v)}
              onFinish={() => void onFinish()}
              onDismissProblem={() => store.setProblem(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
