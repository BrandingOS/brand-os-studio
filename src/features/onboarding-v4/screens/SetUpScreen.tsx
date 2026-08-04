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
import { compressAsset, compressLogo } from '@/shared/utils/imageUpload';
import type { LogoSlot, OnboardingAsset } from '../types';
import type { Asset, BrandLogoAssets } from '@/shared/types/brand';
import { parseDescriptionToSections } from '../services/parseDescription';
import { type FontFamilyGroup, groupFontAssets } from '../utils/fontFamily';
import {
  describeStorageUsage,
  freeDisposableStorage,
  isStorageFullError,
  storageAdvice,
} from '@/shared/utils/storageCleanup';

const PANEL_META: Record<1 | 2, { caption?: string; label: string }> = {
  1: { label: 'Continue' },
  2: { label: 'Set up' },
};

export function SetUpScreen() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const then = sp.get('then');
  const define = useV4Store((s) => s.define);
  const assets = useV4Store((s) => s.assets);
  const setupPanel = useV4Store((s) => s.setupPanel);
  const setSetupPanel = useV4Store((s) => s.setSetupPanel);
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
  const parsePromiseRef = useRef<Promise<void> | null>(null);
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
      // Keep the promise so submit() can await it — a fast "Set up" click
      // must not race the parse and create the brand with no sections.
      parsePromiseRef.current = parseAndDistributeDescription(define.description);
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
      // The description parse runs in the background from the moment the
      // user leaves the Define step — make sure it landed before we read
      // the sections, otherwise a quick "Set up" click creates the brand
      // with an empty strategy.
      if (parsePromiseRef.current) {
        await parsePromiseRef.current.catch(() => {});
      }
      const sections = useV4Store.getState().aboutSections;

      const palette = initialPalettes()[0];
      const findSection = (name: string) =>
        sections.find((s) => s.name.toLowerCase() === name.toLowerCase())?.content.trim() || '';
      // NOTE: no raw-description fallback here — dumping the whole markdown
      // blob into `audience` is what used to fill the Setup About card with
      // "# Brand Strategy Blueprint --- # 1. ...".
      const audience = findSection('audience');

      const hexToRgbString = (hex: string): string => {
        const m = hex.replace('#', '').match(/^([0-9a-fA-F]{6})$/);
        if (!m) return '';
        const n = parseInt(m[1], 16);
        return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
      };

      // Colors are mirrored into `guidelines.colorPalette` (a JSONB column
      // that exists) because Supabase's brands table has NO accent_color /
      // neutrals columns — without this the accent and every extra swatch
      // the user picked are dropped on save. `migrateBrandToCurrent` reads
      // this back into `colorSystem`.
      const colorDef = (hex: string, usage: string) => ({
        hex,
        rgb: hexToRgbString(hex),
        cmyk: '',
        name: hex.toUpperCase(),
        usage,
      });

      const guidelines: Record<string, unknown> = {
        strategy: {
          mission: findSection('mission'),
          vision: findSection('vision'),
          values: findSection('values') ? [findSection('values')] : [],
          personality: findSection('voice') ? [findSection('voice')] : [],
          positioning: findSection('positioning'),
          targetAudience: audience,
        },
        voiceAndTone: {
          voice: findSection('voice'),
          toneAttributes: findSection('voice') ? [findSection('voice')] : [],
        },
        // Preserve EVERYTHING the user wrote/parsed — including custom
        // headings the canonical strategy fields can't hold. Setup's
        // About group renders from this list.
        aboutSections: sections
          .filter((s) => s.content.trim())
          .map((s) => ({ id: s.id, title: s.name, content: s.content.trim() })),
      };

      // ── Colors ────────────────────────────────────────────────────
      // Order: 1st → primary, 2nd → secondary, 3rd → accent, rest → neutrals.
      // Fall back to the seed palette when the user didn't pick anything.
      const colorAssets = assets.filter((a) => a.kind === 'color' && a.value);
      // A swatch the user tagged "Primary" in the review step jumps to the
      // front so it becomes the brand's primary color.
      const taggedPrimaryId = useV4Store.getState().primaryColorId;
      const orderedColorAssets = taggedPrimaryId
        ? [
            ...colorAssets.filter((a) => a.id === taggedPrimaryId),
            ...colorAssets.filter((a) => a.id !== taggedPrimaryId),
          ]
        : colorAssets;
      const colorHexes = orderedColorAssets.map((a) => (a.value ?? '').toUpperCase()).filter(Boolean);
      const primaryColor = colorHexes[0] ?? palette.colors[1];
      const secondaryColor = colorHexes[1] ?? palette.colors[2];
      // No auto-accent: an uploaded palette is just the brand's colors, and
      // guessing that the 3rd swatch is "the accent" dropped a lone color
      // into that section on its own. Accent stays empty until the user
      // deliberately moves a color there.
      const extraColors = colorHexes.slice(2);

      // Mirror the palette into guidelines so every swatch survives on
      // Supabase, where there are no accent_color / neutrals columns.
      guidelines.colorPalette = {
        primary: colorDef(primaryColor, 'Primary brand color'),
        ...(secondaryColor ? { secondary: colorDef(secondaryColor, 'Secondary') } : {}),
        neutral: extraColors.map((hex) => colorDef(hex, 'Brand color')),
      };

      // ── Fonts ─────────────────────────────────────────────────────
      // Group by family first: uploading Bold + Light + Regular of one font
      // is ONE typeface, so the secondary must come from a different family,
      // and the stored name is the family — not "Acme-Bold.ttf".
      const fontAssets = assets.filter((a) => a.kind === 'font' && a.name.trim());
      const fontFamilies = groupFontAssets(fontAssets);
      const primaryFont = fontFamilies[0]?.family.trim() || 'Inter';
      const secondaryFont = fontFamilies[1]?.family.trim() || primaryFont;

      // ── Logos ─────────────────────────────────────────────────────
      // Compress to data URLs so the brand survives a localStorage refresh
      // (blob URLs would expire the moment the page reloads). Keep the
      // dimensions modest — these are setup-page thumbnails, not full
      // assets — so the resulting JSON stays under localStorage quota
      // even when the user has 4-5 logo slots filled in.
      // Sitting in a logo slot IS the definition of a logo here — that's what
      // the user sees and arranges on the review screen. Requiring `isLogo`
      // as well meant any later reclassification (see brandVision.ts) could
      // silently drop an artwork the user had already placed.
      const logoAssets = assets.filter(
        (a): a is OnboardingAsset & { logoSlot: LogoSlot } =>
          a.kind === 'image' && !!a.logoSlot,
      );
      // `compressLogo` targets ~150KB / 500px — the right size for the
      // small thumbnails Setup renders. Anything larger inflates the
      // brand JSON enough to blow past localStorage quota when 3-4
      // slots are filled in. Parallelize so 4 logos finish in roughly
      // the time of one — submit feels instant rather than ~2s.
      // A `blob:` URL dies with the page, so it must never be what we store.
      // If compression fails we read the original bytes instead — a heavier
      // brand beats a brand whose logo is a dead link.
      const fileToDataUrl = (file: File) =>
        new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        });
      const usableUrl = (url: string | null | undefined) =>
        url && !url.startsWith('blob:') ? url : null;

      const logoEntries = await Promise.all(
        logoAssets.map(async (a) => {
          try {
            // Deliberately leaner than the default: Setup shows these as
            // small tiles, and a brand can hold 5-6 slots. At the default
            // 500px/150KB one brand could claim ~1 MB of the ~5 MB
            // localStorage budget — a few brands and nothing saves at all.
            const compressed = a._file
              ? await compressLogo(a._file, { maxDimension: 380, quality: 0.75, maxSizeKB: 60 })
              : null;
            const url = usableUrl(compressed) ?? usableUrl(a.previewUrl)
              ?? (a._file ? await fileToDataUrl(a._file) : null);
            return [a.logoSlot, url] as const;
          } catch (err) {
            console.warn('[onboarding-v4] logo compression failed for', a.name, err);
            const fallback = usableUrl(a.previewUrl) ?? (a._file ? await fileToDataUrl(a._file) : null);
            return [a.logoSlot, fallback] as const;
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
      // The brand's website — first link the review classified as one.
      // Setup's Website section reads `brand.publicUrl`.
      const websiteUrl = linkAssets.find((a) => a.socialPlatform === 'website')?.sourceUrl;

      // ── Photos (non-logo images) → brand assets[] ─────────────────
      // Anything the user uploaded that ISN'T sitting in a logo slot is a
      // brand image — Setup's Photography section reads these. Compressed
      // like other assets so a handful of photos doesn't blow the quota.
      const photoUploads = assets.filter(
        (a) => a.kind === 'image' && !a.logoSlot && !a.generated && a._file,
      );
      const photoEntries = await Promise.all(
        photoUploads.map(async (a) => {
          try {
            const url = await compressAsset(a._file as File);
            if (!url || url.startsWith('blob:')) return null;
            return {
              id: a.id,
              name: a.name,
              type: 'image' as const,
              category: 'photo' as const,
              source: 'upload' as const,
              url,
              size: (a._file as File).size,
              tags: [],
              metadata: { originalName: a.name },
              createdAt: new Date(),
            } satisfies Asset;
          } catch (err) {
            console.warn('[onboarding-v4] photo compression failed for', a.name, err);
            return null;
          }
        }),
      );
      brandAssets.push(...photoEntries.filter((p): p is Asset => p !== null));

      // ── Documents (PDF / design files) → brand assets[] ───────────
      // Small ones travel as data URLs so they survive; oversized ones are
      // skipped (storing a 5 MB PDF in localStorage would sink the brand).
      const DOC_LIMIT = 400 * 1024;
      const docUploads = assets.filter(
        (a) => ['pdf', 'zip', 'design', 'file'].includes(a.kind) && a._file,
      );
      const skippedDocs: string[] = [];
      for (const a of docUploads) {
        const f = a._file as File;
        if (f.size > DOC_LIMIT) {
          skippedDocs.push(a.name);
          continue;
        }
        const url = await fileToDataUrl(f);
        if (!url) continue;
        brandAssets.push({
          id: a.id,
          name: a.name,
          type: 'document' as const,
          category: 'reference' as const,
          source: 'upload' as const,
          url,
          size: f.size,
          tags: [],
          metadata: { originalName: a.name },
          createdAt: new Date(),
        });
      }

      // ── Font files → typography ───────────────────────────────────
      // The family NAMES are already on `fonts`; this carries the uploaded
      // bytes too, so Setup's Typography section shows the real weights and
      // the font downloads return the exact files the user dropped.
      const FONT_FILE_LIMIT = 400 * 1024;
      let fontBudget = 1.2 * 1024 * 1024;
      const skippedFonts: string[] = [];
      const FONT_FORMATS = ['ttf', 'otf', 'woff', 'woff2', 'eot'] as const;
      const familyToken = async (fam: FontFamilyGroup | undefined) => {
        if (!fam) return null;
        const files: Array<{
          name: string;
          weight: string;
          format: (typeof FONT_FORMATS)[number];
          dataUrl: string;
          size: number;
        }> = [];
        for (let i = 0; i < fam.assets.length; i++) {
          const a = fam.assets[i];
          const f = a._file;
          if (!f) continue; // Google pick — family name is enough
          const ext = (a.name.match(/\.([a-z0-9]+)$/i)?.[1] ?? '').toLowerCase();
          if (!(FONT_FORMATS as readonly string[]).includes(ext)) continue;
          if (f.size > FONT_FILE_LIMIT || f.size > fontBudget) {
            skippedFonts.push(a.name);
            continue;
          }
          const dataUrl = await fileToDataUrl(f);
          if (!dataUrl) continue;
          fontBudget -= f.size;
          files.push({
            name: a.name,
            weight: fam.weights[i]?.weight || 'Regular',
            format: ext as (typeof FONT_FORMATS)[number],
            dataUrl,
            size: f.size,
          });
        }
        return {
          family: fam.family,
          weights: fam.weights.map((w) => w.weight || 'Regular'),
          ...(files.length > 0 ? { files } : {}),
        };
      };
      const typographyPrimary = await familyToken(fontFamilies[0]);
      const typographySecondary = await familyToken(fontFamilies[1]);
      const typography = typographyPrimary
        ? { primary: typographyPrimary, ...(typographySecondary ? { secondary: typographySecondary } : {}) }
        : null;

      // The brand is written in layers (core create → per-slice updates)
      // just below; every layer records its own error so a failure can be
      // reported precisely instead of as "Failed to create brand".
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
      let freedOnce = false;
      const tryCreate = async (input: Record<string, unknown>) => {
        const baseName = String(input.name ?? '').trim() || 'Brand';
        let attemptInput = input;
        for (let attempt = 0; attempt < 6; attempt++) {
          try {
            return await useBrandStore.getState().create(attemptInput as never);
          } catch (err) {
            // Browser storage full: reclaim the disposable half (caches,
            // drafts, tutorial flags) and try once more before giving up.
            if (isStorageFullError(err) && !freedOnce) {
              freedOnce = true;
              const freedKB = freeDisposableStorage();
              console.warn(`[onboarding-v4] storage full — freed ${freedKB} KB of caches, retrying`);
              continue;
            }
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
      // Persist in layers instead of the old all-or-nothing tiers. The old
      // code retried the WHOLE payload without logos, then without
      // guidelines — so one oversized logo (or one column the DB doesn't
      // have) silently threw away the user's About sections and logos
      // together. Now the identity core lands first, then each heavy slice
      // is applied on its own: a failure costs only that slice, and the
      // warning names exactly what didn't save.
      // Everything the Setup page needs travels with the CREATE call —
      // logos included. Relying on a follow-up update() for the logo is what
      // made brands land with no artwork whenever that second write failed
      // (RLS, quota, anything): the brand existed, the logo didn't.
      const coreInput: Record<string, unknown> = {
        name: define.name.trim(),
        primaryColor,
        secondaryColor,
        fonts: { primary: primaryFont, secondary: secondaryFont },
        tone: findSection('voice') || 'Neutral',
        audience,
        guidelines,
      };
      if (logoFull) coreInput.logo = logoFull;
      if (Object.keys(brandLogoAssets).length > 0) coreInput.logoAssets = brandLogoAssets;

      let brand;
      // Fields the create couldn't take, to re-apply via update() afterwards.
      let pending: Record<string, unknown> = {};
      try {
        brand = await tryCreate(coreInput);
      } catch (err) {
        failures.push({ tier: 'core', size: sizeOf(coreInput), err });
        console.warn('[onboarding-v4] create with full payload failed, retrying lean:', err);
        // Drop the rich fields (they're the only ones a backend can choke
        // on) and re-apply them right after, so a rejected logo can't cost
        // the user their About sections and vice-versa.
        const lean = { ...coreInput };
        pending = {
          ...(lean.guidelines ? { guidelines: lean.guidelines } : {}),
          ...(lean.logo ? { logo: lean.logo } : {}),
          ...(lean.logoAssets ? { logoAssets: lean.logoAssets } : {}),
        };
        delete lean.guidelines;
        delete lean.logo;
        delete lean.logoAssets;
        try {
          brand = await tryCreate(lean);
        } catch (err2) {
          failures.push({ tier: 'lean', size: sizeOf(lean), err: err2 });
          const combined = new Error('Brand create failed');
          (combined as Error & { failures?: typeof failures }).failures = failures;
          throw combined;
        }
      }

      // ── Enrichment: each slice applied independently ───────────────
      const missing: string[] = [];
      const applyPatch = async (label: string, patch: Record<string, unknown>) => {
        if (Object.keys(patch).length === 0) return;
        try {
          await useBrandStore.getState().update(brand.id, patch as never);
        } catch (err) {
          console.warn(`[onboarding-v4] could not save ${label}:`, err);
          missing.push(label);
        }
      };

      // Anything the create couldn't take, applied one slice at a time so a
      // single rejection costs only that slice.
      if (pending.guidelines) await applyPatch('about & strategy', { guidelines: pending.guidelines });
      if (pending.logo || pending.logoAssets) {
        await applyPatch('logos', {
          ...(pending.logo ? { logo: pending.logo } : {}),
          ...(pending.logoAssets ? { logoAssets: pending.logoAssets } : {}),
        });
      }
      // Extra swatches also ride along inside guidelines.colorPalette, so a
      // failure here is cosmetic — the colors still reach the Setup page.
      await applyPatch('extra colors', {
        ...(extraColors.length > 0 ? { neutrals: extraColors } : {}),
      });
      await applyPatch('links & photos', brandAssets.length > 0 ? { assets: brandAssets } : {});
      await applyPatch('font files', typography ? { typography } : {});
      await applyPatch('website', websiteUrl ? { publicUrl: websiteUrl } : {});

      if (missing.length > 0) {
        toast.warning(`Couldn't save: ${missing.join(', ')}`, {
          description: 'Everything else was saved — you can re-add these from the setup page.',
        });
      }
      const skipped = [...skippedDocs, ...skippedFonts];
      if (skipped.length > 0) {
        toast.warning(`${skipped.length} large file${skipped.length === 1 ? '' : 's'} not stored`, {
          description: `Too big for browser storage: ${skipped.slice(0, 3).join(', ')}${skipped.length > 3 ? '…' : ''}`,
        });
      }

      // A logo silently not making it across is the failure that hurts most,
      // so say which step lost it instead of leaving an empty Logo section.
      const imagesUploaded = assets.filter((a) => a.kind === 'image' && !a.generated);
      if (!logoFull && imagesUploaded.length > 0) {
        const reason = logoAssets.length === 0
          ? 'None of your images were placed in a logo slot — open Logos on the setup page and add it there.'
          : 'The logo image could not be prepared for saving. Try re-uploading it as PNG or SVG.';
        console.warn('[onboarding-v4] no logo persisted', {
          images: imagesUploaded.length,
          placedInSlots: logoAssets.length,
          slots: logoAssets.map((a) => a.logoSlot),
        });
        toast.warning('Your logo was not saved', { description: reason, duration: 12000 });
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

      // Storage-full is the one failure the user can actually act on, so give
      // it its own message with the way out instead of a stack of tiers.
      const storageFull =
        isStorageFullError(err) ||
        (tiered ?? []).some((f) => isStorageFullError(f.err));
      if (storageFull) {
        setBusy(false);
        const advice = storageAdvice();
        toast.error('Your browser storage is full', {
          description: `${describeStorageUsage()}. ${advice.text}`,
          duration: 30000,
          action: advice.brandsAreTheProblem
            ? { label: 'Open brands', onClick: () => navigate('/dashboard/brands') }
            : {
                label: 'Free up space',
                onClick: () => {
                  const freed = freeDisposableStorage();
                  toast.success(`Freed ${freed} KB`, {
                    description: 'Press Set up again — nothing of yours was deleted.',
                  });
                },
              },
        });
        return;
      }

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
