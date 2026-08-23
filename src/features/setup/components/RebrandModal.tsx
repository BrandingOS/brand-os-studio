/**
 * Change the branding from one AI reply — everything except the logo.
 *
 * The strategy import's bigger sibling, and the same covenant scaled up:
 * the user's own AI tool does the thinking, the product authors the prompt
 * and parses the reply, and NOTHING is written until the user approves it.
 * Two rules are specific to this modal:
 *
 *  - **A section that would REPLACE what the brand has starts UNTICKED.**
 *    Overwriting is opt-in, always. A section that fills an empty slot
 *    starts ticked — there is nothing to lose there.
 *  - **A checkpoint precedes every apply** (saved by the page, listed here),
 *    restorable whole or one section at a time. An approved rebrand should
 *    still be an undoable one.
 *
 * Icons are never asked from the AI: they are recomputed client-side from
 * the strategy the reply produces (the same `suggestIconsForBrand` the Brand
 * Kit uses) and previewed as a grid like everything else.
 */
import { useEffect, useMemo, useState } from 'react';
import { DsButton, DsModal, DsTextArea } from '@/shared/ds';
import { AiPromptMenu } from '@/shared/ai-handoff/AiPromptMenu';
import { loadFontFamily } from '@/shared/design-system/fonts';
import { suggestIconsForBrand } from '@/features/brand-kit/data/suggestIcons';
import '@flaticon/flaticon-uicons/css/regular/rounded.css';
import type { BrandColor, MockBrand } from '../data/mockBrand';
import { STRATEGY_CARDS, contentOf } from '../data/strategyCards';
import { buildBrandingPrompt } from '../strategy/brandingPrompt';
import {
  parseBrandingBrief,
  paletteToGroups,
  type ParsedPairing,
} from '../strategy/parseBrandingBrief';
import {
  applyStrategyFields,
  labelOf,
  type ParsedStrategyField,
} from '../strategy/parseStrategyBrief';
import {
  listCheckpoints,
  deleteCheckpoint,
  BRANDING_SECTIONS,
  type BrandingCheckpoint,
  type BrandingSectionId,
} from '../strategy/checkpoints';
import './strategyImport.css';
import './rebrand.css';

/** What the user approved. The page writes it as ONE edit, checkpoint first. */
export interface RebrandApply {
  direction?: string;
  palette?: { core: BrandColor[]; accent: BrandColor[] };
  pairing?: ParsedPairing;
  strategy?: ParsedStrategyField[];
  icons?: string[];
}

type Props = {
  open: boolean;
  brandName: string;
  brand: MockBrand;
  brandId: string;
  onClose(): void;
  onApply(result: RebrandApply): void;
  /** Restore the chosen sections of a checkpoint. Also one edit. */
  onRestore(checkpoint: BrandingCheckpoint, sections: BrandingSectionId[]): void;
};

const SECTION_NAMES: Record<BrandingSectionId, string> = {
  colors: 'Colors',
  fonts: 'Typography',
  strategy: 'Brand Strategy',
  icons: 'Icons',
};

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const Swatches = ({ colors }: { colors: BrandColor[] }) => (
  <div className="rb-swatches">
    {colors.map((c) => (
      <div key={`${c.hex}-${c.name}`} className="rb-swatch">
        <div className="rb-swatch-chip" style={{ background: c.hex }} />
        <span className="rb-swatch-name">{c.hex}</span>
      </div>
    ))}
  </div>
);

const IconGrid = ({ icons }: { icons: string[] }) => (
  <div className="rb-icons">
    {icons.slice(0, 14).map((name) => (
      <i key={name} className={`fi ${name}`} aria-hidden />
    ))}
    {icons.length > 14 && <span className="rb-icons-more">+{icons.length - 14}</span>}
  </div>
);

/** The text the icon suggester reads — the brand as the reply leaves it. */
function iconSourceText(
  brand: MockBrand,
  strategyFields: ParsedStrategyField[],
  direction: string,
): string {
  const next = applyStrategyFields(brand.strategy, strategyFields);
  const answers = STRATEGY_CARDS.map((c) => contentOf(c, next)).filter(Boolean);
  return [brand.name, direction, ...answers].join(' ');
}

export function RebrandModal({
  open,
  brandName,
  brand,
  brandId,
  onClose,
  onApply,
  onRestore,
}: Props) {
  const [direction, setDirection] = useState('');
  const [text, setText] = useState('');
  const [excluded, setExcluded] = useState<Set<BrandingSectionId>>(new Set());
  /** Sections the user has flipped away from their default tick. */
  const [flipped, setFlipped] = useState<Set<BrandingSectionId>>(new Set());
  const [skippedFields, setSkippedFields] = useState<Set<string>>(new Set());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyBump, setHistoryBump] = useState(0);

  useEffect(() => {
    if (!open) return;
    setDirection('');
    setText('');
    setExcluded(new Set());
    setFlipped(new Set());
    setSkippedFields(new Set());
    setHistoryOpen(false);
    setHistoryBump((n) => n + 1);
  }, [open]);

  const asked = BRANDING_SECTIONS.filter((s) => !excluded.has(s));
  const parsed = useMemo(() => parseBrandingBrief(text), [text]);

  const hasColors = brand.colors.core.length > 0;
  const hasFonts = brand.fonts.length > 0;
  const hasIcons = brand.icons.length > 0;
  const uploadedFonts = brand.fonts.some((f) => f.files && f.files.length > 0);

  const palette = asked.includes('colors') && parsed.palette
    ? paletteToGroups(parsed.palette)
    : undefined;
  const pairing = asked.includes('fonts') ? parsed.pairing : undefined;
  const strategyFields = asked.includes('strategy') ? parsed.strategy : [];

  // Icons are computed, not parsed — from the strategy as it would be AFTER
  // this apply, so a strategy change reshapes the icon suggestions with it.
  const suggestedIcons = useMemo(() => {
    if (!asked.includes('icons')) return undefined;
    if (!text.trim() || parsed.problem) return undefined;
    if (strategyFields.length === 0 && !direction.trim()) return undefined;
    const next = suggestIconsForBrand(iconSourceText(brand, strategyFields, direction), 50);
    if (next.length === 0) return undefined;
    // An unchanged set is not a suggestion.
    if (next.length === brand.icons.length && next.every((n, i) => brand.icons[i] === n)) {
      return undefined;
    }
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asked.join(','), text, parsed, strategyFields, direction, brand]);

  // Load the offered faces so the specimen row really shows them.
  useEffect(() => {
    if (!pairing) return;
    loadFontFamily(pairing.heading);
    loadFontFamily(pairing.body);
  }, [pairing]);

  /** Replacing starts unticked; filling an empty slot starts ticked. */
  const defaultOn: Record<BrandingSectionId, boolean> = {
    colors: !hasColors,
    fonts: !hasFonts,
    strategy: true, // per-field ticks below carry the replace/fill rule
    icons: !hasIcons,
  };
  const isOn = (s: BrandingSectionId) =>
    flipped.has(s) ? !defaultOn[s] : defaultOn[s];

  const heldStrategy = useMemo(() => {
    const map = new Map<string, string>();
    for (const card of STRATEGY_CARDS) {
      const value = contentOf(card, brand.strategy).trim();
      if (value) map.set(card.key, value);
    }
    return map;
  }, [brand.strategy]);

  /** A strategy row that replaces starts unticked; one that fills starts ticked. */
  const fieldOn = (f: ParsedStrategyField) =>
    skippedFields.has(f.key) ? heldStrategy.has(f.key) : !heldStrategy.has(f.key);

  const keptFields = strategyFields.filter(fieldOn);

  const result: RebrandApply = {
    ...(direction.trim() ? { direction: direction.trim() } : {}),
    ...(palette && isOn('colors') ? { palette } : {}),
    ...(pairing && isOn('fonts') ? { pairing } : {}),
    ...(keptFields.length > 0 ? { strategy: keptFields } : {}),
    ...(suggestedIcons && isOn('icons') ? { icons: suggestedIcons } : {}),
  };
  const applyCount =
    (result.palette ? 1 : 0) +
    (result.pairing ? 1 : 0) +
    (result.strategy ? 1 : 0) +
    (result.icons ? 1 : 0);

  const toggleSection = (s: BrandingSectionId) =>
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const toggleAsk = (s: BrandingSectionId) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const toggleField = (key: string) =>
    setSkippedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const checkpoints = useMemo(
    () => (open ? listCheckpoints(brandId) : []),
    // historyBump re-reads after an apply, restore or delete.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, brandId, historyBump],
  );

  const anythingFound =
    parsed.strategy.length > 0 || parsed.palette || parsed.pairing;

  return (
    <DsModal
      open={open}
      onClose={onClose}
      title="Change your branding"
      eyebrow="Everything except the logo"
      actions={
        <>
          <DsButton tone="secondary" onClick={onClose}>
            Cancel
          </DsButton>
          <DsButton
            tone="primary"
            disabled={applyCount === 0}
            onClick={() => onApply(result)}
            data-rebrand-apply
          >
            {applyCount === 0
              ? 'Apply changes'
              : `Apply ${applyCount} change${applyCount === 1 ? '' : 's'}`}
          </DsButton>
        </>
      }
    >
      <p className="sti-hint">
        Get the prompt, run it in your own AI tool, then paste the reply here.
        Anything that would replace what you already have needs your tick first,
        and a checkpoint is saved before every apply.
      </p>

      <DsTextArea
        label="What's changing? (optional)"
        placeholder="Make it feel more premium · We're pivoting to a younger audience…"
        value={direction}
        onChange={(e) => setDirection(e.target.value)}
        rows={2}
        data-rebrand-direction
      />

      <div className="sti-row" style={{ marginTop: 12 }}>
        <span className="sti-row-label">
          Ask about
          <span className="sti-count">{asked.length} of {BRANDING_SECTIONS.length}</span>
        </span>
        <AiPromptMenu
          label="Get the prompt"
          prompt={() =>
            buildBrandingPrompt(brandName, {
              strategy: brand.strategy,
              colors: { core: brand.colors.core, accent: brand.colors.accent },
              fonts: brand.fonts,
              direction: direction.trim() || undefined,
              ask: asked,
            })
          }
        />
      </div>

      <ul className="sti-asks" data-rebrand-asks={asked.length}>
        {BRANDING_SECTIONS.map((s) => {
          const on = !excluded.has(s);
          const filled =
            s === 'colors' ? hasColors : s === 'fonts' ? hasFonts : s === 'icons' ? hasIcons : heldStrategy.size > 0;
          return (
            <li key={s}>
              <button
                type="button"
                className="sti-ask"
                aria-pressed={on}
                data-ask={s}
                data-filled={filled}
                onClick={() => toggleAsk(s)}
              >
                <span className="sti-tick sti-tick--sm" aria-hidden>
                  <CheckIcon />
                </span>
                <span className="sti-ask-name">{SECTION_NAMES[s]}</span>
                <span className="sti-ask-state">{filled ? 'set' : 'empty'}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="sti-paste">
        <span className="sti-row-label">Paste the reply</span>
        <DsTextArea
          placeholder={'Brand summary: …\nColors: #… #… #…\nFonts: Heading + Body'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          spellCheck={false}
          data-rebrand-paste
        />
      </div>

      {text.trim().length > 0 && (
        <div data-rebrand-found={anythingFound ? 1 : 0}>
          {parsed.problem === 'prompt' ? (
            <p className="sti-problem" data-problem="prompt">
              That is the prompt, not the reply. Run it in ChatGPT, Claude or
              any other AI tool first, then paste what it answers.
            </p>
          ) : parsed.problem === 'unanswered' ? (
            <p className="sti-problem" data-problem="unanswered">
              Every line still holds the instruction rather than an answer —
              this looks like the prompt, part-filled. Paste the AI's reply
              instead.
            </p>
          ) : !anythingFound ? (
            <p className="sti-hint" style={{ margin: '12px 0 0' }}>
              Nothing recognised yet. The reply should use labelled lines —
              <em> Colors: …</em>, <em>Fonts: …</em>, <em>Brand summary: …</em>
            </p>
          ) : (
            <>
              {palette && (
                <section className="rb-block" data-rebrand-block="colors" data-on={isOn('colors')}>
                  <button type="button" className="rb-block-head" aria-pressed={isOn('colors')} onClick={() => toggleSection('colors')}>
                    <span className="sti-tick" aria-hidden><CheckIcon /></span>
                    <span className="rb-block-title">Colors — whole palette</span>
                    <span className={`rb-block-flag${hasColors ? '' : ' rb-block-flag--fill'}`}>
                      {hasColors ? 'replaces current' : 'fills empty'}
                    </span>
                  </button>
                  <div className="rb-diff">
                    <div>
                      <span className="rb-col-label">Current</span>
                      {hasColors ? (
                        <Swatches colors={[...brand.colors.core, ...brand.colors.accent]} />
                      ) : (
                        <span className="sti-hint">none</span>
                      )}
                    </div>
                    <span className="rb-diff-arrow" aria-hidden>→</span>
                    <div>
                      <span className="rb-col-label">New</span>
                      <Swatches colors={[...palette.core, ...palette.accent]} />
                    </div>
                  </div>
                </section>
              )}

              {pairing && (
                <section className="rb-block" data-rebrand-block="fonts" data-on={isOn('fonts')}>
                  <button type="button" className="rb-block-head" aria-pressed={isOn('fonts')} onClick={() => toggleSection('fonts')}>
                    <span className="sti-tick" aria-hidden><CheckIcon /></span>
                    <span className="rb-block-title">Typography — whole pairing</span>
                    <span className={`rb-block-flag${hasFonts ? '' : ' rb-block-flag--fill'}`}>
                      {hasFonts ? 'replaces current' : 'fills empty'}
                    </span>
                  </button>
                  <div className="rb-diff">
                    <div>
                      <span className="rb-col-label">Current</span>
                      {hasFonts ? (
                        brand.fonts.slice(0, 2).map((f) => (
                          <div key={f.id} className="rb-face" style={{ fontFamily: `'${f.family}', ${f.fallback ?? 'sans-serif'}` }}>
                            {f.family}
                            <small>{f.role}</small>
                          </div>
                        ))
                      ) : (
                        <span className="sti-hint">none</span>
                      )}
                    </div>
                    <span className="rb-diff-arrow" aria-hidden>→</span>
                    <div>
                      <span className="rb-col-label">New</span>
                      <div className="rb-face" style={{ fontFamily: `'${pairing.heading}', serif` }}>
                        {pairing.heading}
                        <small>Display</small>
                      </div>
                      <div className="rb-face" style={{ fontFamily: `'${pairing.body}', sans-serif` }}>
                        {pairing.body}
                        <small>Text</small>
                      </div>
                    </div>
                  </div>
                  {uploadedFonts && (
                    <p className="rb-files-warning" data-rebrand-files-warning>
                      Your current typography includes uploaded font files.
                      Replacing it removes those files — a checkpoint restores
                      the pairing, not the uploaded bytes.
                    </p>
                  )}
                </section>
              )}

              {strategyFields.length > 0 && (
                <section className="rb-block" data-rebrand-block="strategy" data-on="true">
                  <div className="rb-block-head" style={{ cursor: 'default' }}>
                    <span className="rb-block-title">Brand Strategy — per answer</span>
                  </div>
                  <ul className="sti-list" style={{ marginTop: 8 }}>
                    {strategyFields.map((f) => {
                      const on = fieldOn(f);
                      const replacing = heldStrategy.get(f.key);
                      return (
                        <li key={f.key}>
                          <button type="button" className="sti-item" aria-pressed={on} data-field={f.key} onClick={() => toggleField(f.key)}>
                            <span className="sti-tick" aria-hidden><CheckIcon /></span>
                            <span className="sti-text">
                              <span className="sti-label">
                                {labelOf(f.key)}
                                {f.isOther && <span className="sti-own">own word</span>}
                              </span>
                              <span className="sti-value">{f.display}</span>
                              {replacing && (
                                <span className="sti-label sti-replacing">replaces “{replacing}”</span>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {suggestedIcons && (
                <section className="rb-block" data-rebrand-block="icons" data-on={isOn('icons')}>
                  <button type="button" className="rb-block-head" aria-pressed={isOn('icons')} onClick={() => toggleSection('icons')}>
                    <span className="sti-tick" aria-hidden><CheckIcon /></span>
                    <span className="rb-block-title">Icons — whole set, matched to the new strategy</span>
                    <span className={`rb-block-flag${hasIcons ? '' : ' rb-block-flag--fill'}`}>
                      {hasIcons ? 'replaces current' : 'fills empty'}
                    </span>
                  </button>
                  <div className="rb-diff">
                    <div>
                      <span className="rb-col-label">Current</span>
                      {hasIcons ? <IconGrid icons={brand.icons} /> : <span className="sti-hint">none</span>}
                    </div>
                    <span className="rb-diff-arrow" aria-hidden>→</span>
                    <div>
                      <span className="rb-col-label">New</span>
                      <IconGrid icons={suggestedIcons} />
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      <div className="rb-history">
        <button
          type="button"
          className="rb-history-toggle"
          aria-expanded={historyOpen}
          onClick={() => setHistoryOpen((v) => !v)}
          data-rebrand-history-toggle
        >
          Checkpoints{checkpoints.length ? ` · ${checkpoints.length}` : ''}
        </button>
        {historyOpen && (
          checkpoints.length === 0 ? (
            <p className="sti-hint" style={{ margin: '8px 0 0' }}>
              None yet — one is saved automatically before every apply.
            </p>
          ) : (
            checkpoints.map((cp) => (
              <div key={cp.id} className="rb-cp" data-checkpoint={cp.id}>
                <div className="rb-cp-head">
                  <span className="rb-cp-title">{cp.direction ?? 'Rebrand'}</span>
                  <span className="rb-cp-when">
                    {new Date(cp.at).toLocaleString()} · changed{' '}
                    {cp.applied.map((s) => SECTION_NAMES[s]).join(', ')}
                  </span>
                </div>
                <div className="rb-cp-actions">
                  <button
                    type="button"
                    className="rb-cp-restore"
                    onClick={() => {
                      onRestore(cp, [...BRANDING_SECTIONS]);
                      setHistoryBump((n) => n + 1);
                    }}
                  >
                    Restore all
                  </button>
                  {BRANDING_SECTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="rb-cp-restore"
                      data-restore-section={s}
                      onClick={() => {
                        onRestore(cp, [s]);
                        setHistoryBump((n) => n + 1);
                      }}
                    >
                      {SECTION_NAMES[s]} only
                    </button>
                  ))}
                  <button
                    type="button"
                    className="rb-cp-restore"
                    onClick={() => {
                      deleteCheckpoint(brandId, cp.id);
                      setHistoryBump((n) => n + 1);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </DsModal>
  );
}
