import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X, Sparkles } from 'lucide-react';

interface UpgradeBannerProps {
  requiredPlan: string;
  featureName: string;
}

export function UpgradeBanner({ requiredPlan, featureName }: UpgradeBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
      <Sparkles className="h-4 w-4 text-primary shrink-0" />
      <p className="text-sm text-foreground flex-1">
        Upgrade to <span className="font-semibold capitalize">{requiredPlan}</span> to unlock{' '}
        <span className="font-medium">{featureName}</span>
      </p>
      <Link to="/settings/plans">
        <Button size="sm" variant="default">
          Upgrade
        </Button>
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="ml-1 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
