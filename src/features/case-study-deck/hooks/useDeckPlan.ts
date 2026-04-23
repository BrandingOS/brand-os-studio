/**
 * useDeckPlan — load or generate a case-study DeckPlan for a brand.
 *
 * Returns a fully-resolved deck (plan + profile + overrides) plus mutators:
 *   - regenerate()               — re-run the director and replace the plan
 *   - setVariant(index, v)       — explicit variant swap for a slide
 *   - setOverride(index, patch)  — override headline/image/credit for a slide
 *   - toggleHidden(index)        — hide/show a slide in the export
 *   - reset()                    — drop all user overrides, back to director plan
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Brand } from '@/shared/types/brand';
import { directDeck, buildProfile } from '../director';
import type { BrandProfile, DeckPlan, SlideOverrides, SlidePick, VariantId } from '../types';
import { loadDeck, saveDeck, type StoredDeck } from '../storage';
import { SLIDE_CATALOG } from '../slides/renderer';

export interface UseDeckPlan {
  plan: DeckPlan;
  profile: BrandProfile;
  overrides: Record<number, SlideOverrides>;
  variantOverrides: Record<number, VariantId>;
  hidden: number[];
  /** The final ordered list of slides to render — picks after variant overrides. */
  slides: Array<SlidePick & { index: number; overrides?: SlideOverrides; hidden: boolean }>;
  regenerate: () => void;
  setVariant: (index: number, variant: VariantId) => void;
  setOverride: (index: number, patch: SlideOverrides) => void;
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
      setState(existing);
    } else {
      const plan = directDeck(brand);
      const fresh: StoredDeck = { plan, overrides: {}, variantOverrides: {}, hidden: [] };
      setState(fresh);
      saveDeck(brand.id, fresh);
    }
  }, [brand]);

  const profile = useMemo(() => (brand ? buildProfile(brand) : null), [brand]);

  const regenerate = useCallback(() => {
    if (!brand) return;
    const plan = directDeck(brand);
    const fresh: StoredDeck = { plan, overrides: {}, variantOverrides: {}, hidden: [] };
    setState(fresh);
    saveDeck(brand.id, fresh);
  }, [brand]);

  const setVariant = useCallback(
    (index: number, variant: VariantId) => {
      if (!brand || !state) return;
      const archetype = state.plan.slides[index]?.archetype;
      if (!archetype) return;
      const options = SLIDE_CATALOG[archetype] ?? [];
      if (!options.includes(variant)) return;
      const next: StoredDeck = {
        ...state,
        variantOverrides: { ...state.variantOverrides, [index]: variant },
      };
      setState(next);
      saveDeck(brand.id, next);
    },
    [brand, state],
  );

  const setOverride = useCallback(
    (index: number, patch: SlideOverrides) => {
      if (!brand || !state) return;
      const next: StoredDeck = {
        ...state,
        overrides: {
          ...state.overrides,
          [index]: { ...(state.overrides[index] ?? {}), ...patch },
        },
      };
      setState(next);
      saveDeck(brand.id, next);
    },
    [brand, state],
  );

  const toggleHidden = useCallback(
    (index: number) => {
      if (!brand || !state) return;
      const set = new Set(state.hidden);
      if (set.has(index)) set.delete(index);
      else set.add(index);
      const next: StoredDeck = { ...state, hidden: Array.from(set).sort((a, b) => a - b) };
      setState(next);
      saveDeck(brand.id, next);
    },
    [brand, state],
  );

  const reset = useCallback(() => {
    if (!brand || !state) return;
    const next: StoredDeck = {
      plan: state.plan,
      overrides: {},
      variantOverrides: {},
      hidden: [],
    };
    setState(next);
    saveDeck(brand.id, next);
  }, [brand, state]);

  if (!state || !profile) return null;

  const slides = state.plan.slides.map((pick, index) => ({
    archetype: pick.archetype,
    variant: (state.variantOverrides[index] ?? pick.variant) as VariantId,
    index,
    overrides: state.overrides[index],
    hidden: state.hidden.includes(index),
  }));

  return {
    plan: state.plan,
    profile,
    overrides: state.overrides,
    variantOverrides: state.variantOverrides as Record<number, VariantId>,
    hidden: state.hidden,
    slides,
    regenerate,
    setVariant,
    setOverride,
    toggleHidden,
    reset,
  };
}
