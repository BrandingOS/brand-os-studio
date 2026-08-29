// critique — look at what came back, and say honestly whether it is usable.
//
// Why this exists
// ───────────────
// "The provider returned an image" was the only definition of success in this
// pipeline. A misspelled headline, a redrawn logo, a subject cropped through the
// margin and an empty backdrop all counted as delivered, because nothing ever
// looked at the pixels. The user was the quality gate, and they were paying for
// the privilege.
//
// Four rules keep this from becoming its own problem:
//
//   1. IT NEVER DELAYS DELIVERY. Pages are inserted the moment the images
//      arrive. The critique annotates them afterwards. A quality gate that makes
//      the product feel slower has traded the wrong thing.
//   2. A BROKEN JUDGE MUST NOT COST MONEY. If the critic throws, times out or
//      answers nonsense, everything is accepted. The failure mode of a critic is
//      silence, never a second charge.
//   3. IT RANKS BEFORE IT REJECTS. Scores reorder the results strip from the
//      first day. The reject-and-repair path is gated (see `critiqueDecision`)
//      and starts off.
//   4. ONE CALL PER BATCH, NOT PER IMAGE. Four images in one message, at 512 px,
//      costs about $0.004 against a Nano Banana Pro batch costing 56 credits.
//
// It runs entirely in the browser through the already-deployed `anthropic-proxy`
// (which forwards image content blocks untouched), so none of this requires an
// Edge Function deploy.

import { callAnthropic, firstText } from '@/shared/ai/anthropicProxy';
import type { CopyDeck } from './artDirection';

/** The six things a design director actually looks at, scored 1–5. */
export const CRITIQUE_DIMENSIONS = [
  'finished',    // a published piece, or an empty plate
  'typography',  // are the supplied words set, and set correctly
  'logo',        // faithful to the supplied mark, or redrawn
  'colour',      // roles honoured: ground / type / one accent
  'composition', // focal point, reading order, margins
  'brief',       // does it answer THIS request
] as const;

export type CritiqueDimension = typeof CRITIQUE_DIMENSIONS[number];

/** Objective failures. Each is cheap to see and not a matter of taste. */
export const HARD_FAILURES = [
  'misspelled-copy',
  'invented-fact',
  'mangled-logo',
  'margin-violation',
  'second-logo',
  'placeholder-text',
] as const;

export type HardFailure = typeof HARD_FAILURES[number];

export interface CandidateCritique {
  index: number;
  scores: Record<CritiqueDimension, number>;
  /** Mean of the six, 0–1. */
  overall: number;
  hardFailures: HardFailure[];
  /** One line the user could actually read. */
  note: string;
  /** What to change if this one is repaired. Never a whole new brief. */
  amendment?: string;
}

export interface CritiqueResult {
  criticId: string;
  candidates: CandidateCritique[];
  /** True when the critic could not be reached — everything is accepted. */
  unavailable: boolean;
}

export interface CritiqueInput {
  /** Data URLs or fetchable URLs, in candidate order. */
  images: string[];
  userPrompt: string;
  copy?: CopyDeck;
  kind: 'design' | 'image';
  deliverable: string;
  logoExpected: boolean;
  paletteHexes: string[];
}

const CRITIC_ID = 'claude:haiku-vision@2026-08-24';

const SYSTEM = `You are a design director reviewing image candidates against a brief. You are told the exact words that were meant to be set, whether a real logo was supplied, the colour roles and the deliverable.

Score every candidate on six dimensions, each an integer 1–5:
• finished — 1 an empty background or a plate with space left for text; 5 image, type and mark composed as one publishable piece.
• typography — 1 words garbled, misspelled, doubled or missing; 5 every listed word set correctly with a clear hierarchy. If no words were meant to be set, score 5 when there are none and 1 when text appeared anyway.
• logo — 1 redrawn, stretched, recoloured, or a second mark present; 5 faithful to the supplied mark with correct clear space. If no logo was expected, score 5 when there is none.
• colour — 1 the palette is ignored or every colour is used equally; 5 clear roles: one ground, one colour carrying the type, at most one accent.
• composition — 1 no focal point, elements cropped, margin violated; 5 one focal point, deliberate negative space, margins respected.
• brief — 1 answers a different request; 5 answers this request specifically.

Also report objective hard failures from exactly this list, only when you can actually SEE them:
misspelled-copy, invented-fact, mangled-logo, margin-violation, second-logo, placeholder-text.
"invented-fact" means a price, percentage, date or claim appears that was not supplied.

Do not reward polish. Reward whether this could be published as it stands.

Return ONLY JSON:
{"candidates":[{"index":0,"scores":{"finished":n,"typography":n,"logo":n,"colour":n,"composition":n,"brief":n},"hardFailures":["..."],"note":"one short sentence","amendment":"one targeted instruction naming exactly what to change, or null"}]}
No markdown fences.`;

/**
 * Shrink to 512 px and re-encode as JPEG.
 *
 * Text legibility survives this comfortably — which is the one thing the critic
 * must be able to judge — and it cuts the token cost roughly fourfold.
 */
export async function downscaleForCritique(
  src: string,
  maxEdge = 512,
  createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas'),
): Promise<string | null> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('image load failed'));
      el.src = src;
    });
    const w = img.naturalWidth || maxEdge;
    const h = img.naturalHeight || maxEdge;
    const scale = Math.min(1, maxEdge / Math.max(w, h));
    const canvas = createCanvas();
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch {
    return null;
  }
}

function splitDataUrl(dataUrl: string): { media_type: string; data: string } | null {
  const m = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return { media_type: m[1], data: m[2] };
}

function clamp5(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : 3;
  return Math.max(1, Math.min(5, v));
}

function extractJson(text: string): unknown {
  const t = text.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
  const candidate = fenced ? fenced[1] : t;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('no json');
  return JSON.parse(candidate.slice(start, end + 1));
}

/** Everything accepted, nothing claimed. The shape returned whenever we cannot see. */
export function noCritique(count: number): CritiqueResult {
  return {
    criticId: CRITIC_ID,
    unavailable: true,
    candidates: Array.from({ length: count }, (_, index) => ({
      index,
      scores: { finished: 3, typography: 3, logo: 3, colour: 3, composition: 3, brief: 3 },
      overall: 0.5,
      hardFailures: [],
      note: '',
    })),
  };
}

export interface CritiqueOptions {
  call?: typeof callAnthropic;
  downscale?: typeof downscaleForCritique;
  timeoutMs?: number;
}

/**
 * Critique a whole batch in one call.
 *
 * Never throws. An unreachable, slow or incoherent critic returns
 * `unavailable: true`, which every caller must read as "accept everything".
 */
export async function critiqueBatch(
  input: CritiqueInput,
  opts: CritiqueOptions = {},
): Promise<CritiqueResult> {
  const n = input.images.length;
  if (!n) return noCritique(0);

  const call = opts.call ?? callAnthropic;
  const shrink = opts.downscale ?? downscaleForCritique;
  const timeoutMs = opts.timeoutMs ?? 30000;

  try {
    const shrunk = await Promise.all(input.images.map((src) => shrink(src)));
    const blocks: unknown[] = [];
    let attached = 0;
    shrunk.forEach((d, i) => {
      const parts = d ? splitDataUrl(d) : null;
      if (!parts) return;
      attached++;
      blocks.push({ type: 'text', text: `Candidate ${i}:` });
      blocks.push({ type: 'image', source: { type: 'base64', ...parts } });
    });
    if (!attached) return noCritique(n);

    const wanted = input.copy
      ? [input.copy.headline, input.copy.subhead, input.copy.cta].filter(Boolean).map((w) => `"${w}"`).join(', ')
      : '';
    blocks.push({
      type: 'text',
      text: [
        `REQUEST: ${input.userPrompt}`,
        `DELIVERABLE: ${input.kind === 'design' ? `a finished ${input.deliverable}` : 'a wordless image'}`,
        wanted ? `WORDS THAT WERE TO BE SET, exactly: ${wanted}` : 'NO WORDS WERE TO BE SET.',
        input.logoExpected ? 'A REAL LOGO WAS SUPPLIED and should appear reproduced faithfully.' : 'NO LOGO WAS EXPECTED.',
        input.paletteHexes.length ? `BRAND COLOURS: ${input.paletteHexes.join(', ')}` : 'NO BRAND PALETTE WAS APPLIED.',
        `Score all ${attached} candidates.`,
      ].filter(Boolean).join('\n'),
    });

    const res = await Promise.race([
      call({
        model: 'haiku',
        max_tokens: 1200,
        system: SYSTEM,
        messages: [{ role: 'user', content: blocks }],
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('critique timeout')), timeoutMs)),
    ]);

    const text = firstText(res);
    if (!text) return noCritique(n);
    const parsed = extractJson(text) as { candidates?: unknown[] };
    if (!Array.isArray(parsed.candidates) || !parsed.candidates.length) return noCritique(n);

    const known = new Set<string>(HARD_FAILURES);
    const candidates: CandidateCritique[] = Array.from({ length: n }, (_, index) => {
      const raw = parsed.candidates!.find(
        (c) => (c as { index?: number })?.index === index,
      ) as Record<string, unknown> | undefined;
      if (!raw) return noCritique(n).candidates[index];
      const s = (raw.scores ?? {}) as Record<string, unknown>;
      const scores = {
        finished: clamp5(s.finished),
        typography: clamp5(s.typography),
        logo: clamp5(s.logo),
        colour: clamp5(s.colour),
        composition: clamp5(s.composition),
        brief: clamp5(s.brief),
      };
      const mean = CRITIQUE_DIMENSIONS.reduce((t, d) => t + scores[d], 0) / CRITIQUE_DIMENSIONS.length;
      const hardFailures = (Array.isArray(raw.hardFailures) ? raw.hardFailures : [])
        .filter((f): f is HardFailure => typeof f === 'string' && known.has(f));
      return {
        index,
        scores,
        overall: (mean - 1) / 4,
        hardFailures,
        note: typeof raw.note === 'string' ? raw.note.slice(0, 200) : '',
        amendment: typeof raw.amendment === 'string' && raw.amendment.trim()
          ? raw.amendment.trim().slice(0, 400)
          : undefined,
      };
    });

    return { criticId: CRITIC_ID, candidates, unavailable: false };
  } catch {
    // Rule 2. A judge that cannot answer accepts.
    return noCritique(n);
  }
}

// ─── Policy ──────────────────────────────────────────────────────────────────

export interface DecisionContext {
  attempt: number;
  maxAttempts: number;
  creditsLeft: number;
  costPerAttempt: number;
  /** The reject-and-repair path. Off until the critic is calibrated on real traffic. */
  repairEnabled: boolean;
}

export type CritiqueAction = 'accept' | 'repair' | 'accept-anyway';

export interface Decision {
  action: CritiqueAction;
  reason: string;
}

/** Mean below this, or any dimension at 1, and the piece is not usable. */
export const REJECT_MEAN = 3.0;

/**
 * What to do about one critique. Pure, so every rule here is exhaustively
 * testable without a network, a clock or a model.
 *
 * The bias is deliberate: this function would rather hand over a flawed image
 * than spend the user's money a second time on its own opinion.
 */
export function critiqueDecision(c: CandidateCritique, ctx: DecisionContext): Decision {
  const mean = CRITIQUE_DIMENSIONS.reduce((t, d) => t + c.scores[d], 0) / CRITIQUE_DIMENSIONS.length;
  const floored = CRITIQUE_DIMENSIONS.some((d) => c.scores[d] === 1);
  const bad = c.hardFailures.length > 0 || mean < REJECT_MEAN || floored;

  if (!bad) return { action: 'accept', reason: 'It meets the bar.' };
  if (!ctx.repairEnabled) {
    return { action: 'accept', reason: 'Scored below the bar; repair is not enabled, so it is delivered and flagged.' };
  }
  if (ctx.attempt + 1 >= ctx.maxAttempts) {
    // Never leave someone with nothing after they have paid.
    return { action: 'accept-anyway', reason: 'Last attempt — delivered as it is rather than withheld.' };
  }
  if (ctx.creditsLeft < ctx.costPerAttempt) {
    return { action: 'accept-anyway', reason: 'Not enough credits to try again, so it is delivered rather than withheld.' };
  }
  return {
    action: 'repair',
    reason: c.hardFailures.length
      ? `Repairing: ${c.hardFailures.join(', ')}.`
      : 'Repairing: scored below the bar.',
  };
}

/** Best first. A stable sort, so equal scores keep the order they arrived in. */
export function rankCandidates(c: CandidateCritique[]): CandidateCritique[] {
  return [...c].sort((a, b) => {
    if (a.hardFailures.length !== b.hardFailures.length) return a.hardFailures.length - b.hardFailures.length;
    return b.overall - a.overall;
  });
}
