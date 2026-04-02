interface RemixPanelProps {
  onClose: () => void;
}

export function RemixPanel({ onClose }: RemixPanelProps) {
  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 w-96 bg-[#222] rounded-2xl shadow-2xl border border-white/[0.06] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <p className="text-[11px] text-white/30">Text only layouts</p>
      </div>

      <div className="px-3 pb-3">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <button key={i} className="aspect-video bg-white/[0.03] rounded-lg border border-white/[0.06] hover:border-white/15 hover:bg-white/[0.06] transition-all">
              <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                {i < 3 && (
                  <>
                    <div className="w-3/4 h-1 bg-white/10 rounded" />
                    <div className="w-1/2 h-0.5 bg-white/5 rounded" />
                  </>
                )}
                {i >= 3 && i < 6 && (
                  <div className="flex gap-1 w-full px-1">
                    <div className="flex-1 h-4 bg-white/5 rounded" />
                    <div className="flex-1 h-4 bg-white/5 rounded" />
                  </div>
                )}
                {i >= 6 && (
                  <>
                    <div className="w-full h-3 bg-white/5 rounded" />
                    <div className="w-2/3 h-0.5 bg-white/5 rounded" />
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 pb-3 pt-1 border-t border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/30">Free Trial</span>
          <label className="flex items-center gap-1.5 text-[11px] text-white/30">
            Generate images
            <div className="w-7 h-3.5 rounded-full bg-white/10 relative">
              <span className="absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-white/30" />
            </div>
          </label>
        </div>
        <button className="px-3 py-1.5 rounded-lg bg-white/10 text-[11px] text-white/50 hover:text-white hover:bg-white/20 transition-colors">
          Remix
        </button>
      </div>
    </div>
  );
}
