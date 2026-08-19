// Capabilities + availability, fetched once per page load.
//
// Everything the picker and the composer render comes from here: which models
// exist, which are unlocked on this deployment, and exactly what each can do.
// Nothing is assumed locally — before the answer arrives the UI falls back to
// PENDING_CAPS, which promises nothing optional.

import { useEffect, useState } from 'react';
import { fetchImageCapabilities, type ImageCapabilities, type ImageModelAvailability, type ImageModelCaps } from '@/features/image-generation';
import { AUTO_MODEL_ID, IMAGE_MODEL_DISPLAY, capsFrom, displayFor } from '@/features/editor/ai/imageModels';

export interface CapabilityState {
  capabilities: ImageCapabilities | null;
  models: ImageModelAvailability[];
  auto: string;
  loaded: boolean;
  error: string | null;
}

export function useImageCapabilities(): CapabilityState {
  const [state, setState] = useState<CapabilityState>({
    capabilities: null, models: [], auto: '', loaded: false, error: null,
  });

  useEffect(() => {
    let alive = true;
    fetchImageCapabilities()
      .then((capabilities) => {
        if (!alive) return;
        setState({
          capabilities,
          models: capabilities.models,
          auto: capabilities.auto,
          loaded: true,
          error: null,
        });
      })
      .catch((err: Error) => {
        if (!alive) return;
        setState({
          capabilities: null, models: [], auto: '', loaded: true,
          error: err.message || 'Could not load the model list.',
        });
      });
    return () => { alive = false; };
  }, []);

  return state;
}

/** Models offered in the picker, in display order, with availability attached. */
export interface PickerModel {
  id: string;
  label: string;
  short: string;
  hint: string;
  available: boolean;
  tier: 'free' | 'paid';
  group: 'production' | 'test';
  caps: ImageModelCaps;
}

export function pickerModels(state: CapabilityState, currentId: string): PickerModel[] {
  return state.models
    .map((m) => {
      const d = displayFor(m.id);
      if (!d) return null;
      if (!d.listed && m.id !== currentId) return null;
      return {
        id: m.id, label: d.label, short: d.short, hint: d.hint,
        available: m.available, tier: m.tier, group: d.group, caps: m.caps,
      };
    })
    .filter((m): m is PickerModel => m !== null)
    // Registry order is quality order, and it must survive: sorting only by
    // availability once let a free test model sit above GPT Image, which is
    // how a user ends up generating brand work on a model that cannot set
    // type. Production before test, then declaration order, then availability.
    .sort((a, b) => {
      const grp = Number(a.group === 'test') - Number(b.group === 'test');
      if (grp) return grp;
      const avail = Number(b.available) - Number(a.available);
      if (avail) return avail;
      return order(a.id) - order(b.id);
    });
}

const order = (id: string) => {
  const i = IMAGE_MODEL_DISPLAY.findIndex((m) => m.id === id);
  return i < 0 ? 999 : i;
};

export function capsForSelection(state: CapabilityState, modelId: string): ImageModelCaps {
  return capsFrom(state.models, modelId, state.auto);
}

export function isSelectable(state: CapabilityState, modelId: string): boolean {
  if (modelId === AUTO_MODEL_ID) return true;
  const m = state.models.find((x) => x.id === modelId);
  return m ? m.available : false;
}
