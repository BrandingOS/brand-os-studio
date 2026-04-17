import { Monitor, Smartphone } from 'lucide-react';

interface DeviceFrameProps {
  value: 'desktop' | 'mobile';
  onChange: (value: 'desktop' | 'mobile') => void;
}

export function DeviceFrame({ value, onChange }: DeviceFrameProps) {
  return (
    <div className="inline-flex items-center bg-muted rounded-lg p-1">
      <button
        type="button"
        onClick={() => onChange('desktop')}
        className={`h-8 px-3 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
          value === 'desktop'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Monitor className="w-3.5 h-3.5" />
        Desktop
      </button>
      <button
        type="button"
        onClick={() => onChange('mobile')}
        className={`h-8 px-3 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
          value === 'mobile'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Smartphone className="w-3.5 h-3.5" />
        Mobile
      </button>
    </div>
  );
}
