import { useFeatureIndicatorStore } from '@/shared/store/featureIndicatorStore';

interface NewBadgeProps {
  featureId: string;
}

export function NewBadge({ featureId }: NewBadgeProps) {
  const isNew = useFeatureIndicatorStore((s) => s.isNew(featureId));

  if (!isNew) return null;

  return (
    <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
    </span>
  );
}
