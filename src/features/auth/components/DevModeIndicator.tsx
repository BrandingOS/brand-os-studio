import { useAutoLogin } from '../hooks/useAutoLogin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DEV_USER } from '@/config/devMode';

export function DevModeIndicator() {
  const { isDevelopmentMode, isAutoLogin } = useAutoLogin();

  if (!isDevelopmentMode || !isAutoLogin) {
    return null;
  }

  const clearDevData = () => {
    if (confirm('Clear all localStorage data? This will remove brands and onboarding data.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
      <div className="bg-orange-500/10 backdrop-blur-sm border border-orange-500/20 rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🔓</span>
          <div className="text-sm">
            <div className="font-semibold text-orange-600">DEV MODE</div>
            <div className="text-xs text-orange-600/80">Using localStorage</div>
          </div>
        </div>
        <div className="text-xs text-orange-600/70 mb-2">
          Logged in as: {DEV_USER.email}
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={clearDevData}
          className="w-full text-xs border-orange-500/20 hover:bg-orange-500/20"
        >
          Clear Dev Data
        </Button>
      </div>
    </div>
  );
}