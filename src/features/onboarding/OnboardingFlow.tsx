/**
 * The flow shell — two screens and a transition, one brand, no wizard.
 *
 * The step machine takes its authority from the BRAND, not the URL: `?step=` is
 * advisory and an out-of-range value redirects to the recorded step. That is
 * what makes resume work from a bookmark, another device, or a stale tab.
 *
 * Understanding is a TRANSITION, not a screen. It renders between the setup
 * screen and the review and advances itself; it is never a stop.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useBrandStore } from '@/shared/store/brandStore';
import { useSessionStore } from '@/shared/store/sessionStore';
import { container } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS, type IAssetsService } from '@/core/types/services';
import type { BrandRepository } from '@/domain/brand/repository';
import type { IBrandContextService } from '@/core/services/IBrandContextService';
import type { CanonicalBrand } from '@/domain/brand';
import type { CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import type { LogoSlot, OnboardingAsset } from '@/shared/upload/intakeTypes';
import { extractDominantColors } from '@/shared/upload/intake';
import {
  atStep,
  clearPlaceholders,
  placeholderPaths,
  readOnboardingState,
  withBrief,
  type OnboardingStep,
} from '@/shared/onboarding/onboardingState';

import { SetupStep } from './steps/SetupStep';
import { UnderstandingStage } from './steps/UnderstandingStage';
import { ReviewStep } from './steps/ReviewStep';
import { useOnboardingStore } from './state/onboardingStore';
import { buildCreateInput, normalizeUrl } from './understanding/createBrand';
import { interpret, type Understanding } from './understanding/interpret';
import { applyBusinessFacts, applyProposals, sentinelsRetiredBy } from './understanding/applyProposals';
import { acceptAll, acceptProposal, editValue } from './understanding/acceptance';
import { destinationAfterFinish, finishOnboarding } from './understanding/finish';
import { hydrateReview } from './understanding/hydrate';
import { groupFontFamilies } from './understanding/fonts';
import { classifyLogos, type LogoGroup } from './understanding/logoClassify';
import { deriveQuestions, vocabularyFor, type OpenQuestion } from './understanding/questions';
import { findingsFrom, planStages, type Finding } from './understanding/stages';
import { ABOUT_ORDER, PATH_LABEL } from './understanding/proposals';
import { VOCABULARIES } from './vocabulary/vocabularies';
import type { AboutValue } from './review/AboutSection';
import { detectPlatform, type BrandLink } from './review/LinksSection';
import { suggestPalettesFor } from './data/suggestedPalettes';
import { suggestFontsFor } from './data/suggestedFonts';
import './onboarding.css';

/** Resolves a stored member id back to its label, or shows the user's wording. */
function labelOf(vocab: keyof typeof VOCABULARIES, id?: string): string | undefined {
  if (!id) return undefined;
  return VOCABULARIES[vocab].find((m) => m.id === id)?.label ?? id;
}

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
  const [understandingNow, setUnderstandingNow] = useState(false);
  const [canonical, setCanonical] = useState<CanonicalBrand | null>(null);
  const [result, setResult] = useState<Understanding | null>(null);
  const [findings, setFindings] = useState<Record<string, Finding | null>>({});
  // `busy` only disables the control on the NEXT render, so a same-tick double
  // click would still reach create. The ref is the synchronous gate.
  const gate = useRef(false);

  const brand = useMemo(() => brands.find((b) => b.slug === slug), [brands, slug]);
  const marker = brand ? readOnboardingState(brand) : null;
  const repo = useCallback(() => container.get<BrandRepository>(SERVICE_KEYS.BRAND_REPOSITORY), []);

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
    if (!slug) return 'setup';
    const asked = sp.get('step');
    // The brand is the authority; the URL is a hint.
    const recorded = marker?.step ?? 'setup';
    return asked === 'review' ? 'review' : recorded;
  }, [slug, sp, marker]);

  useEffect(() => {
    if (!slug || !marker) return;
    if (sp.get('step') !== step) {
      const next = new URLSearchParams(sp);
      next.set('step', step);
      setSp(next, { replace: true });
    }
  }, [slug, marker, step, sp, setSp]);

  /**
   * The marker as it is RIGHT NOW, not as it was when this render ran.
   *
   * Every marker write is read-modify-write, and `brand` is a render-time
   * snapshot. Using it meant a write could resurrect state a previous write had
   * just cleared — which is exactly what happened to the sentinels: the
   * understanding pass retired them, then the step change wrote them straight
   * back from its own stale copy, and the review rendered real colours and a
   * real typeface as undecided.
   */
  const liveMarker = useCallback(() => {
    if (!brand) return null;
    const current = useBrandStore.getState().list.find((b) => b.id === brand.id) ?? brand;
    return readOnboardingState(current);
  }, [brand]);

  const goStep = useCallback(
    async (next: OnboardingStep) => {
      if (!brand) return;
      await updateBrand(brand.id, { onboarding: atStep(liveMarker(), next) });
      const params = new URLSearchParams(sp);
      params.set('step', next);
      // A real history entry, so browser Back rolls through steps.
      navigate(`/onboard-brand/${brand.slug}?${params.toString()}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [brand, updateBrand, navigate, sp, liveMarker],
  );

  // ── Material → Library ──────────────────────────────────────────
  const sendToLibrary = useCallback(
    async (brandId: string, item: OnboardingAsset) => {
      try {
        const assets = container.get<IAssetsService>(SERVICE_KEYS.ASSETS);
        await assets.create({
          brandId,
          name: item.name,
          type: item.kind === 'image' ? 'image' : 'document',
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
    [],
  );

  // ── Screen 1 → create the brand, then understand ────────────────
  const onCreate = useCallback(
    async (values: { name: string; description: string; website: string }) => {
      if (gate.current) return;
      gate.current = true;
      setBusy(true);
      setError(null);
      try {
        const website = values.website.trim() ? normalizeUrl(values.website) : '';
        const created = await createBrand(
          buildCreateInput({ name: values.name, ...(website ? { website } : {}) }) as never,
        );
        // The brief rides on the marker rather than in `businessInfo.description`,
        // which belongs to products and services. Two writers on one field would
        // put the whole brief on screen as the product list.
        await updateBrand(created.id, {
          onboarding: withBrief(readOnboardingState(created), values.description),
        } as never);

        // Material was held while the brand did not exist yet — there was
        // nothing to attach it to. It goes to the Library now, before the
        // review, so what the review shows is what the Library holds.
        const held = useOnboardingStore.getState().items;
        for (const item of held) await sendToLibrary(created.id, item);

        const params = new URLSearchParams();
        params.set('step', 'review');
        if (then) params.set('then', then);
        navigate(`/onboard-brand/${created.slug}?${params.toString()}`, { replace: true });
        setUnderstandingNow(true);
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
    [createBrand, updateBrand, navigate, then, sendToLibrary],
  );

  /** The real understanding pass. The transition observes it; it observes nothing. */
  const runUnderstanding = useCallback(async () => {
    if (!brand) return;
    const s = useOnboardingStore.getState();
    const state = liveMarker();
    const items = s.items;

    const understanding = await interpret(
      {
        description: state?.brief,
        items,
        website: brand.publicUrl,
      },
      { groupFonts: groupFontFamilies },
    );
    setResult(understanding);
    s.setProposals(understanding.proposals);

    const report = await applyProposals(repo(), brand.id, understanding.proposals);
    const notSaved = await applyBusinessFacts(repo(), brand.id, understanding.business);

    // A real value retires its sentinel, permanently.
    //
    // The marker is re-read from the STORE rather than from `brand`, which is
    // a render-time snapshot: the profile step wrote the brief a moment ago and
    // `applyProposals` has just written through the repository, so the closure's
    // copy is a version behind. Clearing against it silently left both sentinels
    // in place, and the review then rendered real colours and a real typeface as
    // undecided.
    const retired = sentinelsRetiredBy(report);
    if (retired.length) {
      const next = clearPlaceholders(liveMarker(), retired);
      if (next) await updateBrand(brand.id, { onboarding: next });
    }
    if (report.failed.length || notSaved.length) {
      s.setProblem(
        `We couldn't save ${[
          report.failed.length ? `${report.failed.length} thing${report.failed.length === 1 ? '' : 's'} we found` : '',
          ...notSaved,
        ]
          .filter(Boolean)
          .join(' and ')}. Everything else is here.`,
      );
    }

    const logos = classifyLogos(items);
    setFindings(
      findingsFrom({
        logoGroups: logos.groups.length,
        logoVariants: logos.groups.reduce((n, g) => n + g.variants.length, 0),
        colors: items.filter((a) => a.kind === 'color').length,
        typeface: groupFontFamilies(items)[0]?.family,
        industryLabel: labelOf('industry', understanding.business.industry),
        fileCount: items.filter((a) => a.kind !== 'color').length,
      }),
    );
  }, [brand, repo, updateBrand, liveMarker]);

  // ── Resume: rebuild the review from the brand ───────────────────
  // Proposals are Core values below `confirmed`, so nothing needs restoring —
  // only reading. Without this, returning to review after a reload would look
  // like the flow had lost everything the user brought.
  const hydrated = useRef<string | null>(null);
  useEffect(() => {
    if (step !== 'review' || !brand || understandingNow) return;
    if (hydrated.current === brand.id) return;
    hydrated.current = brand.id;
    void (async () => {
      const c = await repo().getById(brand.id);
      if (!c) return;
      setCanonical(c);
      if (useOnboardingStore.getState().proposals.length === 0) {
        const { proposals, confirmed } = hydrateReview(c, placeholderPaths(brand));
        const s = useOnboardingStore.getState();
        s.setProposals(proposals);
        if (confirmed.size) s.markConfirmed([...confirmed]);
      }
    })();
  }, [step, brand, understandingNow, repo]);

  // ── Review actions ──────────────────────────────────────────────
  const humanActor = useMemo(
    () => ({ kind: 'human' as const, userId: userId ?? 'unattributed' }),
    [userId],
  );

  const refresh = useCallback(async () => {
    if (!brand) return;
    const c = await repo().getById(brand.id);
    if (c) setCanonical(c);
  }, [brand, repo]);

  const guard = useCallback(
    async (fn: () => Promise<void>, failure: string) => {
      setBusy(true);
      try {
        await fn();
        await refresh();
      } catch {
        useOnboardingStore.getState().setProblem(failure);
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const onAccept = useCallback(
    (path: CoreFieldPath) =>
      guard(async () => {
        if (!brand) return;
        await acceptProposal(repo(), brand.id, path, humanActor);
        useOnboardingStore.getState().markConfirmed([path]);
      }, "Couldn't confirm that just now. It's still saved."),
    [brand, guard, humanActor, repo],
  );

  const onAcceptSection = useCallback(
    (paths: CoreFieldPath[]) =>
      guard(async () => {
        if (!brand || !paths.length) return;
        // A LOOP over the per-value act — never a section-level authority.
        await acceptAll(repo(), brand.id, paths, humanActor);
        useOnboardingStore.getState().markConfirmed(paths);
      }, "Couldn't confirm all of those. Anything that didn't take is still saved."),
    [brand, guard, humanActor, repo],
  );

  const onEditValue = useCallback(
    (path: CoreFieldPath, value: unknown) =>
      guard(async () => {
        if (!brand) return;
        await editValue(repo(), brand.id, path, value as never, humanActor);
        useOnboardingStore.getState().markConfirmed([path]);
      }, "Couldn't save that edit. Your text is still here."),
    [brand, guard, humanActor, repo],
  );

  const onFinish = useCallback(async () => {
    if (!brand || gate.current) return;
    gate.current = true;
    setBusy(true);
    try {
      const report = await finishOnboarding({
        brand,
        ...(brand.publicUrl ? { businessInfo: { contact: { website: brand.publicUrl } } } : {}),
        updateBrand: async (id, patch) => {
          await updateBrand(id, patch);
        },
        context: container.get<IBrandContextService>(SERVICE_KEYS.BRAND_CONTEXT),
      });
      if (report.notSaved.length) {
        // Never a success screen for something we did not store.
        useOnboardingStore.getState().setProblem(`Couldn't save ${report.notSaved.join(' and ')}.`);
      }
      useOnboardingStore.getState().reset();
      navigate(destinationAfterFinish(brand.slug, then));
    } catch {
      useOnboardingStore.getState().setProblem("Couldn't finish just now. Nothing was lost — try again.");
      gate.current = false;
    } finally {
      setBusy(false);
    }
  }, [brand, updateBrand, navigate, then]);

  // ── Derived review model ────────────────────────────────────────
  const reviewModel = useMemo(() => {
    const identity = canonical?.identity;
    const business = canonical?.businessInfo ?? {};
    const items = store.items;
    const confirmed = store.confirmed;

    const logos = classifyLogos(items);
    const colorHexes: string[] = [];
    if (identity?.colors?.primary?.hex) colorHexes.push(identity.colors.primary.hex);
    if (identity?.colors?.secondary?.hex) colorHexes.push(identity.colors.secondary.hex);
    for (const n of identity?.colors?.neutrals ?? []) if (n?.hex) colorHexes.push(n.hex);
    const sentinels = placeholderPaths(brand);
    const swatches = sentinels.includes('colors.primary')
      ? []
      : colorHexes.map((hex, i) => ({ id: `${hex}-${i}`, hex, primary: i === 0 }));

    const fontRoles = [
      {
        role: 'Heading' as const,
        family: sentinels.includes('typography.primary') ? undefined : identity?.typography?.primary?.family,
        origin: 'from what you brought',
      },
      { role: 'Body' as const, family: identity?.typography?.secondary?.family, origin: 'no font found' },
    ];

    const values: AboutValue[] = [];
    for (const path of ABOUT_ORDER) {
      const label = PATH_LABEL[path];
      if (!label) continue;
      const vocabulary = vocabularyFor(path);
      const raw = readPath(identity, path);
      const decided = confirmed.has(path);
      if (vocabulary) {
        const selected = Array.isArray(raw) ? (raw as string[]) : raw ? [String(raw)] : [];
        // A chip row with nothing chosen is still worth showing — it is the
        // question and the answer in one control.
        values.push({ path, label, vocabulary, selected, origin: 'what you told us', decided });
      } else if (typeof raw === 'string' && raw.trim()) {
        values.push({ path, label, text: raw, origin: 'what you told us', decided });
      }
    }

    const answeredCore = new Set(values.filter((v) => (v.selected?.length ?? 0) > 0 || v.text).map((v) => v.path));
    const answeredBusiness = new Set(
      Object.entries({
        industry: business.industry,
        tagline: business.tagline,
        description: business.description,
        audienceSummary: business.audienceSummary,
      })
        .filter(([, v]) => Boolean(v))
        .map(([k]) => k),
    );
    const questions = deriveQuestions({ answeredCore, answeredBusiness });

    const links: BrandLink[] = [];
    if (business.contact?.website) {
      const d = detectPlatform(business.contact.website);
      links.push({ id: 'website', url: business.contact.website, ...d });
    }
    for (const l of business.links ?? []) {
      const d = detectPlatform(l.url);
      links.push({ id: l.url, url: l.url, ...d });
    }

    const placedIds = new Set(logos.groups.flatMap((g) => [g.lead.id, ...g.variants.map((v) => v.id)]));
    const library = items.filter(
      (a) => a.kind !== 'color' && a.kind !== 'font' && !placedIds.has(a.id),
    );

    return {
      logos,
      swatches,
      fontRoles,
      values,
      questions,
      links,
      library,
      styleLabels: (identity?.visualStyle?.descriptors ?? []).map(
        (d) => labelOf('style', d) ?? d,
      ),
      industryLabel: labelOf('industry', business.industry),
      slogan: business.tagline ?? '',
      products: business.description ?? '',
      freeSections: (identity?.strategy?.aboutSections ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        content: s.content,
      })),
    };
  }, [canonical, store.items, store.confirmed, brand]);

  /** What the suggesters rank against — the brand's own words, nothing else. */
  const brandText = useMemo(
    () => [brand?.name ?? '', liveMarker()?.brief ?? '', canonical?.businessInfo?.industry ?? ''].join('\n'),
    [brand?.name, canonical?.businessInfo?.industry, liveMarker],
  );

  const openPaths = useMemo(
    () => reviewModel.values.filter((v) => !v.decided).map((v) => v.path),
    [reviewModel.values],
  );

  // ── Render ──────────────────────────────────────────────────────
  if (understandingNow && brand) {
    const state = liveMarker();
    const stages = planStages({
      brandName: brand.name,
      hasText: Boolean(state?.brief),
      hasBrief: result?.usedBrief ?? false,
      website: brand.publicUrl,
      items: store.items,
      results: () => findings,
    });
    return (
      <div className="onb onb-page">
        <div className="onb-col onb-col--wide">
          <UnderstandingStage
            brandName={brand.name}
            stages={stages}
            work={runUnderstanding}
            onDone={() => {
              setUnderstandingNow(false);
              void goStep('review');
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="onb">
      {step === 'setup' && (
        <SetupStep
          busy={busy}
          error={error}
          onContinue={(v) => void onCreate(v)}
          onExit={() => navigate('/dashboard/brands')}
        />
      )}

      {step === 'review' && brand && (
        <div className="onb-page">
          <div className="onb-col onb-col--wide">
          <ReviewStep
            brandName={brand.name}
            slogan={reviewModel.slogan}
            industryLabel={reviewModel.industryLabel}
            styleLabels={reviewModel.styleLabels}
            logos={reviewModel.logos}
            swatches={reviewModel.swatches}
            colorsDecided={store.confirmed.has('colors.primary')}
            paletteSuggestions={
              result?.suggestions.palettes.length
                ? result.suggestions.palettes
                : suggestPalettesFor(brandText).map((p) => ({ name: p.name, hexes: p.colors }))
            }
            canExtract={store.items.some((a) => a.kind === 'image' && a.previewUrl)}
            fontRoles={reviewModel.fontRoles}
            fontsDecided={store.confirmed.has('typography.primary')}
            pairings={
              result?.suggestions.pairings.length
                ? result.suggestions.pairings
                : suggestFontsFor(brandText).map((p) => ({ heading: p.heading, body: p.body }))
            }
            links={reviewModel.links}
            about={{
              industry: { value: canonical?.businessInfo?.industry, vocabulary: VOCABULARIES.industry },
              products: reviewModel.products,
              values: reviewModel.values,
              freeSections: reviewModel.freeSections,
              questions: reviewModel.questions,
            }}
            libraryItems={reviewModel.library}
            busy={busy}
            problem={store.problem}
            onSlogan={(next) => void guard(async () => {
              if (brand) await updateBrand(brand.id, { businessInfo: { tagline: next } } as never);
            }, "Couldn't save the slogan.")}
            onPlaceLogo={(id, slot) => store.updateItem(id, { logoSlot: slot, isLogo: true })}
            onRemoveLogo={(id) => store.removeItem(id)}
            onUploadMore={() => void goStep('setup')}
            onColorsLooksRight={() => void onAcceptSection(['colors.primary', 'colors.secondary'])}
            onAddColor={() => void goStep('setup')}
            onExtractFromLogo={() => void guard(async () => {
              const img = store.items.find((a) => a.kind === 'image' && a.previewUrl);
              if (!img?.previewUrl || !brand) return;
              const hexes = await extractDominantColors(img.previewUrl, 5);
              if (hexes.length) {
                await onEditValue('colors.primary', { hex: hexes[0] });
              }
            }, "Couldn't read the colours from that logo.")}
            onExtractFromImage={() => void goStep('setup')}
            onSuggestPalettes={() => void goStep('setup')}
            onApplyPalette={(hexes) => void onEditValue('colors.primary', { hex: hexes[0] })}
            onRemoveColor={(id) => store.removeItem(id)}
            onFontsLooksRight={() => void onAcceptSection(['typography.primary', 'typography.secondary'])}
            onApplyPairing={(p) => void onEditValue('typography.primary', { family: p.heading })}
            onRenameFont={(role, next) =>
              void onEditValue(role === 'Heading' ? 'typography.primary' : 'typography.secondary', {
                family: next,
              })
            }
            onAddLink={(raw) => void guard(async () => {
              if (!brand) return;
              const url = normalizeUrl(raw);
              const existing = canonical?.businessInfo?.links ?? [];
              await updateBrand(brand.id, {
                businessInfo: { links: [...existing, { kind: 'other', url }] },
              } as never);
            }, "Couldn't add that link.")}
            onRemoveLink={(id) => void guard(async () => {
              if (!brand) return;
              const existing = canonical?.businessInfo?.links ?? [];
              await updateBrand(brand.id, {
                businessInfo: { links: existing.filter((l) => l.url !== id) },
              } as never);
            }, "Couldn't remove that link.")}
            onToggleChip={(path, memberId) => {
              const current = reviewModel.values.find((v) => v.path === path)?.selected ?? [];
              const single = path === 'voice.tone';
              const next = single
                ? current.includes(memberId) ? [] : [memberId]
                : current.includes(memberId)
                  ? current.filter((m) => m !== memberId)
                  : [...current, memberId];
              void onEditValue(path, single ? (next[0] ?? '') : next);
            }}
            onEditText={(path, next) => void onEditValue(path, next)}
            onIndustry={(memberId) => void guard(async () => {
              if (brand) await updateBrand(brand.id, { businessInfo: { industry: memberId } } as never);
            }, "Couldn't save the industry.")}
            onProducts={(next) => void guard(async () => {
              if (brand) await updateBrand(brand.id, { businessInfo: { description: next } } as never);
            }, "Couldn't save that.")}
            onAboutLooksRight={() => void onAcceptSection(openPaths)}
            onAnswer={(q: OpenQuestion, answer) => {
              if (q.target.concept === 'core') {
                const single = q.target.path === 'voice.tone';
                void onEditValue(q.target.path, q.vocabulary && !single ? [answer] : answer);
              } else if (brand) {
                void guard(async () => {
                  await updateBrand(brand.id, {
                    businessInfo: { [q.target.path]: answer },
                  } as never);
                }, "Couldn't save that.");
              }
            }}
            onAddSection={() => void goStep('setup')}
            onEditSection={() => void goStep('setup')}
            onRenameAsset={(id, next) => store.updateItem(id, { name: next })}
            onRemoveAsset={(id) => store.removeItem(id)}
            onDismissProblem={() => store.setProblem(null)}
            onFinish={() => void onFinish()}
            onBack={() => navigate(-1)}
          />
          </div>
        </div>
      )}
    </div>
  );
}

/** Walks a dotted Core path. Local so the shell needs no domain import. */
function readPath(identity: unknown, path: string): unknown {
  let cursor: unknown = identity;
  for (const seg of path.split('.')) {
    if (cursor === null || typeof cursor !== 'object') return undefined;
    cursor = (cursor as Record<string, unknown>)[seg];
  }
  return cursor;
}

export type { LogoGroup };
