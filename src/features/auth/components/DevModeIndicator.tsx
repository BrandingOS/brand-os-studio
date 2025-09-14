import { useAutoLogin } from '../hooks/useAutoLogin';
import { Badge } from '@/components/ui/badge';

export function DevModeIndicator() {
  const { isDevelopmentMode, isAutoLogin } = useAutoLogin();

  if (!isDevelopmentMode || !isAutoLogin) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
        🔓 DEV MODE - Auto Login
      </Badge>
    </div>
  );
}