/**
 * The approved system, written to a real brand.
 *
 * Through the SAME seams `/onboard-brand` uses — `createBrand` (brand-first,
 * placeholder sentinels), the Library for the logo bytes (`storeMaterial`),
 * `logoSystemPatch` for role refs, `editAsUser` for every Core value, and
 * `finishOnboarding` to mark it done. There is no second write path, so Setup,
 * Brand Kit and the Guideline builder read this brand exactly as they read one
 * that came through the upload flow.
 *
 * Every value is written AS THE OWNER and therefore confirmed: they approved
 * this system section by section, which is what confirming is.
 *
 * Never throws after the brand exists. A value that did not save is named in
 * `notSaved`, so the hub can say so instead of claiming a success it lacks.
 */
import { container } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS, type IAssetsService } from '@/core/types/services';
import type { CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import type { Brand } from '@/shared/types/brand';
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';
import { clearPlaceholders, readOnboardingState } from '@/shared/onboarding/onboardingState';
import { createBrand, editAsUser, saveBusinessFact, type Human } from '@/features/onboarding/bridge/v4Bridge';
import { logoSystemPatch, storeMaterial } from '@/features/onboarding/understanding/material';
import { finishOnboarding } from '@/features/onboarding/understanding/finish';
import type { BrandContext, BrandSystem, LogoSource } from '../model/types';
import { logoPng, primaryInk, recolorSvg } from '../engine/logoArt';
import { ROLE_USAGE } from '../engine/palette';

export interface CommitDeps {
  create(input: unknown): Promise<Brand>;
  update(id: string, patch: Partial<Brand>): Promise<unknown>;
  live(id: string): Brand | undefined;
  actor: Human;
  /** Progress, for the build screen. */
  onStep?(label: string): void;
}

export interface CommitResult {
  brand: Brand;
  notSaved: string[];
}

/** The Core writes the system implies, in the order Setup lists them. */
export function coreWrites(system: BrandSystem, context: BrandContext): Array<{ path: CoreFieldPath; value: unknown; label: string }> {
  const p = system.palette;
  const writes: Array<{ path: CoreFieldPath; value: unknown; label: string }> = [
    { path: 'colors.primary', value: { hex: p.primary, name: 'Primary', usage: ROLE_USAGE.primary }, label: 'primary colour' },
    { path: 'colors.secondary', value: { hex: p.secondary, name: 'Secondary', usage: ROLE_USAGE.secondary }, label: 'secondary colour' },
    { path: 'colors.accent', value: { hex: p.accent, name: 'Accent', usage: ROLE_USAGE.accent }, label: 'accent colour' },
    {
      path: 'colors.neutrals',
      value: [
        { hex: p.light, name: 'Light ground', usage: ROLE_USAGE.light },
        { hex: p.dark, name: 'Ink', usage: ROLE_USAGE.dark },
      ],
      label: 'neutrals',
    },
    {
      path: 'typography.primary',
      value: { family: system.type.heading, weights: [system.type.headingWeight], usage: 'Headings and display' },
      label: 'heading typeface',
    },
    { path: 'typography.secondary', value: { family: system.type.body, weights: [400, 500, 600], usage: 'Body and interface' }, label: 'body typeface' },
    { path: 'strategy.personality', value: context.personality, label: 'personality' },
    { path: 'voice.tone', value: system.voice.tone, label: 'tone of voice' },
    { path: 'voice.doList', value: system.voice.doList, label: 'voice do-list' },
    { path: 'voice.dontList', value: system.voice.dontList, label: 'voice don’t-list' },
    { path: 'voice.examples', value: system.voice.samples.map((text) => ({ context: 'Headline', text })), label: 'voice examples' },
    { path: 'visualStyle.descriptors', value: system.descriptors, label: 'visual style' },
    { path: 'visualStyle.cornerStyle', value: system.corner, label: 'corner style' },
    { path: 'visualStyle.contrast', value: system.contrast, label: 'contrast' },
    { path: 'visualStyle.density', value: system.density, label: 'density' },
    {
      path: 'rules.logo',
      value: {
        clearSpaceRatio: system.logo.clearSpace,
        minSizePx: system.logo.minWidthPx,
        allowedBackgrounds: ['light', 'dark', 'brand'],
        prohibited: ['stretch', 'recolor', 'rotate', 'outline', 'shadow'],
      },
      label: 'logo rules',
    },
  ];
  if (context.audience) writes.push({ path: 'strategy.targetAudience', value: context.audience, label: 'audience' });
  if (context.positioning) writes.push({ path: 'strategy.positioning', value: context.positioning, label: 'positioning' });
  if (context.oneLiner.trim()) writes.push({ path: 'strategy.summary', value: context.oneLiner.trim(), label: 'summary' });
  return writes;
}

/** The logo files the brand's logo system points at: the primary, and the white cut. */
async function logoItems(logo: LogoSource, system: BrandSystem): Promise<Array<{ item: OnboardingAsset; role: 'primary' | 'mono.white' }>> {
  const make = async (color: string, suffix: string, slot: 'primary' | 'dark'): Promise<OnboardingAsset> => {
    const file = logo.svgText
      ? new File([recolorSvg(logo.svgText, color)], `${logo.name}-${suffix}.svg`, { type: 'image/svg+xml' })
      : new File([await logoPng(logo, { color, height: 1024 })], `${logo.name}-${suffix}.png`, { type: 'image/png' });
    return {
      id: `logo-flow-${suffix}`,
      name: file.name,
      sub: '',
      kind: 'image',
      previewUrl: null,
      uploadStatus: 'done',
      uploadProgress: 100,
      isLogo: true,
      logoSlot: slot,
      slotConfirmed: true,
      _file: file,
    } as OnboardingAsset;
  };
  return [
    { item: await make(primaryInk(system), 'primary', 'primary'), role: 'primary' },
    { item: await make('#ffffff', 'white', 'dark'), role: 'mono.white' },
  ];
}

export async function commitBrand(
  input: { logo: LogoSource; context: BrandContext; system: BrandSystem },
  deps: CommitDeps,
): Promise<CommitResult> {
  const { logo, context, system } = input;
  const notSaved: string[] = [];

  deps.onStep?.('Creating the brand');
  const created = await createBrand(deps.create, deps.update as never, {
    name: context.name.trim(),
    description: context.oneLiner,
  });

  deps.onStep?.('Saving the logo system');
  try {
    const assets = container.get<IAssetsService>(SERVICE_KEYS.ASSETS);
    const placements: Array<{ role: 'primary' | 'mono.white'; assetId: string }> = [];
    for (const { item, role } of await logoItems(logo, system)) {
      const stored = await storeMaterial(assets, deps.live(created.id) ?? created, item);
      if (stored) placements.push({ role, assetId: stored.assetId });
      else notSaved.push(role === 'primary' ? 'the logo' : 'the white logo');
    }
    if (placements.length) {
      await deps.update(created.id, logoSystemPatch(deps.live(created.id) ?? created, placements));
    }
  } catch {
    notSaved.push('the logo');
  }

  deps.onStep?.('Writing colours, type and voice');
  for (const w of coreWrites(system, context)) {
    try {
      await editAsUser(created.id, w.path, w.value, deps.actor);
    } catch {
      notSaved.push(w.label);
    }
  }
  if (context.industry) {
    try {
      const failed = await saveBusinessFact(created.id, { industry: context.industry });
      notSaved.push(...failed);
    } catch {
      notSaved.push('industry');
    }
  }

  // The two values the brand was created with as stand-ins are now real.
  const live = deps.live(created.id) ?? created;
  const cleared = clearPlaceholders(readOnboardingState(live), ['colors.primary', 'typography.primary']);
  if (cleared) await deps.update(created.id, { onboarding: cleared } as Partial<Brand>);

  deps.onStep?.('Finishing up');
  const report = await finishOnboarding({
    brand: deps.live(created.id) ?? created,
    live: deps.live,
    updateBrand: async (id, patch) => {
      await deps.update(id, patch);
    },
  });
  notSaved.push(...report.notSaved);

  return { brand: deps.live(created.id) ?? created, notSaved };
}
