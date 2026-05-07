import { useEffect, useMemo, useRef, useState } from 'react';
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
import { initialPalettes } from '../data/seedPalettes';
import { compressLogo } from '@/shared/utils/imageUpload';
import type { LogoSlot, OnboardingAsset } from '../types';
import type { Asset, BrandLogoAssets } from '@/shared/types/brand';
import { parseDescriptionToSections } from '../services/parseDescription';

const PANEL_META: Record<1 | 2, { caption: string; label: string }> = {
  1: { caption: 'Uploaded everything?', label: 'Continue' },
  2: { caption: 'Ready to roll?', label: 'Set up' },
};

export function SetUpScreen() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const then = sp.get('then');
  const define = useV4Store((s) => s.define);
  const assets = useV4Store((s) => s.assets);
  const setupPanel = useV4Store((s) => s.setupPanel);
  const setSetupPanel = useV4Store((s) => s.setSetupPanel);
  const aboutSections = useV4Store((s) => s.aboutSections);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (setupPanel !== 1) setSetupPanel(1);
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const target = (e.state && (e.state as { setupPanel?: 1 | 2 | 3 }).setupPanel) ?? 1;
      setSetupPanel(target);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [setSetupPanel]);

  const hasUploadInFlight = assets.some((a) => a.uploadStatus === 'uploading');

  const canAdvance = useMemo(() => {
    if (setupPanel === 1) return define.name.trim().length > 0 && !hasUploadInFlight;
    if (setupPanel === 2) return !hasUploadInFlight;
    return true;
  }, [setupPanel, define.name, hasUploadInFlight]);

  // When the user advances from the Define step to the review with a non-empty
  // brand description, fan it out into structured About sections in the
  // background so the review already has Mission/Audience/Voice/etc. populated
  // by the time the user scrolls to that group. Idempotent — we only parse
  // when the description has changed since the last successful parse and
  // never overwrite sections the user already created or edited.
  const lastParsedDescRef = useRef<string>('');
  const parseAndDistributeDescription = async (description: string) => {
    const text = description.trim();
    if (!text || text === lastParsedDescRef.current) return;
    lastParsedDescRef.current = text;
    try {
      const sections = await parseDescriptionToSections(text);
      if (sections.length === 0) return;
      const store = useV4Store.getState();
      const existing = store.aboutSections;
      const taken = new Set(existing.map((s) => s.name.trim().toLowerCase()));
      // Skip sections the user already wrote — preserve their edits as the
      // source of truth and only fill in the gaps we inferred from the
      // description.
      for (const s of sections) {
        if (taken.has(s.title.toLowerCase())) continue;
        store.addAboutSection({ name: s.title, content: s.content });
        taken.add(s.title.toLowerCase());
      }
    } catch (err) {
      console.warn('[onboarding-v4] description distribute failed:', err);
    }
  };

  const goNext = () => {
    if (setupPanel < 2) {
      const next = (setupPanel + 1) as 2;
      // Kick off the parse before navigating — runs in the background while
      // the user lands on the review, so sections appear shortly after.
      void parseAndDistributeDescription(define.description);
      window.history.pushState({ setupPanel: next }, '', window.location.pathname + window.location.search);
      setSetupPanel(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      submit();
    }
  };

  const goBack = () => {
    if (setupPanel > 1) {
      // Defer to popstate handler — keeps URL/history consistent so the
      // browser Back button rolls through panels too.
      window.history.back();
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const palette = initialPalettes()[0];
      const findSection = (name: string) =>
        aboutSections.find((s) => s.name.toLowerCase() === name.toLowerCase())?.content.trim() || '';
      const audience = findSection('audience') || define.description.trim();

      const guidelines = {
        strategy: {
          mission: findSection('mission'),
          values: findSection('values') ? [findSection('values')] : [],
          personality: findSection('voice') ? [findSection('voice')] : [],
          positioning: findSection('positioning'),
          targetAudience: audience,
        },
        voiceAndTone: {
          voice: findSection('voice'),
          toneAttributes: findSection('voice') ? [findSection('voice')] : [],
        },
      };

      // ── Colors ────────────────────────────────────────────────────
      // Order: 1st → primary, 2nd → secondary, 3rd → accent, rest → neutrals.
      // Fall back to the seed palette when the user didn't pick anything.
      const colorAssets = assets.filter((a) => a.kind === 'color' && a.value);
      const colorHexes = colorAssets.map((a) => (a.value ?? '').toUpperCase()).filter(Boolean);
      const primaryColor = colorHexes[0] ?? palette.colors[1];
      const secondaryColor = colorHexes[1] ?? palette.colors[2];
      const accentColor = colorHexes[2];
      const neutrals = colorHexes.slice(3);

      // ── Fonts ─────────────────────────────────────────────────────
      const fontAssets = assets.filter((a) => a.kind === 'font' && a.name.trim());
      const primaryFont = fontAssets[0]?.name.trim() || 'Inter';
      const secondaryFont = fontAssets[1]?.name.trim() || primaryFont;

      // ── Logos ─────────────────────────────────────────────────────
      // Compress to data URLs so the brand survives a localStorage refresh
      // (blob URLs would expire the moment the page reloads). Keep the
      // dimensions modest — these are setup-page thumbnails, not full
      // assets — so the resulting JSON stays under localStorage quota
      // even when the user has 4-5 logo slots filled in.
      const logoAssets = assets.filter(
        (a): a is OnboardingAsset & { logoSlot: LogoSlot } =>
          a.kind === 'image' && !!a.isLogo && !!a.logoSlot,
      );
      // `compressLogo` targets ~150KB / 500px — the right size for the
      // small thumbnails Setup renders. Anything larger inflates the
      // brand JSON enough to blow past localStorage quota when 3-4
      // slots are filled in. Parallelize so 4 logos finish in roughly
      // the time of one — submit feels instant rather than ~2s.
      const logoEntries = await Promise.all(
        logoAssets.map(async (a) => {
          try {
            const url = a._file ? await compressLogo(a._file) : a.previewUrl ?? null;
            return [a.logoSlot, url] as const;
          } catch (err) {
            console.warn('[onboarding-v4] logo compression failed for', a.name, err);
            return [a.logoSlot, a.previewUrl ?? null] as const;
          }
        }),
      );
      const logoUrlBySlot: Partial<Record<LogoSlot, string>> = {};
      for (const [slot, url] of logoEntries) {
        if (url) logoUrlBySlot[slot] = url;
      }
      // Onboarding slots → legacy `BrandLogoAssets` mapping. The naming is
      // mirrored: the "On dark" slot holds the LIGHT-colored variant.
      const logoFull = logoUrlBySlot.primary;
      const brandLogoAssets: BrandLogoAssets = {};
      if (logoFull) brandLogoAssets.full = logoFull;
      if (logoUrlBySlot.mark) brandLogoAssets.icon = logoUrlBySlot.mark;
      if (logoUrlBySlot.wordmark) brandLogoAssets.wordmark = logoUrlBySlot.wordmark;
      if (logoUrlBySlot.dark) brandLogoAssets.light = logoUrlBySlot.dark;
      if (logoUrlBySlot.light) brandLogoAssets.dark = logoUrlBySlot.light;
      if (logoUrlBySlot.horizontal || logoUrlBySlot.vertical) {
        brandLogoAssets.alternate = logoUrlBySlot.horizontal ?? logoUrlBySlot.vertical;
      }

      // ── Links → brand assets[] ────────────────────────────────────
      const linkAssets = assets.filter((a) => a.kind === 'link' && a.sourceUrl);
      const brandAssets: Asset[] = linkAssets.map((a) => ({
        id: a.id,
        name: a.name,
        type: 'reference' as const,
        category: 'reference' as const,
        source: 'url' as const,
        url: a.sourceUrl ?? '',
        size: 0,
        tags: a.socialPlatform ? [a.socialPlatform] : [],
        metadata: { embedUrl: a.sourceUrl },
        createdAt: new Date(),
      }));

      // Single write: bundle everything (incl. fields beyond CreateBrandInput)
      // into one create() call. The local service spreads the whole input
      // object onto the new brand, so `logoAssets`/`accentColor`/`neutrals`/
      // `assets` go through the same localStorage write and we don't
      // double-pay quota with a follow-up update().
      const fullInput: Record<string, unknown> = {
        name: define.name.trim(),
        primaryColor,
        secondaryColor,
        fonts: { primary: primaryFont, secondary: secondaryFont },
        tone: findSection('voice') || 'Neutral',
        audience,
        guidelines,
      };
      if (logoFull) fullInput.logo = logoFull;
      if (Object.keys(brandLogoAssets).length > 0) fullInput.logoAssets = brandLogoAssets;
      if (accentColor) fullInput.accentColor = accentColor;
      if (neutrals.length > 0) fullInput.neutrals = neutrals;
      if (brandAssets.length > 0) fullInput.assets = brandAssets;

      // First try with everything; if anything fails (quota, serialization,
      // anything else), strip the heaviest fields and retry. The brand
      // record is what really matters — the user can always re-upload
      // logos from the Setup page, but we want to NOT block them on the
      // onboarding screen.
      //
      // Every tier collects the actual error so if all three fail we can
      // surface the full diagnostic in the user-facing toast (not just
      // "Failed to create brand").
      const isDuplicateSlugError = (e: unknown): boolean => {
        if (!e || typeof e !== 'object') return false;
        const o = e as Record<string, unknown>;
        if (String(o.code) === '23505') return true;
        const msg = String((o as { message?: unknown }).message ?? '');
        if (/duplicate key|unique constraint|brands_slug/i.test(msg)) return true;
        return false;
      };
      // The Supabase brands table has a `BEFORE INSERT` trigger
      // (`set_brand_slug`) that always regenerates `slug` from `name` on
      // insert, ignoring whatever slug we send. The slug-generator runs
      // under the caller's RLS so it can't see brands owned by other
      // users — it returns a "unique" slug that actually collides at the
      // global unique constraint (`brands_slug_unique`). The only way to
      // get a different slug out of the trigger is to send a different
      // name. We retry with " 2", " 3"… appended until INSERT succeeds.
      const tryCreate = async (input: Record<string, unknown>) => {
        const baseName = String(input.name ?? '').trim() || 'Brand';
        let attemptInput = input;
        for (let attempt = 0; attempt < 6; attempt++) {
          try {
            return await useBrandStore.getState().create(attemptInput as never);
          } catch (err) {
            if (!isDuplicateSlugError(err) || attempt === 5) throw err;
            // Increment a numeric suffix on the NAME so the trigger
            // produces a fresh slug (e.g., "Kaafex" → "Kaafex 2" →
            // slug "kaafex_2"). This is the only knob the user-facing
            // record exposes that the DB-side trigger respects.
            const nextName = `${baseName} ${attempt + 2}`;
            attemptInput = { ...input, name: nextName };
          }
        }
        // Loop exit without return only happens if attempt 5 also fails,
        // and we already re-threw above. TS just doesn't see that.
        throw new Error('Slug retry exhausted');
      };
      const sizeOf = (input: Record<string, unknown>) => {
        try {
          return `${(JSON.stringify(input).length / 1024).toFixed(1)} KB`;
        } catch {
          return 'unknown';
        }
      };
      const failures: Array<{ tier: string; size: string; err: unknown }> = [];
      let brand;
      try {
        brand = await tryCreate(fullInput);
      } catch (err) {
        failures.push({ tier: 'full', size: sizeOf(fullInput), err });
        console.warn('[onboarding-v4] full create failed, retrying slim:', err);
        const slim = { ...fullInput };
        delete slim.logo;
        delete slim.logoAssets;
        delete slim.assets;
        delete slim.neutrals;
        try {
          brand = await tryCreate(slim);
          toast.warning('Some uploads were too large to save', {
            description: 'Brand created — re-add logos and extras from the setup page.',
          });
        } catch (err2) {
          failures.push({ tier: 'slim', size: sizeOf(slim), err: err2 });
          console.error('[onboarding-v4] slim create also failed:', err2);
          // Last-ditch attempt: bare minimum CreateBrandInput. If this
          // still fails the user has no headroom in localStorage at all.
          const minimal = {
            name: define.name.trim(),
            primaryColor,
            secondaryColor,
            fonts: { primary: primaryFont, secondary: secondaryFont },
            tone: 'Neutral',
            audience,
          };
          try {
            brand = await tryCreate(minimal);
            toast.warning('Brand storage is nearly full', {
              description: 'Brand created with basics only. Free up space and re-add details.',
            });
          } catch (err3) {
            failures.push({ tier: 'minimal', size: sizeOf(minimal), err: err3 });
            // Re-throw with all the failure context attached so the outer
            // catch can render every tier's actual error in the toast.
            const combined = new Error('Brand create failed at every retry tier');
            (combined as Error & { failures?: typeof failures }).failures = failures;
            throw combined;
          }
        }
      }

      // Supabase's brands.create only persists a small subset of
      // CreateBrandInput (name, primary/secondary color, fonts, tone,
      // audience, slug, guidelines). Anything else — `logoAssets`,
      // `accentColor`, `neutrals`, link `assets` — gets silently
      // dropped. Push those through update() now that we have the
      // brand id. If the update fails we keep the user on the success
      // path; the brand record exists, we just toast a warning.
      const followUpPatch: Record<string, unknown> = {};
      if (Object.keys(brandLogoAssets).length > 0) followUpPatch.logoAssets = brandLogoAssets;
      if (accentColor) followUpPatch.accentColor = accentColor;
      if (neutrals.length > 0) followUpPatch.neutrals = neutrals;
      if (brandAssets.length > 0) followUpPatch.assets = brandAssets;
      if (Object.keys(followUpPatch).length > 0) {
        try {
          await useBrandStore.getState().update(brand.id, followUpPatch as never);
        } catch (err) {
          console.warn('[onboarding-v4] post-create update failed:', err);
          toast.warning('Some details didn\'t save', {
            description: 'Logos / extras may need to be re-added from the setup page.',
          });
        }
      }

      toast.success('Brand created!');
      useV4Store.getState().reset();
      navigate(then ?? `/b/${brand.slug}/setup`);
    } catch (err) {
      // Surface every detail we have. The user asked to see the real reason
      // — even if it's long — instead of a generic "Failed to create brand".
      console.error('[onboarding-v4] submit failed:', err);

      // Drill into any object shape — Error instances, Supabase PostgrestError
      // ({ message, details, hint, code }), or arbitrary plain objects — and
      // pull whatever string fields exist instead of falling back to
      // "[object Object]".
      const describe = (e: unknown): string => {
        if (e == null) return 'Unknown error';
        if (typeof e === 'string') return e;
        if (e instanceof Error) {
          return e.message || e.name || 'Error';
        }
        if (typeof e === 'object') {
          const o = e as Record<string, unknown>;
          const parts: string[] = [];
          if (typeof o.message === 'string' && o.message) parts.push(o.message);
          if (typeof o.code === 'string' || typeof o.code === 'number') parts.push(`code=${o.code}`);
          if (typeof o.details === 'string' && o.details) parts.push(o.details);
          if (typeof o.hint === 'string' && o.hint) parts.push(`hint: ${o.hint}`);
          if (parts.length === 0) {
            try {
              return JSON.stringify(o);
            } catch {
              return String(e);
            }
          }
          return parts.join(' · ');
        }
        return String(e);
      };

      const tiered = (err as { failures?: Array<{ tier: string; size: string; err: unknown }> }).failures;
      const lines: string[] = [];
      if (tiered && tiered.length > 0) {
        for (const f of tiered) {
          lines.push(`• ${f.tier} (${f.size}) → ${describe(f.err)}`);
        }
      } else {
        lines.push(describe(err));
        if (err instanceof Error && err.stack) {
          const firstFrame = err.stack.split('\n')[1]?.trim();
          if (firstFrame) lines.push(firstFrame);
        }
      }

      // Show storage usage so quota issues are obvious at a glance.
      try {
        let totalBytes = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) totalBytes += (localStorage.getItem(k)?.length ?? 0);
        }
        const totalKB = (totalBytes / 1024).toFixed(0);
        lines.push(`localStorage: ~${totalKB} KB used (limit ≈ 5120 KB)`);
      } catch {
        /* ignore */
      }

      toast.error('Could not create brand', {
        // ReactNode + pre-wrap so each "•" line shows on its own row
        // instead of sonner collapsing the whitespace.
        description: (
          <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11, lineHeight: 1.5 }}>
            {lines.join('\n')}
          </div>
        ),
        duration: 30000,
        closeButton: true,
      });
      setBusy(false);
    }
  };

  const createHref = then ? `/onboarding-v4/create?then=${encodeURIComponent(then)}` : '/onboarding-v4/create';
  const meta = PANEL_META[setupPanel];

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
        {setupPanel === 2 && <UploadsReviewPanel key="uploads" />}

        <FooterCTA
          caption={meta.caption}
          label={busy ? 'Setting up…' : meta.label}
          onClick={goNext}
          disabled={!canAdvance || busy}
          onBack={setupPanel > 1 ? goBack : undefined}
          backDisabled={busy}
        />
      </div>
    </CosmosShell>
  );
}
