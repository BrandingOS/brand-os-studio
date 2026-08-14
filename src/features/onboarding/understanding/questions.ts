/**
 * What is still worth asking.
 *
 * The principle: the user gives us whatever they know, BrandingOS understands
 * it, and we ask only for what is meaningfully missing. So this module runs
 * AFTER extraction and asks about the gap — never about something the text
 * already answered.
 *
 * Three constraints, all from FR-055, and each one is why a rule exists here:
 *
 *  - **Only what is materially useful.** `strategy.vision` is a real Core value
 *    and is deliberately NOT asked: a brand that skips it loses nothing at
 *    onboarding, and asking costs attention. Importance is about what the
 *    product does with the answer, not about schema completeness.
 *  - **Progressively, not as a questionnaire.** `MAX_ASKED` caps how many
 *    surface at once. The rest appear as earlier ones are answered, so the
 *    review never becomes a form.
 *  - **Selections where the concept is categorical.** A question that carries a
 *    vocabulary renders as chips; only genuinely open concepts get a text box.
 *
 * Nothing here is stored. Questions are DERIVED from the brand on each render,
 * which is what keeps Principle II intact — and it is why answering one is
 * simply a user edit, and confirms that value like any other edit.
 *
 * Pure — no service, no store, no React.
 */
import type { CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import { PATH_VOCABULARY } from './proposals';
import { VOCABULARIES, type VocabularyMember } from '../vocabulary/vocabularies';

/** The Business Info fields onboarding may ask about. Closed, like CoreFieldPath. */
export type BusinessInfoPath = 'industry' | 'tagline' | 'description' | 'audienceSummary';

export interface OpenQuestion {
  /** Which concept is missing. Core and Business Info are distinct targets. */
  target: { concept: 'core'; path: CoreFieldPath } | { concept: 'business'; path: BusinessInfoPath };
  /** In the user's words. Never names a field or a schema path. */
  prompt: string;
  /** Present ⇒ answer as a selection. Absent ⇒ a short text answer. */
  vocabulary?: VocabularyMember[];
  /** Ordering only. Never a progress metric and never rendered. */
  importance: number;
}

/** How many questions surface at once. The rest arrive as these are answered. */
export const MAX_ASKED = 3;

/**
 * The askable set, most useful first.
 *
 * Ordered by what the product can actually do with the answer: industry and
 * style drive every later suggestion, so they are worth a moment; a vision
 * statement is not asked at all.
 */
const ASKABLE: Array<Omit<OpenQuestion, 'vocabulary'> & { vocab?: keyof typeof VOCABULARIES }> = [
  {
    target: { concept: 'business', path: 'industry' },
    prompt: 'What industry is this brand in?',
    vocab: 'industry',
    importance: 100,
  },
  {
    target: { concept: 'core', path: 'visualStyle.descriptors' },
    prompt: 'How should it look?',
    vocab: 'style',
    importance: 90,
  },
  {
    target: { concept: 'core', path: 'strategy.personality' },
    prompt: 'How would you describe its personality?',
    vocab: 'personality',
    importance: 80,
  },
  {
    target: { concept: 'core', path: 'voice.tone' },
    prompt: 'How should it sound?',
    vocab: 'tone',
    importance: 70,
  },
  {
    target: { concept: 'core', path: 'strategy.values' },
    prompt: 'What does it stand for?',
    vocab: 'values',
    importance: 60,
  },
  {
    target: { concept: 'core', path: 'strategy.targetAudience' },
    prompt: 'Who is it for?',
    importance: 50,
  },
  {
    target: { concept: 'core', path: 'strategy.mission' },
    prompt: 'What is it here to do?',
    importance: 40,
  },
  {
    target: { concept: 'core', path: 'strategy.positioning' },
    prompt: 'Where does it sit in its market?',
    importance: 30,
  },
];

export interface QuestionInput {
  /** Core paths that already carry a value, at any authority. */
  answeredCore: ReadonlySet<string>;
  /** Business Info fields that already carry a value. */
  answeredBusiness: ReadonlySet<string>;
}

/**
 * Derives the questions worth asking, capped and ordered.
 *
 * A fully-determined brand yields none — which is the point: someone who
 * pasted a complete brief is not interrogated about it.
 */
export function deriveQuestions(input: QuestionInput, max = MAX_ASKED): OpenQuestion[] {
  const out: OpenQuestion[] = [];
  for (const q of [...ASKABLE].sort((a, b) => b.importance - a.importance)) {
    const answered =
      q.target.concept === 'core'
        ? input.answeredCore.has(q.target.path)
        : input.answeredBusiness.has(q.target.path);
    if (answered) continue;
    out.push({
      target: q.target,
      prompt: q.prompt,
      importance: q.importance,
      ...(q.vocab ? { vocabulary: VOCABULARIES[q.vocab] } : {}),
    });
    if (out.length >= max) break;
  }
  return out;
}

/** The vocabulary a Core path answers from, if any. Re-exported for the review. */
export function vocabularyFor(path: CoreFieldPath): VocabularyMember[] | undefined {
  const name = PATH_VOCABULARY[path];
  return name ? VOCABULARIES[name] : undefined;
}
