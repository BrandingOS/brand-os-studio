import React from 'react';
import type { DeviceMode } from '../store/useBrandBoardStore';

interface DeviceFrameProps {
  device: DeviceMode;
  children: React.ReactNode;
}

export function DeviceFrame({ device, children }: DeviceFrameProps) {
  if (device === 'mobile') {
    return (
      <div className="flex justify-center py-6">
        <div
          className="max-w-[375px] w-full rounded-[2.5rem] border-[8px] border-neutral-800 bg-neutral-800 shadow-2xl overflow-hidden"
          style={{ minHeight: 667 }}
        >
          {/* Notch */}
          <div className="flex justify-center py-1 bg-neutral-800">
            <div className="w-28 h-5 rounded-full bg-neutral-900" />
          </div>
          <div className="overflow-y-auto bg-white" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  if (device === 'tablet') {
    return (
      <div className="flex justify-center py-4">
        <div className="max-w-[768px] w-full rounded-2xl border-[6px] border-neutral-300 shadow-xl overflow-hidden">
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Desktop — full width, no frame decoration
  return (
    <div className="w-full overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
      {children}
    </div>
  );
}
