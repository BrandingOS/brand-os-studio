import { PageShell, SectionLabel, PageTitle, type GuidelinePageProps } from './PageShell';

export function LogoSystemPage({ brand, pageNumber, totalPages }: GuidelinePageProps) {
  return (
    <PageShell brand={brand} pageNumber={pageNumber} totalPages={totalPages}>
      <SectionLabel color={brand.primaryColor}>02 — Logo System</SectionLabel>
      <PageTitle>Logo<br />System</PageTitle>

      <div className="flex-1 grid grid-cols-2 gap-4 mt-4">
        {/* Primary on white */}
        <div className="rounded-lg border border-gray-200 flex items-center justify-center p-6 bg-white">
          {brand.logo ? (
            <img src={brand.logo} alt="Primary" className="max-h-12 object-contain" />
          ) : (
            <span className="text-2xl font-bold" style={{ color: brand.primaryColor }}>{brand.name}</span>
          )}
        </div>
        {/* On brand color */}
        <div className="rounded-lg flex items-center justify-center p-6" style={{ backgroundColor: brand.primaryColor }}>
          {brand.logo ? (
            <img src={brand.logo} alt="Inverse" className="max-h-12 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
          ) : (
            <span className="text-2xl font-bold text-white">{brand.name}</span>
          )}
        </div>
        {/* On dark */}
        <div className="rounded-lg flex items-center justify-center p-6 bg-[#0A0A0F]">
          {brand.logo ? (
            <img src={brand.logo} alt="On dark" className="max-h-12 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
          ) : (
            <span className="text-2xl font-bold text-white">{brand.name}</span>
          )}
        </div>
        {/* Monochrome */}
        <div className="rounded-lg border border-gray-200 flex items-center justify-center p-6 bg-gray-50">
          {brand.logo ? (
            <img src={brand.logo} alt="Mono" className="max-h-12 object-contain" style={{ filter: 'grayscale(1) brightness(0)' }} />
          ) : (
            <span className="text-2xl font-bold text-black">{brand.name}</span>
          )}
        </div>
      </div>
    </PageShell>
  );
}

export function LogoClearSpacePage({ brand, pageNumber, totalPages }: GuidelinePageProps) {
  const logo = brand.guidelines?.logoSystem;
  return (
    <PageShell brand={brand} pageNumber={pageNumber} totalPages={totalPages}>
      <SectionLabel color={brand.primaryColor}>02 — Logo System</SectionLabel>
      <PageTitle>Clear Space<br />& Minimum Size</PageTitle>

      <div className="flex-1 grid grid-cols-2 gap-8 mt-4">
        {/* Clear space */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative border-2 border-dashed border-gray-300 p-8 rounded-lg">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-white px-2 text-[8px] text-gray-400 uppercase tracking-wider">Clear Space</div>
            {brand.logo ? (
              <img src={brand.logo} alt="" className="h-10 object-contain" />
            ) : (
              <span className="text-xl font-bold" style={{ color: brand.primaryColor }}>{brand.name}</span>
            )}
            {/* Measurement lines */}
            <div className="absolute top-2 left-2 right-2 flex justify-between">
              <div className="w-px h-3 bg-red-400" />
              <div className="w-px h-3 bg-red-400" />
            </div>
          </div>
          <p className="text-[9px] text-gray-500 mt-3 text-center max-w-[200px]">
            {logo?.clearSpace || 'Maintain a minimum clear space equal to 1× the cap height on all sides.'}
          </p>
        </div>

        {/* Minimum size */}
        <div className="flex flex-col justify-center space-y-6">
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Digital Minimum</h3>
            <div className="flex items-end gap-3">
              <div className="border border-gray-200 p-2 rounded">
                {brand.logo ? (
                  <img src={brand.logo} alt="" className="h-4 object-contain" />
                ) : (
                  <span className="text-xs font-bold" style={{ color: brand.primaryColor }}>{brand.name}</span>
                )}
              </div>
              <span className="text-[9px] text-gray-400">80px width minimum</span>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Print Minimum</h3>
            <p className="text-[10px] text-gray-500">
              {logo?.minSize || '25mm width for print applications'}
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
