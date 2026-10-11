/**
 * Brand directions — the generator boundary.
 *
 * `DirectionGenerator` is the seam an AI backend plugs into: it receives the
 * logo read and the owner's answers and returns ranked directions in the
 * `Direction` shape. `localDirectionGenerator` is the deterministic
 * implementation shipped today — a strategist's rulebook rather than a model —
 * and it is what keeps the flow free, instant and testable. Swapping in a
 * model changes nothing upstream or downstream: the UI renders `Direction`,
 * refinement edits `BrandSystem`, the exports read `BrandSystem`.
 *
 * Two rules every generator must keep:
 *   • three directions that DIFFER — three blues with different fonts is one
 *     direction, three times;
 *   • every rationale line names a reason from the logo or the answers.
 */
import { labelOf } from '@/features/onboarding/bridge/v4Bridge';
import { hexToHsl } from '@/shared/color/colorEngine';
import type { BrandContext, BrandSystem, Direction, LogoRead, VoiceSystem } from '../model/types';
import { ARCHETYPES, archetypeById, type Archetype } from './archetypes';
import { HUE_CENTERS, buildPalette } from './palette';
import { clearSpaceFor, minWidthFor } from './logoRead';

export interface DirectionRequest {
  read: LogoRead;
  context: BrandContext;
  /** Archetype ids to leave out — "show me different ones". */
  exclude?: string[];
  /** Changes the variation inside each archetype. */
  round?: number;
  count?: number;
}

export interface DirectionGenerator {
  generate(request: DirectionRequest): Promise<Direction[]>;
}

/* ── Scoring ───────────────────────────────────────────────────────── */

export interface Fit {
  score: number;
  reasons: string[];
}

function lower(s: string | undefined): string {
  return (s ?? '').toLowerCase();
}

/** How well an archetype fits. Pure; the reasons become the rationale. */
export function scoreArchetype(a: Archetype, read: LogoRead, ctx: BrandContext): Fit {
  let score = 0.2;
  const reasons: string[] = [];
  const t = read.traits;

  if (ctx.industry && a.fits.industries.includes(ctx.industry)) {
    score += 0.22;
    reasons.push(`${labelOf('industry', ctx.industry)} brands that want to feel ${a.feel} stand out from category clichés.`);
  }
  const sharedPersonality = ctx.personality.filter((p) => a.fits.personality.includes(p));
  if (sharedPersonality.length) {
    score += Math.min(0.33, sharedPersonality.length * 0.12);
    const names = sharedPersonality.map((p) => lower(labelOf('personality', p)));
    reasons.push(`You asked for ${joinWords(names)} — this direction is built around exactly that.`);
  }
  if (ctx.positioning && a.fits.positioning.includes(ctx.positioning)) {
    // The position an archetype lists FIRST is the one it was made for.
    score += a.fits.positioning[0] === ctx.positioning ? 0.2 : 0.14;
    reasons.push(`It signals a ${lower(labelOf('positioning', ctx.positioning))} position without having to say it.`);
  }
  if (ctx.audience && a.fits.audience.includes(ctx.audience)) {
    score += 0.08;
    reasons.push(`It speaks the visual language ${lower(labelOf('audience', ctx.audience))} already trust.`);
  }
  if (a.fits.geometry.includes(t.geometry)) {
    score += t.geometry === 'balanced' ? 0.04 : 0.12;
    if (t.geometry !== 'balanced') {
      reasons.push(
        t.geometry === 'geometric'
          ? `Your mark is geometric; ${a.pairings[0].heading} shares its construction.`
          : `Your mark is drawn with organic curves; ${a.pairings[0].heading} keeps that hand-made warmth.`,
      );
    }
  } else if (t.geometry !== 'balanced') {
    score -= 0.08;
  }
  if (a.fits.weight.includes(t.weight)) {
    score += 0.06;
    if (t.weight === 'heavy' && a.contrast === 'high') reasons.push('Your heavy mark can carry the strong, high-contrast grounds this direction uses.');
    if (t.weight === 'light' && a.density === 'airy') reasons.push('Your fine-lined mark gets the generous space it needs here.');
  } else {
    score -= 0.05;
  }
  if (t.composition === 'wordmark' && (a.id === 'editorial' || a.id === 'luxe-noir' || a.id === 'precision-tech')) {
    score += 0.04;
  }
  if (ctx.loveHues.includes('neutral') && a.fits.neutralLover) {
    score += 0.1;
    reasons.push('You like restrained, neutral palettes — this one is built on them.');
  }
  const loved = ctx.loveHues.filter((h) => h !== 'neutral');
  if (loved.length && a.palette.anchorRole === 'primary') score += 0.04;
  if (t.colored) {
    reasons.push('Your logo’s own colour is kept as the anchor of the palette.');
  }
  return { score, reasons };
}

function joinWords(words: string[]): string {
  if (words.length <= 1) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/** Deterministic 0–1 from a string — stable variation without Math.random. */
export function hash01(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/* ── Assembly ──────────────────────────────────────────────────────── */

function fill(template: string, ctx: BrandContext): string {
  const industry = ctx.industry ? lower(labelOf('industry', ctx.industry)) : 'your field';
  const audience = ctx.audience ? lower(labelOf('audience', ctx.audience)) : 'people';
  return template
    .split('{name}').join(ctx.name || 'Your brand')
    .split('{industry}').join(industry)
    .split('{audience}').join(audience)
    .replace(/^./, (c) => c.toUpperCase());
}

export function voiceFor(a: Archetype, ctx: BrandContext): VoiceSystem {
  const samples = a.voice.samples.map((s) => fill(s, ctx));
  if (ctx.oneLiner.trim()) samples.push(ctx.oneLiner.trim());
  return {
    tone: a.voice.tone,
    principles: a.voice.principles,
    doList: a.voice.doList,
    dontList: a.voice.dontList,
    samples,
  };
}

function anchorHueOf(read: LogoRead, ctx: BrandContext): number | null {
  if (read.traits.colored && read.metrics.inkHue !== null) return read.metrics.inkHue;
  const loved = ctx.loveHues.find((h) => h !== 'neutral');
  return loved ? HUE_CENTERS[loved as keyof typeof HUE_CENTERS] : null;
}

export function directionFrom(a: Archetype, fit: Fit, read: LogoRead, ctx: BrandContext, round: number): Direction {
  const seed = hash01(`${ctx.name}|${a.id}|${round}`);
  const anchorHue = anchorHueOf(read, ctx);
  const palette = buildPalette(a.palette, { anchorHue, avoid: ctx.avoidHues, seed, variant: round });
  const alternates = [1, 2, 3].map((v) =>
    buildPalette(a.palette, { anchorHue: null, avoid: ctx.avoidHues, seed: hash01(`${seed}|${v}`), variant: round + v }),
  );
  const offset = round % a.pairings.length;
  const pairings = [...a.pairings.slice(offset), ...a.pairings.slice(0, offset)];
  const rationale = fit.reasons.length
    ? fit.reasons.slice(0, 3)
    : [`A ${a.feel} direction gives your mark a clear, ownable setting.`];
  return {
    id: `${a.id}:${round}`,
    archetypeId: a.id,
    name: a.name,
    essence: a.essence,
    rationale,
    palette,
    paletteAlternates: alternates,
    type: pairings[0],
    typeAlternates: pairings.slice(1),
    corner: a.corner,
    motif: a.motif,
    pattern: a.patterns[0],
    patternAlternates: a.patterns.slice(1),
    voice: voiceFor(a, ctx),
    descriptors: a.descriptors,
    contrast: a.contrast,
    density: a.density,
    score: fit.score,
  };
}

/** Distinct by FEEL: two directions whose primaries share a hue family count as one. */
function distinctPick(ranked: Direction[], count: number): Direction[] {
  const picked: Direction[] = [];
  for (const d of ranked) {
    if (picked.length >= count) break;
    const h = hexToHsl(d.palette.primary);
    const clash = picked.some((p) => {
      const q = hexToHsl(p.palette.primary);
      const hueGap = Math.min(Math.abs(h.h - q.h), 360 - Math.abs(h.h - q.h));
      const bothNeutral = h.s < 15 && q.s < 15;
      return bothNeutral || (hueGap < 22 && Math.abs(h.l - q.l) < 14 && h.s >= 15 && q.s >= 15);
    });
    if (!clash) picked.push(d);
  }
  for (const d of ranked) {
    if (picked.length >= count) break;
    if (!picked.includes(d)) picked.push(d);
  }
  return picked;
}

export function generateDirectionsSync(req: DirectionRequest): Direction[] {
  const { read, context, exclude = [], round = 0, count = 3 } = req;
  const candidates = ARCHETYPES.filter((a) => !exclude.includes(a.id));
  const pool = candidates.length >= count ? candidates : ARCHETYPES;
  const ranked = pool
    .map((a) => {
      const fit = scoreArchetype(a, read, context);
      // A small, stable nudge so a later round can surface the runner-up.
      const jitter = round ? hash01(`${a.id}|${round}`) * 0.12 : 0;
      return directionFrom(a, { ...fit, score: fit.score + jitter }, read, context, round);
    })
    .sort((x, y) => y.score - x.score);
  return distinctPick(ranked, count);
}

export const localDirectionGenerator: DirectionGenerator = {
  async generate(req) {
    return generateDirectionsSync(req);
  },
};

/* ── Direction → system ────────────────────────────────────────────── */

/** The decision starts as the chosen proposal, plus the logo rules the read implies. */
export function systemFromDirection(d: Direction, read: LogoRead): BrandSystem {
  return {
    directionId: d.id,
    archetypeId: d.archetypeId,
    directionName: d.name,
    palette: d.palette,
    paletteAlternates: d.paletteAlternates,
    type: d.type,
    corner: d.corner,
    motif: d.motif,
    pattern: d.pattern,
    voice: d.voice,
    logo: {
      ink: read.traits.colored ? 'primary' : 'dark',
      clearSpace: clearSpaceFor(read.traits),
      minWidthPx: minWidthFor(read.traits),
      lockup: read.traits.composition === 'symbol' || read.traits.composition === 'unclear',
    },
    descriptors: d.descriptors,
    contrast: d.contrast,
    density: d.density,
    approved: [],
  };
}

/** The alternatives a refinement panel offers, recovered from the archetype. */
export function alternativesFor(system: BrandSystem): {
  pairings: Direction['type'][];
  patterns: Direction['pattern'][];
} {
  const a = archetypeById(system.archetypeId);
  const pairings = a ? a.pairings : [system.type];
  const others = ARCHETYPES.filter((x) => x.id !== system.archetypeId).map((x) => x.pairings[0]);
  const seen = new Set<string>();
  const all = [...pairings, ...others].filter((p) => {
    const k = `${p.heading}|${p.body}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return {
    pairings: all.slice(0, 8),
    patterns: ['grid', 'dots', 'diagonal', 'waves', 'rings', 'confetti', 'mark'],
  };
}
