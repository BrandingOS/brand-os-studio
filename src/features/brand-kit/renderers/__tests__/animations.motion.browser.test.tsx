/**
 * Animations — the designs actually move, and they come to rest finished.
 *
 * This is the one family whose whole promise is invisible to jsdom. Before
 * this wave the four cards were STILLS: `AnimationsExtended.tsx` declared
 * no `@keyframes` at all and its single `transitionDelay` sat on an element
 * with no transition (`.audit/CODE.md` §7). Every unit test in the repo
 * passed the entire time, because a renderer that returns markup returns
 * markup whether or not a browser would animate it.
 *
 * So the four things measured here are the four things that were wrong, and
 * one that would be worse if it went wrong:
 *
 * 1. **Every kept design animates something.** At least one element with a
 *    non-empty computed `animation-name`.
 * 2. **Every name it asks for exists.** The names are strings in a `.tsx`
 *    file and the keyframes are in a `.css` file, and CSS fails a missing
 *    `animation-name` SILENTLY — the element simply sits there, which is
 *    exactly the bug this family is being fixed for. `bka-coin` really was
 *    missing when this test was written.
 * 3. **The rest state is the finished lockup.** Every animation is paused
 *    at its last frame, so the brand's word and mark are at full opacity,
 *    untransformed and unclipped. This is not a nicety: `templateSnapshot`
 *    mounts a renderer offscreen and rasterises whatever it finds, so a
 *    design resting mid-wipe exports a logo with a bite out of it.
 * 4. **It plays where it should and only where it should** — running inside
 *    `.bk-preview-host` (the card editor) and on hover, paused everywhere
 *    else, and pinned to the end frame by `pauseAtEnd()` and by
 *    `prefers-reduced-motion`.
 *
 * The two rules that cannot be triggered from a test — `:hover` and the
 * reduced-motion media query — are asserted through the CSSOM instead of
 * pretended at. A rule that is missing from the stylesheet is the failure
 * worth catching; a rule that is present and does the wrong thing would
 * show up in the computed styles of the branches that CAN be entered,
 * because all four selectors share one declaration block.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';
// The real stylesheets. Without them the play-state rules are inert and
// every element measures as the browser's defaults.
import '@/index.css';
import '../../brand-kit.css';
import { SEED_BRANDS } from '@/data/brands';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { variantsForCard } from '../../data/legacy-mapping';
import { renderCosmosTemplate } from '../index';
import { ANIMATION_KEPT_COUNT, pauseAtEnd } from '../AnimationsExtended';

afterEach(cleanup);

const CARDS = ['Logo Reveal', 'Slide In', 'Fade', 'Rotate'] as const;
const BRAND = SEED_BRANDS[0]!;

/** Animations are square, per `PICKER_ASPECT_BY_LABEL`. */
function mountSquare(node: ReactNode): HTMLElement {
  const host = document.createElement('div');
  host.style.width = '260px';
  host.style.height = '260px';
  host.style.background = '#ffffff';
  document.body.appendChild(host);
  render(<>{node}</>, { container: host });
  return host;
}

/** Mount inside the card editor's own wrapper, where motion must run. */
function mountInPreviewHost(node: ReactNode): HTMLElement {
  const host = mountSquare(node);
  host.classList.add('bk-preview-host');
  return host;
}

/* ── Reading the rest frame ───────────────────────────────────────── */

/** `matrix(1,0,0,1,0,0)` and `rotate(360deg)`'s float dust both count. */
function isIdentityTransform(value: string): boolean {
  if (!value || value === 'none') return true;
  const nums = value.match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi)?.map(Number);
  if (!nums) return true;
  const identity =
    nums.length === 6
      ? [1, 0, 0, 1, 0, 0]
      : nums.length === 16
        ? [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
        : null;
  if (!identity) return false;
  return nums.every((n, i) => Math.abs(n - identity[i]!) < 1e-3);
}

/** Is this clip showing the whole element? */
function clipIsOpen(el: Element, value: string): boolean {
  if (!value || value === 'none') return true;
  const inset = /^inset\(([^)]*)\)/.exec(value);
  if (inset) {
    return inset[1]!
      .trim()
      .split(/\s+/)
      .filter((part) => !/round/i.test(part))
      .every((part) => Math.abs(parseFloat(part)) < 0.01);
  }
  const circle = /^circle\((\d+(?:\.\d+)?)(px|%)/.exec(value);
  if (circle) {
    const { width, height } = (el as HTMLElement).getBoundingClientRect();
    // Chrome leaves a percentage radius unresolved in the computed value,
    // so resolve it here the way the spec does: against the box's
    // "reference size", sqrt(w² + h²) / sqrt(2).
    const radius =
      circle[2] === 'px'
        ? Number(circle[1])
        : (Number(circle[1]) / 100) * (Math.hypot(width, height) / Math.SQRT2);
    // A circle covers a box once its radius reaches the farthest corner.
    return radius >= Math.hypot(width, height) / 2 - 0.5;
  }
  return false;
}

function describeEl(el: Element): string {
  const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).join('.') : '';
  return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''}`;
}

/**
 * Why `el` is not fully visible inside `root`, or null if it is.
 *
 * Walks the whole chain because a design hides its lockup by animating an
 * ANCESTOR — the wipe clips a layer, the panel slides a wrapper, the
 * dissolve fades a parent. Reading the text node's own style alone would
 * declare every one of them finished.
 */
function hiddenReason(el: Element, root: Element): string | null {
  let node: Element | null = el;
  while (node) {
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return `${describeEl(node)} is ${style.display === 'none' ? 'display:none' : 'hidden'}`;
    }
    if (Number(style.opacity) < 0.99) {
      return `${describeEl(node)} rests at opacity ${style.opacity}`;
    }
    if (!isIdentityTransform(style.transform)) {
      return `${describeEl(node)} rests at transform ${style.transform}`;
    }
    if (!clipIsOpen(node, style.clipPath)) {
      return `${describeEl(node)} rests clipped to ${style.clipPath}`;
    }
    if (node === root) return null;
    node = node.parentElement;
  }
  return null;
}

/* ── Reading the stylesheet ───────────────────────────────────────── */

type Rules = { keyframes: Set<string>; selectors: string[]; mediaSelectors: string[] };

function readSheets(): Rules {
  const keyframes = new Set<string>();
  const selectors: string[] = [];
  const mediaSelectors: string[] = [];
  const walk = (list: CSSRuleList, media: string | null) => {
    for (const rule of Array.from(list)) {
      if (rule instanceof CSSKeyframesRule) keyframes.add(rule.name);
      else if (rule instanceof CSSStyleRule) {
        (media ? mediaSelectors : selectors).push(rule.selectorText);
      } else if (rule instanceof CSSMediaRule) {
        walk(rule.cssRules, rule.conditionText);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walk(sheet.cssRules, null);
    } catch {
      // A cross-origin sheet cannot be read. Ours are all local.
    }
  }
  return { keyframes, selectors, mediaSelectors };
}

/* ── The sweep ────────────────────────────────────────────────────── */

describe('animations — the designs move', () => {
  it('has ten kept designs on every card', () => {
    for (const label of CARDS) {
      expect(variantsForCard('animations', label, mockBrand), label).toHaveLength(
        ANIMATION_KEPT_COUNT,
      );
    }
  });

  for (const label of CARDS) {
    for (const template of variantsForCard('animations', label, mockBrand)) {
      it(`${label} · ${template.name} animates, and every keyframe it names exists`, () => {
        const host = mountSquare(
          renderCosmosTemplate(template, BRAND, mockBrand, undefined),
        );
        const animated = Array.from(host.querySelectorAll('.bka-anim'));
        expect(animated.length, `${template.id} declares no animated layer`).toBeGreaterThan(0);

        const { keyframes } = readSheets();
        const names = animated
          .map((el) => getComputedStyle(el).animationName)
          .filter((n) => n && n !== 'none');
        expect(names.length, `${template.id} has .bka-anim with no animation-name`).toBe(
          animated.length,
        );
        for (const name of names) {
          // A missing @keyframes fails silently — the element just sits
          // there, which is the exact bug this family is being fixed for.
          expect(keyframes.has(name), `${template.id} names @keyframes ${name}, which does not exist`).toBe(true);
        }
      });

      it(`${label} · ${template.name} rests on the finished lockup`, () => {
        const host = mountSquare(
          renderCosmosTemplate(template, BRAND, mockBrand, undefined),
        );
        const stage = host.querySelector('.bka-stage')!;
        expect(stage, template.id).toBeTruthy();

        const word = host.querySelector('[data-bind="text"]')!;
        expect(word, `${template.id} renders no bound word`).toBeTruthy();
        expect(hiddenReason(word, stage), template.id).toBeNull();
        const rect = (word as HTMLElement).getBoundingClientRect();
        expect(rect.width, `${template.id} rests with a zero-width word`).toBeGreaterThan(0);
        expect(rect.height, `${template.id} rests with a zero-height word`).toBeGreaterThan(0);

        // The mark travels on its own layer in two designs; when the brand
        // has one it must arrive with the word, not a beat behind it.
        const mark = host.querySelector('.bka-mark');
        if (mark) expect(hiddenReason(mark, stage), `${template.id} mark`).toBeNull();

        // Every animation, not just the lockup's, is parked at its end.
        for (const el of Array.from(host.querySelectorAll('.bka-anim'))) {
          const style = getComputedStyle(el);
          expect(style.animationPlayState, `${template.id} ${describeEl(el)}`).toBe('paused');
          expect(parseFloat(style.animationDelay), `${template.id} ${describeEl(el)}`).toBeLessThan(0);
        }
      });
    }
  }
});

describe('animations — where the motion runs', () => {
  const first = variantsForCard('animations', 'Logo Reveal', mockBrand)[0]!;

  it('runs inside the card editor’s preview host', () => {
    const host = mountInPreviewHost(
      renderCosmosTemplate(first, BRAND, mockBrand, undefined),
    );
    const animated = Array.from(host.querySelectorAll('.bka-anim'));
    expect(animated.length).toBeGreaterThan(0);
    for (const el of animated) {
      expect(getComputedStyle(el).animationPlayState).toBe('running');
    }
  });

  it('starts on hover in the drilldown', () => {
    // `:hover` cannot be forced from script, so the assertion is that the
    // rule exists at all — it shares one declaration block with the
    // preview-host branch above, which IS measured.
    const { selectors } = readSheets();
    expect(selectors).toContain(
      '.bka-stage:hover .bka-anim, .bka-stage:focus-within .bka-anim, .bk-preview-host .bka-stage .bka-anim',
    );
  });

  it('honours the content’s own duration and loop', () => {
    const host = mountInPreviewHost(
      renderCosmosTemplate(first, BRAND, mockBrand, {
        kind: 'motion',
        text: 'Nuworld',
        durationMs: 2400,
        loop: true,
      }),
    );
    const el = host.querySelector('.bka-anim')!;
    const style = getComputedStyle(el);
    expect(style.animationDuration).toBe('2.4s');
    expect(style.animationIterationCount).toBe('infinite');
    // The number and the loop state are readable on the card, and both are
    // editable regions rather than captions.
    expect(host.querySelector('[data-bind="durationMs"]')!.textContent).toBe('2400');
    expect(host.querySelector('[data-bind="loop"]')!.textContent).toBe('Loop');
  });

  it('stops looping when the content says once', () => {
    const host = mountInPreviewHost(
      renderCosmosTemplate(first, BRAND, mockBrand, {
        kind: 'motion',
        text: 'Nuworld',
        durationMs: 900,
        loop: false,
      }),
    );
    const style = getComputedStyle(host.querySelector('.bka-anim')!);
    expect(style.animationDuration).toBe('0.9s');
    expect(style.animationIterationCount).toBe('1');
    expect(host.querySelector('[data-bind="loop"]')!.textContent).toBe('Once');
  });

  it('pauseAtEnd freezes a LIVE host on its last frame', () => {
    // The card editor's own Download rasterises the playing preview. Every
    // other export path mounts offscreen, where the rest state already is
    // the last frame; this is the one that has to be told.
    const host = mountInPreviewHost(
      renderCosmosTemplate(first, BRAND, mockBrand, undefined),
    );
    expect(getComputedStyle(host.querySelector('.bka-anim')!).animationPlayState).toBe('running');

    pauseAtEnd(host);

    const stage = host.querySelector('.bka-stage')!;
    for (const el of Array.from(host.querySelectorAll('.bka-anim'))) {
      expect(getComputedStyle(el).animationPlayState).toBe('paused');
    }
    expect(hiddenReason(host.querySelector('[data-bind="text"]')!, stage)).toBeNull();
  });

  it('pauseAtEnd is safe on nothing, and on a root that is the stage', () => {
    expect(() => pauseAtEnd(null)).not.toThrow();
    expect(() => pauseAtEnd(undefined)).not.toThrow();
    const host = mountSquare(renderCosmosTemplate(first, BRAND, mockBrand, undefined));
    const stage = host.querySelector('.bka-stage') as HTMLElement;
    pauseAtEnd(stage);
    pauseAtEnd(stage);
    expect(stage.getAttribute('data-anim-frame')).toBe('end');
  });

  it('shows the end frame to anyone who asked for less motion', () => {
    const { mediaSelectors } = readSheets();
    expect(mediaSelectors).toContain(
      '.bka-stage .bka-anim, .bka-stage:hover .bka-anim, .bka-stage:focus-within .bka-anim, .bk-preview-host .bka-stage .bka-anim',
    );
  });
});
