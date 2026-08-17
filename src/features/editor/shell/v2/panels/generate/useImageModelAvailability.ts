// Capabilities + availability, fetched once per page load.
//
// Everything the picker and the composer render comes from here: which models
// exist, which are unlocked on this deployment, and exactly what each can do.
// Nothing is assumed locally — before the answer arrives the UI falls back to
// PENDING_CAPS, which promises nothing optional.

import { useEffect, useState } from 'react';
import { fetchImageCapabilities, type ImageCapabilities, type ImageModelAvailability, type ImageModelCaps } from '@/features/image-generation';
import { AUTO_MODEL_ID, capsFrom, displayFor } from '@/features/editor/ai/imageModels';

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
        available: m.available, tier: m.tier, caps: m.caps,
      };
    })
    .filter((m): m is PickerModel => m !== null)
    // Available first, then the display order the registry declares.
    .sort((a, b) => Number(b.available) - Number(a.available));
}

export function capsForSelection(state: CapabilityState, modelId: string): ImageModelCaps {
  return capsFrom(state.models, modelId, state.auto);
}

export function isSelectable(state: CapabilityState, modelId: string): boolean {
  if (modelId === AUTO_MODEL_ID) return true;
  const m = state.models.find((x) => x.id === modelId);
  return m ? m.available : false;
}
