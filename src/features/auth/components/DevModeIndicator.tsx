import { useAutoLogin } from '../hooks/useAutoLogin';
import { Badge } from '@/components/ui/badge';

export function DevModeIndicator() {
  const { isDevelopmentMode, isAutoLogin } = useAutoLogin();

  if (!isDevelopmentMode || !isAutoLogin) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="h-8 w-8 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
        <span className="text-xs text-orange-600">🔓</span>
      </div>
    </div>
  );
}