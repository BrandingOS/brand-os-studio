import type { Brand } from '@/shared/types/brand';

interface BackgroundPopoverProps {
  brand: Brand;
  currentBg?: string;
  onChangeBg: (color: string) => void;
  onClose: () => void;
}

export function BackgroundPopover({ brand, currentBg, onChangeBg, onClose }: BackgroundPopoverProps) {
  const themeColors = [
    '#0A0A0F', '#1a1a1a', '#2a2a2a', '#4a4a4a', '#808080', '#ffffff',
    brand.primaryColor,
  ];

  const moreColors = [
    '#fce4ec', '#f8bbd0', '#f48fb1', '#f06292', '#ec407a', '#e91e63', '#d81b60', '#c2185b', '#ad1457', '#880e4f',
    '#fafafa', '#f5f5f5', '#eeeeee', '#e0e0e0', '#bdbdbd', '#9e9e9e', '#757575', '#616161', '#424242', '#212121',
    '#000000', '#ffffff', '#00bcd4', '#2196f3', '#4caf50', '#ffeb3b', '#ff9800', '#f44336', '#9c27b0', '#e91e63',
  ];

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Background</h3>
          <button onClick={() => { onChangeBg('#0A0A0F'); }} className="text-xs text-gray-400 hover:text-gray-600">Reset</button>
        </div>

        {/* Type selector */}
        <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white mb-3">
          <option>Color</option>
          <option>Gradient</option>
          <option>Image</option>
        </select>

        {/* Theme colors */}
        <div className="flex gap-1.5 mb-3">
          {themeColors.map(c => (
            <button
              key={c}
              onClick={() => onChangeBg(c)}
              className={`w-8 h-8 rounded-lg border-2 transition-all ${currentBg === c ? 'border-black scale-110' : 'border-gray-200 hover:border-gray-400'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <button className="w-8 h-8 rounded-lg border-2 border-gray-200" style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }} />
        </div>

        {/* More colors */}
        <details className="group">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 mb-2">More colors</summary>
          <div className="grid grid-cols-10 gap-1">
            {moreColors.map((c, i) => (
              <button
                key={i}
                onClick={() => onChangeBg(c)}
                className={`w-6 h-6 rounded border transition-all ${currentBg === c ? 'border-black scale-110' : 'border-gray-100 hover:border-gray-300'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </details>

        {/* Position */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Position</span>
            <div className="flex gap-1">
              {['fill', 'top', 'center', 'left', 'right'].map(pos => (
                <button key={pos} className="w-7 h-7 rounded border border-gray-200 hover:border-gray-400 flex items-center justify-center transition-colors">
                  <div className="w-3 h-2 bg-gray-300 rounded-sm" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
