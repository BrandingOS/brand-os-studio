// ModelPicker — text-first model selection driven entirely by the server's
// capability response.
//
// Deliberately plain: no provider logos, no roadmap of models that do not work.
// A model the deployment has not enabled is simply not offered, so the list is
// always honest. Under Advanced, because "Auto" is the right answer for almost
// everyone.

import { Sparkles } from 'lucide-react';
import { AUTO_MODEL_ID, displayFor } from '@/features/editor/ai/imageModels';
import { TallSelect } from './TallSelect';
import { pickerModels, type CapabilityState } from './useImageModelAvailability';

export function ModelPicker({
  state, value, onChange, disabled,
}: {
  state: CapabilityState;
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const models = pickerModels(state, value);
  const active = value === AUTO_MODEL_ID ? undefined : displayFor(value);
  const autoTarget = displayFor(state.auto);
  const anyAvailable = models.some((m) => m.available);
  const degraded = state.capabilities?.autoDegraded === true;

  // The section label rides on the FIRST item of each group, so the list can
  // stay one flat array while still reading as two clearly separated shelves.
  let lastGroup: string | null = null;
  const sectioned = models.map((m) => {
    const sectionLabel = m.group !== lastGroup
      ? (m.group === 'production' ? 'Production models' : 'Test models — lower quality')
      : undefined;
    lastGroup = m.group;
    return { ...m, sectionLabel };
  });

  return (
    <TallSelect
      caption="Model"
      icon={<Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--text-secondary)' }} aria-hidden />}
      value={value}
      valueLabel={active ? active.short : 'Auto'}
      valueHint={active
        ? active.hint
        : degraded
          ? 'No production model is enabled — Auto fell back to a test model'
          : autoTarget ? `Auto picks ${autoTarget.label}` : 'Picks the best available model'}
      onChange={(v) => {
        if (v === AUTO_MODEL_ID) { onChange(v); return; }
        if (models.find((m) => m.id === v)?.available) onChange(v);
      }}
      disabled={disabled || !state.loaded}
      title="Model"
      unavailableLabel="Off"
      items={[
        {
          value: AUTO_MODEL_ID,
          label: autoTarget ? `Auto · ${autoTarget.label}` : 'Auto',
          trailing: degraded ? 'Degraded' : 'Recommended',
          renderIcon: (cn) => <Sparkles className={cn} style={{ color: 'var(--accent)' }} aria-hidden />,
          available: anyAvailable || !state.loaded,
        },
        ...sectioned.map((m) => ({
          value: m.id,
          label: m.label,
          trailing: m.available ? (m.tier === 'free' ? 'Free' : undefined) : undefined,
          renderIcon: () => null,
          available: m.available,
          unavailableHint: 'Not enabled on this deployment',
          sectionLabel: m.sectionLabel,
        })),
      ]}
    />
  );
}
