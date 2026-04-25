/**
 * useDeckPlan — load or generate a case-study DeckPlan for a brand.
 *
 * Returns a fully-resolved deck (plan + profile + overrides) plus mutators:
 *   - regenerate()                    — re-run the director and replace the plan
 *   - setVariant(index, v)            — explicit variant swap for a slide
 *   - setOverride(index, patch)       — override headline/image/credit for a slide
 *   - setStyle(styleId)               — change the deck-wide style (template)
 *   - setSlideStyle(index, styleId?)  — override style for a single slide; pass undefined to revert to deck default
 *   - toggleHidden(index)             — hide/show a slide in the export
 *   - reset()                         — drop all user overrides, back to director plan
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Brand } from '@/shared/types/brand';
import { directDeck, buildProfile } from '../director';
import type {
  BrandProfile,
  DeckPlan,
  DeckStyleId,
  SlideOverrides,
  SlidePick,
  VariantId,
} from '../types';
import { loadDeck, saveDeck, type StoredDeck } from '../storage';
import { SLIDE_CATALOG } from '../slides/renderer';
import { STYLES } from '../styles';

export interface ResolvedSlide extends SlidePick {
  index: number;
  overrides?: SlideOverrides;
  hidden: boolean;
  /** The style this slide will render with (deck style or per-slide override). */
  styleId: DeckStyleId;
  /** True if this slide has its own style override (i.e. ≠ deck default). */
  hasStyleOverride: boolean;
}

export interface UseDeckPlan {
  plan: DeckPlan;
  profile: BrandProfile;
  overrides: Record<number, SlideOverrides>;
  variantOverrides: Record<number, VariantId>;
  slideStyles: Record<number, DeckStyleId>;
  hidden: number[];
  /** The final ordered list of slides to render. */
  slides: ResolvedSlide[];
  regenerate: () => void;
  setVariant: (index: number, variant: VariantId) => void;
  setOverride: (index: number, patch: SlideOverrides) => void;
  setStyle: (styleId: DeckStyleId) => void;
  setSlideStyle: (index: number, styleId: DeckStyleId | undefined) => void;
  toggleHidden: (index: number) => void;
  reset: () => void;
}

export function useDeckPlan(brand: Brand | null | undefined): UseDeckPlan | null {
  const [state, setState] = useState<StoredDeck | null>(null);

  useEffect(() => {
    if (!brand) {
      setState(null);
      return;
    }
    const existing = loadDeck(brand.id);
    if (existing && existing.plan.brandId === brand.id) {
      // Migrate older stored decks that predate the style system.
      const plan = existing.plan;
      if (!plan.style || !STYLES[plan.style]) {
        plan.style = directDeck(brand).style;
      }
      setState({ ...existing, slideStyles: existing.slideStyles ?? {} });
    } else {
      const plan = directDeck(brand);
      const fresh: StoredDeck = {
        plan,
        overrides: {},
        variantOverrides: {},
        slideStyles: {},
        hidden: [],
      };
      setState(fresh);
      saveDeck(brand.id, fresh);
    }
  }, [brand]);

  const profile = useMemo(() => (brand ? buildProfile(brand) : null), [brand]);

  const persist = useCallback(
    (next: StoredDeck) => {
      if (!brand) return;
      setState(next);
      saveDeck(brand.id, next);
    },
    [brand],
  );

  const regenerate = useCallback(() => {
    if (!brand) return;
    const plan = directDeck(brand);
    const fresh: StoredDeck = {
      plan,
      overrides: {},
      variantOverrides: {},
      slideStyles: {},
      hidden: [],
    };
    persist(fresh);
  }, [brand, persist]);

  const setVariant = useCallback(
    (index: number, variant: VariantId) => {
      if (!state) return;
      const archetype = state.plan.slides[index]?.archetype;
      if (!archetype) return;
      const options = SLIDE_CATALOG[archetype] ?? [];
      if (!options.includes(variant)) return;
      persist({
        ...state,
        variantOverrides: { ...state.variantOverrides, [index]: variant },
      });
    },
    [state, persist],
  );

  const setOverride = useCallback(
    (index: number, patch: SlideOverrides) => {
      if (!state) return;
      persist({
        ...state,
        overrides: {
          ...state.overrides,
          [index]: { ...(state.overrides[index] ?? {}), ...patch },
        },
      });
    },
    [state, persist],
  );

  const setStyle = useCallback(
    (styleId: DeckStyleId) => {
      if (!state || !STYLES[styleId]) return;
      persist({
        ...state,
        plan: { ...state.plan, style: styleId },
      });
    },
    [state, persist],
  );

  const setSlideStyle = useCallback(
    (index: number, styleId: DeckStyleId | undefined) => {
      if (!state) return;
      const next = { ...(state.slideStyles ?? {}) };
      if (styleId && STYLES[styleId]) {
        next[index] = styleId;
      } else {
        delete next[index];
      }
      persist({ ...state, slideStyles: next });
    },
    [state, persist],
  );

  const toggleHidden = useCallback(
    (index: number) => {
      if (!state) return;
      const set = new Set(state.hidden);
      if (set.has(index)) set.delete(index);
      else set.add(index);
      persist({ ...state, hidden: Array.from(set).sort((a, b) => a - b) });
    },
    [state, persist],
  );

  const reset = useCallback(() => {
    if (!state) return;
    persist({
      plan: state.plan,
      overrides: {},
      variantOverrides: {},
      slideStyles: {},
      hidden: [],
    });
  }, [state, persist]);

  if (!state || !profile) return null;

  const deckStyle = state.plan.style;
  const slideStyles = state.slideStyles ?? {};

  const slides: ResolvedSlide[] = state.plan.slides.map((pick, index) => {
    const override = slideStyles[index];
    return {
      archetype: pick.archetype,
      variant: (state.variantOverrides[index] ?? pick.variant) as VariantId,
      index,
      overrides: state.overrides[index],
      hidden: state.hidden.includes(index),
      styleId: override ?? deckStyle,
      hasStyleOverride: Boolean(override),
    };
  });

  return {
    plan: state.plan,
    profile,
    overrides: state.overrides,
    variantOverrides: state.variantOverrides as Record<number, VariantId>,
    slideStyles: slideStyles as Record<number, DeckStyleId>,
    hidden: state.hidden,
    slides,
    regenerate,
    setVariant,
    setOverride,
    setStyle,
    setSlideStyle,
    toggleHidden,
    reset,
  };
}
