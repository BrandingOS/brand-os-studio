// ModelPicker — registry-driven model dropdown with server availability.
// Unavailable (missing key) models stay visible, dimmed, with the exact
// secret to add in the tooltip — the owner sees how to unlock, the user
// sees the roadmap.

import { AUTO_MODEL_ID, IMAGE_MODEL_INFOS, findImageModelInfo } from '@/features/editor/ai/imageModels';
import { isModelSelectable, useImageModelAvailability } from './useImageModelAvailability';
import { AutoBadge, badgeFor } from './modelBadges';
import { TallSelect } from './TallSelect';

export function ModelPicker({
  value, onChange, disabled,
}: { value: string; onChange: (id: string) => void; disabled?: boolean }) {
  const { byId, auto, loaded } = useImageModelAvailability();
  const active = value === AUTO_MODEL_ID ? undefined : findImageModelInfo(value);
  const autoInfo = findImageModelInfo(auto);
  const Badge = active ? badgeFor(active.vendor, active.id) : AutoBadge;
  const listed = IMAGE_MODEL_INFOS.filter((m) => m.listed || m.id === value);

  return (
    <TallSelect
      caption="Model"
      icon={<Badge className="h-3.5 w-3.5" />}
      value={value}
      valueLabel={active ? active.short : 'Auto'}
      valueHint={active ? active.hint : `Auto → ${autoInfo?.label ?? auto}`}
      onChange={(v) => {
        if (v === AUTO_MODEL_ID) { onChange(v); return; }
        const info = findImageModelInfo(v);
        if (info && isModelSelectable(info, byId, loaded)) onChange(v);
      }}
      disabled={disabled}
      title="Model"
      unavailableLabel="Add key"
      items={[
        {
          value: AUTO_MODEL_ID,
          label: `Auto${autoInfo ? ` · ${autoInfo.label}` : ''}`,
          trailing: undefined,
          renderIcon: (cn) => <AutoBadge className={cn} />,
          available: true,
        },
        ...listed.map((m) => {
          const B = badgeFor(m.vendor, m.id);
          const ok = isModelSelectable(m, byId, loaded);
          return {
            value: m.id,
            label: m.label,
            trailing: ok ? (m.tier === 'free' ? 'Free' : m.hint) : undefined,
            renderIcon: (cn: string) => <B className={cn} />,
            available: ok,
            unavailableHint: m.keyEnv ? `Set ${m.keyEnv} as a Supabase secret to enable` : 'Not configured',
          };
        }),
      ]}
    />
  );
}
