/**
 * The journey, as data.
 *
 *   logo        upload the mark and name the brand
 *   read        the product looks at the mark and says what it sees
 *   context     four short questions only the owner can answer
 *   directions  three distinct strategies, each argued from the logo + answers
 *   system      the chosen direction becomes a live brand board to refine and
 *               approve section by section
 *   build       the brand is created and every deliverable is produced
 *   package     the brand hub: everything organised, downloadable, and a door
 *               into the product
 *
 * Each step names what it needs; `furthestReachable` is how a cold load or a
 * hand-typed URL is clamped to the last step that can actually render.
 */
import type { LogoFlowState } from './flowStore';
import type { SystemSection } from './types';

export const STEPS = ['logo', 'read', 'context', 'directions', 'system', 'build', 'package'] as const;
export type StepId = (typeof STEPS)[number];

export const STEP_META: Record<StepId, { label: string; title: string; subtitle: string }> = {
  logo: {
    label: 'Logo',
    title: 'Start from your logo',
    subtitle: 'Bring the mark. We’ll build the whole brand around it.',
  },
  read: {
    label: 'Read',
    title: 'Here’s what we see',
    subtitle: 'Every choice that follows starts from your mark.',
  },
  context: {
    label: 'Context',
    title: 'Tell us about your brand',
    subtitle: 'Paste a brief, a website or a sentence — we’ll take it from there.',
  },
  directions: {
    label: 'Direction',
    title: 'Three ways your brand could feel',
    subtitle: 'Each one is argued from your logo and your answers. Pick the one that sounds like you.',
  },
  system: {
    label: 'System',
    title: 'Shape your brand system',
    subtitle: 'Refine anything, then approve each part. The board updates as you go.',
  },
  build: {
    label: 'Build',
    title: 'Building your brand',
    subtitle: 'Creating the brand and producing every file.',
  },
  package: {
    label: 'Package',
    title: 'Your brand is ready',
    subtitle: 'Everything is organised, saved to your brand, and ready to download.',
  },
};

/** The progress rail shows the owner's decisions, not the machinery. */
export const RAIL: StepId[] = ['logo', 'context', 'directions', 'system', 'package'];

export function isStep(value: string | null): value is StepId {
  return !!value && (STEPS as readonly string[]).includes(value);
}

type Needs = Pick<LogoFlowState, 'logo' | 'read' | 'context' | 'directions' | 'system' | 'committed'>;

/** Whether a step has what it needs to render. */
export function canEnter(step: StepId, s: Needs): boolean {
  switch (step) {
    case 'logo':
      return true;
    case 'read':
      return !!s.logo && s.context.name.trim().length > 0;
    case 'context':
      return !!s.logo && !!s.read && s.context.name.trim().length > 0;
    case 'directions':
      // Nothing is required here: an open answer is the product's to decide.
      return canEnter('context', s);
    case 'system':
      return canEnter('directions', s) && !!s.system;
    case 'build':
      return canEnter('system', s);
    case 'package':
      return !!s.committed && !!s.system && !!s.logo;
  }
}

/** Whether every answer the directions use is filled. Informational, not a gate. */
export function contextComplete(c: Needs['context']): boolean {
  return !!c.industry && !!c.audience && !!c.positioning && c.personality.length >= 1;
}

export function furthestReachable(target: StepId, s: Needs): StepId {
  const idx = STEPS.indexOf(target);
  for (let i = idx; i >= 0; i--) if (canEnter(STEPS[i], s)) return STEPS[i];
  return 'logo';
}

export function nextStep(step: StepId): StepId | null {
  const i = STEPS.indexOf(step);
  return i < STEPS.length - 1 ? STEPS[i + 1] : null;
}

export function prevStep(step: StepId): StepId | null {
  const i = STEPS.indexOf(step);
  return i > 0 ? STEPS[i - 1] : null;
}

/** The parts of the system the owner approves one by one, in panel order. */
export const SECTIONS: Array<{ value: SystemSection; label: string }> = [
  { value: 'color', label: 'Colour' },
  { value: 'type', label: 'Type' },
  { value: 'shape', label: 'Shapes' },
  { value: 'pattern', label: 'Pattern' },
  { value: 'logo', label: 'Logo' },
  { value: 'voice', label: 'Voice' },
];
