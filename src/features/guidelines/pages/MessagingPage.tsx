import { PageShell, SectionLabel, PageTitle, Divider, type GuidelinePageProps } from './PageShell';

export function MessagingPage({ brand, pageNumber, totalPages, theme }: GuidelinePageProps) {
  const voice = brand.guidelines?.voiceAndTone;
  const examples = voice?.examples || [];
  const p = brand.primaryColor;

  return (
    <PageShell brand={brand} pageNumber={pageNumber} totalPages={totalPages} theme={theme}>
      <SectionLabel color={p} theme={theme}>05 — Voice & Tone</SectionLabel>
      <PageTitle theme={theme}>Messaging<br />Examples</PageTitle>

      <div className="flex-1 mt-4 space-y-3">
        {examples.length > 0 ? examples.slice(0, 3).map((ex, i) => (
          <div key={i} className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200">
              <span className="text-[8px] font-semibold uppercase tracking-wider text-gray-400">{ex.context}</span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-gray-200">
              <div className="p-3">
                <div className="flex items-center gap-1 mb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[7px] font-semibold uppercase tracking-wider text-green-600">Correct</span>
                </div>
                <p className="text-[9px] leading-relaxed text-gray-700">{ex.good}</p>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-1 mb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span className="text-[7px] font-semibold uppercase tracking-wider text-red-500">Incorrect</span>
                </div>
                <p className="text-[9px] leading-relaxed text-gray-400 line-through decoration-red-300">{ex.bad}</p>
              </div>
            </div>
          </div>
        )) : (
          <div className="rounded-lg border border-gray-200 p-6 text-center">
            <p className="text-[10px] text-gray-400">Add messaging examples in brand voice guidelines</p>
          </div>
        )}

        {brand.strategy && (
          <div className="pt-3">
            <h3 className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Positioning Statement</h3>
            <p className="text-[11px] leading-relaxed text-gray-700 italic">"{brand.strategy}"</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}

export function PhotographyPage({ brand, pageNumber, totalPages, theme }: GuidelinePageProps) {
  const p = brand.primaryColor;
  return (
    <PageShell brand={brand} dark pageNumber={pageNumber} totalPages={totalPages} theme={theme}>
      <SectionLabel color={p} theme={theme}>06 — Imagery</SectionLabel>
      <PageTitle theme={theme}>Photography<br />Direction</PageTitle>

      <div className="flex-1 grid grid-cols-2 gap-6 mt-4">
        <div className="space-y-4">
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider opacity-40 mb-1">Style</h3>
            <p className="text-[10px] leading-relaxed opacity-60">
              Natural lighting. Authentic moments. Clean composition. Avoid stock-photo clichés, staged poses, and over-processed images.
            </p>
          </div>
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider opacity-40 mb-1">Color Treatment</h3>
            <p className="text-[10px] leading-relaxed opacity-60">
              Desaturated slightly for editorial feel. Brand color overlays permitted on dark images at 20% opacity maximum.
            </p>
          </div>
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider opacity-40 mb-1">Composition</h3>
            <p className="text-[10px] leading-relaxed opacity-60">
              Rule of thirds. Generous negative space. Subject isolation. Clean backgrounds preferred.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Photo style mockups */}
          <div className="rounded-lg bg-white/5 aspect-square flex items-center justify-center">
            <span className="text-[8px] opacity-20">Photo A</span>
          </div>
          <div className="rounded-lg bg-white/5 aspect-[4/3] flex items-center justify-center">
            <span className="text-[8px] opacity-20">Photo B</span>
          </div>
          <div className="rounded-lg aspect-[4/3] flex items-center justify-center" style={{ backgroundColor: `${p}15` }}>
            <span className="text-[8px] opacity-30" style={{ color: p }}>Overlay</span>
          </div>
          <div className="rounded-lg bg-white/5 aspect-square flex items-center justify-center">
            <span className="text-[8px] opacity-20">Photo D</span>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
