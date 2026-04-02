import { PageShell, type GuidelinePageProps } from './PageShell';

export function CoverPage({ brand, pageNumber, totalPages, theme }: GuidelinePageProps) {
  return (
    <PageShell brand={brand} dark pageNumber={pageNumber} totalPages={totalPages} theme={theme}>
      <div className="flex-1 flex flex-col justify-between">
        {/* Logo */}
        <div>
          {brand.logo ? (
            <img src={brand.logo} alt="" className="h-8 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
          ) : (
            <span className="text-lg font-bold opacity-60">{brand.name}</span>
          )}
        </div>

        {/* Title */}
        <div>
          <h1 className="text-[clamp(36px,5vw,72px)] font-bold leading-[1.05] mb-3">
            Brand<br />Guidelines
          </h1>
          <p className="text-[clamp(11px,1.1vw,15px)] opacity-40">
            Version 2.0 — {new Date().getFullYear()} — Confidential
          </p>
        </div>

        {/* Accent */}
        <div className="flex items-end justify-between">
          <div className="flex gap-2">
            <div className="w-8 h-1 rounded-full" style={{ backgroundColor: brand.primaryColor }} />
            {brand.secondaryColor && <div className="w-4 h-1 rounded-full" style={{ backgroundColor: brand.secondaryColor }} />}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
