import { PageShell, SectionLabel, PageTitle, type GuidelinePageProps } from './PageShell';

export function BusinessCardPage({ brand, pageNumber, totalPages }: GuidelinePageProps) {
  const p = brand.primaryColor;
  return (
    <PageShell brand={brand} pageNumber={pageNumber} totalPages={totalPages}>
      <SectionLabel color={p}>07 — Applications</SectionLabel>
      <PageTitle>Business<br />Cards</PageTitle>

      <div className="flex-1 flex items-center justify-center gap-6 mt-2">
        {/* Front */}
        <div className="w-[45%] aspect-[1.75/1] bg-white rounded-lg shadow-lg border border-gray-100 p-[6%] flex flex-col justify-between">
          {brand.logo ? (
            <img src={brand.logo} alt="" className="h-4 object-contain self-start" />
          ) : (
            <span className="text-[10px] font-bold" style={{ color: p }}>{brand.name}</span>
          )}
          <div>
            <p className="text-[9px] font-semibold text-gray-800">Jane Smith</p>
            <p className="text-[7px]" style={{ color: p }}>Brand Manager</p>
            <div className="mt-1.5 space-y-[1px]">
              <p className="text-[6px] text-gray-500">+1 234 56789</p>
              <p className="text-[6px] text-gray-500">jane@{brand.name.toLowerCase()}.com</p>
            </div>
          </div>
        </div>

        {/* Back */}
        <div className="w-[45%] aspect-[1.75/1] rounded-lg shadow-lg flex items-center justify-center" style={{ backgroundColor: p }}>
          {brand.logo ? (
            <img src={brand.logo} alt="" className="h-6 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
          ) : (
            <span className="text-lg font-bold text-white">{brand.name}</span>
          )}
        </div>
      </div>
    </PageShell>
  );
}

export function SocialMediaPage({ brand, pageNumber, totalPages }: GuidelinePageProps) {
  const p = brand.primaryColor;
  return (
    <PageShell brand={brand} dark pageNumber={pageNumber} totalPages={totalPages}>
      <SectionLabel color={p}>07 — Applications</SectionLabel>
      <PageTitle>Social<br />Media</PageTitle>

      <div className="flex-1 grid grid-cols-3 gap-3 mt-4">
        {/* Profile */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: p }}>
            {brand.logo ? (
              <img src={brand.logo} alt="" className="w-8 h-8 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
            ) : (
              <span className="text-xl font-bold text-white">{brand.name.charAt(0)}</span>
            )}
          </div>
          <p className="text-[8px] opacity-40 mt-2">Profile Picture</p>
        </div>

        {/* Post */}
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: p }}>
          <div className="aspect-square p-3 flex flex-col justify-between">
            {brand.logo && <img src={brand.logo} alt="" className="h-3 object-contain self-start" style={{ filter: 'brightness(0) invert(1)' }} />}
            <p className="text-[8px] text-white font-semibold leading-tight">Your headline goes here</p>
          </div>
        </div>

        {/* Story */}
        <div className="rounded-lg overflow-hidden bg-gradient-to-b" style={{ background: `linear-gradient(180deg, ${p}, #0A0A0F)` }}>
          <div className="aspect-[9/16] p-3 flex flex-col justify-between max-h-[140px]">
            {brand.logo && <img src={brand.logo} alt="" className="h-2.5 object-contain self-start" style={{ filter: 'brightness(0) invert(1)' }} />}
            <p className="text-[7px] text-white font-bold leading-tight">Story<br />Content</p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export function ClosingPage({ brand, pageNumber, totalPages }: GuidelinePageProps) {
  return (
    <PageShell brand={brand} brandColor pageNumber={pageNumber} totalPages={totalPages}>
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {brand.logo ? (
          <img src={brand.logo} alt="" className="h-12 object-contain mb-4" style={{ filter: 'brightness(0) invert(1)' }} />
        ) : (
          <span className="text-4xl font-bold text-white mb-4">{brand.name}</span>
        )}
        <p className="text-[clamp(10px,1.1vw,14px)] text-white/60">
          Thank you
        </p>
        <p className="text-[clamp(8px,0.8vw,11px)] text-white/30 mt-1">
          {brand.name} Brand Guidelines — {new Date().getFullYear()}
        </p>
      </div>
    </PageShell>
  );
}
