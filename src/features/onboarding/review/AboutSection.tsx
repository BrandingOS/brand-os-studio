/**
 * About — the retired About group, grown up.
 *
 * It kept its old job: the free-form sections a user wrote survive word for
 * word, because a heading they invented is theirs and the schema has no place
 * for it. What is new sits above them — the structured profile.
 *
 * The split between chips and text is the rule from FR-068, and it is a rule
 * about MEANING, not about convenience:
 *
 *   chips — industry, style, personality, tone, values. Categorical concepts,
 *           where two brands answering the same thing should produce the same
 *           token, because something downstream will compare them.
 *   text  — summary, products, audience, positioning, mission. Concepts whose
 *           meaning lives in the wording. Turning these into dropdowns would
 *           throw away the only part that mattered.
 *
 * Open questions render inline, a few at a time, in the same visual language as
 * everything else — because an unanswered value and a value we guessed are the
 * same kind of thing to a person, and only one of them needs a different
 * control.
 */
import type { CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import type { VocabularyMember } from '../vocabulary/vocabularies';
import type { OpenQuestion } from '../understanding/questions';
import { ReviewCard } from './ReviewCard';

export interface AboutValue {
  path: CoreFieldPath;
  label: string;
  /** Present ⇒ chips. Absent ⇒ prose. */
  vocabulary?: VocabularyMember[];
  /** Selected member ids, for a chip value. */
  selected?: string[];
  /** The rendered sentence, for a prose value. */
  text?: string;
  origin: string;
  decided: boolean;
}

export interface FreeSection {
  id: string;
  title: string;
  content: string;
}

export interface AboutSectionProps {
  /** Business Info facts, which carry no confirmation. */
  industry?: { value?: string; vocabulary: VocabularyMember[] };
  products?: string;
  values: AboutValue[];
  freeSections: FreeSection[];
  questions: OpenQuestion[];
  busy?: boolean;
  onToggleChip(path: CoreFieldPath, memberId: string): void;
  onEditText(path: CoreFieldPath, next: string): void;
  onIndustry(memberId: string): void;
  onProducts(next: string): void;
  onLooksRight(): void;
  onAnswer(q: OpenQuestion, answer: string): void;
  onAddSection(): void;
  onEditSection(s: FreeSection): void;
}

export function AboutSection({
  industry, products, values, freeSections, questions, busy,
  onToggleChip, onEditText, onIndustry, onProducts, onLooksRight, onAnswer,
  onAddSection, onEditSection,
}: AboutSectionProps) {
  const decided = values.filter((v) => v.decided).length;
  const total = values.length;

  return (
    <ReviewCard
      title="About"
      meta={total ? `${decided} of ${total} decided` : undefined}
      onLooksRight={total ? onLooksRight : undefined}
      looksRightDisabled={decided === total || busy}
      empty="Nothing here yet — tell us about the brand and we'll fill this in."
      footer={
        <>
          <button type="button" className="onb-hint-link" onClick={onAddSection}>
            Add a section
          </button>
          {freeSections.length > 0 && (
            <span className="onb-hint onb-hint--right">Your own sections are kept word for word</span>
          )}
        </>
      }
    >
      {(industry || products !== undefined || total > 0 || questions.length > 0 || freeSections.length > 0) && (
        <div className="onb-about">
          {/* ── Business facts: saved on edit, nothing to confirm ───────── */}
          {industry && (
            <div className="onb-vr">
              <span className="onb-vk">Industry</span>
              <ChipRow
                members={industry.vocabulary}
                selected={industry.value ? [industry.value] : []}
                onToggle={(id) => onIndustry(id)}
              />
            </div>
          )}

          {products !== undefined && (
            <div className="onb-vr">
              <span className="onb-vk">Products &amp; services</span>
              <EditableText
                value={products}
                placeholder="What do you sell?"
                decided
                onSave={onProducts}
              />
            </div>
          )}

          {/* ── Core values: chips where categorical, text where it matters ── */}
          {values.map((v) => (
            <div className="onb-vr" key={v.path}>
              <span className="onb-vk">{v.label}</span>
              {v.vocabulary ? (
                <ChipRow
                  members={v.vocabulary}
                  selected={v.selected ?? []}
                  onToggle={(id) => onToggleChip(v.path, id)}
                />
              ) : (
                <EditableText
                  value={v.text ?? ''}
                  placeholder="Not set"
                  decided={v.decided}
                  onSave={(next) => onEditText(v.path, next)}
                />
              )}
              {/* Secondary to the value by size, colour and position — it
                  explains where a belief came from, it never competes. */}
              <span className="onb-vo">{v.decided ? 'Confirmed by you' : `From ${v.origin}`}</span>
            </div>
          ))}

          {/* ── The user's own sections, preserved verbatim ─────────────── */}
          {freeSections.map((s) => (
            <div className="onb-vr" key={s.id}>
              <span className="onb-vk">
                {s.title} <span className="onb-vk-own">— your own section</span>
              </span>
              <button type="button" className="onb-vt is-decided" onClick={() => onEditSection(s)}>
                {s.content}
              </button>
            </div>
          ))}

          {/* ── Only what is genuinely missing, a few at a time ─────────── */}
          {questions.map((q) => (
            <div className="onb-vr" key={`${q.target.concept}:${q.target.path}`}>
              <div className="onb-ask">
                <p className="onb-ask-q">{q.prompt}</p>
                {q.vocabulary ? (
                  <ChipRow
                    members={q.vocabulary}
                    selected={[]}
                    onToggle={(id) => onAnswer(q, id)}
                  />
                ) : (
                  <EditableText
                    value=""
                    placeholder="A sentence is plenty"
                    decided={false}
                    onSave={(next) => onAnswer(q, next)}
                    startOpen
                  />
                )}
                <span className="onb-hint">Skip it if you'd rather — you can set this later.</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </ReviewCard>
  );
}

/** A chip set. Dashed = not chosen; solid = chosen. Never a dropdown. */
function ChipRow({
  members,
  selected,
  onToggle,
}: {
  members: VocabularyMember[];
  selected: string[];
  onToggle(id: string): void;
}) {
  return (
    <div className="onb-chips">
      {members.map((m) => {
        const on = selected.includes(m.id);
        return (
          <button
            key={m.id}
            type="button"
            className={`onb-chip${on ? ' is-on' : ''}`}
            aria-pressed={on}
            onClick={() => onToggle(m.id)}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

/** Prose, edited in place. A modal would turn a small correction into an event. */
function EditableText({
  value,
  placeholder,
  decided,
  onSave,
  startOpen = false,
}: {
  value: string;
  placeholder: string;
  decided: boolean;
  onSave(next: string): void;
  startOpen?: boolean;
}) {
  return (
    <textarea
      className={`onb-vt-input${decided ? ' is-decided' : ''}`}
      defaultValue={value}
      rows={startOpen ? 2 : Math.max(1, Math.ceil((value.length || 1) / 64))}
      placeholder={placeholder}
      aria-label={placeholder}
      onBlur={(e) => {
        const next = e.target.value.trim();
        if (next && next !== value) onSave(next);
      }}
    />
  );
}
