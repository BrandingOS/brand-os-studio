import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { Brand } from '@/shared/types/brand';
import { brandsService } from '@/features/brand/services/brands.local';

export default function BrandShowcasePage() {
  const { slug } = useParams<{ slug: string }>();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    brandsService.getBySlug(slug).then((b) => {
      setBrand(b);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Brand not found</h1>
          <p className="text-gray-500">This brand showcase is not available.</p>
        </div>
      </div>
    );
  }

  if (!brand.isPublic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Private Brand</h1>
          <p className="text-gray-500">This brand showcase is not publicly available.</p>
        </div>
      </div>
    );
  }

  const strategy = brand.guidelines?.strategy;
  const voiceAndTone = brand.guidelines?.voiceAndTone;
  const colorPalette = brand.guidelines?.colorPalette;
  const typography = brand.guidelines?.typography;

  const allColors = [
    colorPalette?.primary,
    colorPalette?.secondary,
    colorPalette?.accent,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section
        className="relative py-24 px-6"
        style={{ backgroundColor: brand.primaryColor }}
      >
        <div className="max-w-4xl mx-auto text-center">
          {brand.logo && (
            <img
              src={brand.logo}
              alt={`${brand.name} logo`}
              className="h-20 w-auto mx-auto mb-8 rounded-lg bg-white/10 p-2"
            />
          )}
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-sm">
            {brand.name}
          </h1>
          <p className="text-xl text-white/80">Brand Guidelines</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-16 space-y-20">
        {/* Mission, Vision & Values */}
        {strategy && (
          <section>
            <h2 className="text-3xl font-bold text-gray-900 mb-8 pb-3 border-b">
              Brand Strategy
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {strategy.mission && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Mission
                  </h3>
                  <p className="text-gray-700 text-lg leading-relaxed">
                    {strategy.mission}
                  </p>
                </div>
              )}
              {strategy.vision && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Vision
                  </h3>
                  <p className="text-gray-700 text-lg leading-relaxed">
                    {strategy.vision}
                  </p>
                </div>
              )}
            </div>

            {strategy.values && strategy.values.length > 0 && (
              <div className="mt-10">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
                  Core Values
                </h3>
                <div className="flex flex-wrap gap-3">
                  {strategy.values.map((value) => (
                    <span
                      key={value}
                      className="px-4 py-2 rounded-full text-sm font-medium border"
                      style={{
                        borderColor: brand.primaryColor,
                        color: brand.primaryColor,
                      }}
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {strategy.positioning && (
              <div className="mt-10">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Positioning
                </h3>
                <p className="text-gray-700 text-lg leading-relaxed">
                  {strategy.positioning}
                </p>
              </div>
            )}
          </section>
        )}

        {/* Color Palette */}
        {allColors.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold text-gray-900 mb-8 pb-3 border-b">
              Color Palette
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {allColors.map((color) =>
                color ? (
                  <div
                    key={color.hex}
                    className="rounded-xl overflow-hidden border shadow-sm"
                  >
                    <div
                      className="h-28"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="p-4 bg-white">
                      <p className="font-semibold text-gray-900">{color.name}</p>
                      <p className="text-sm font-mono text-gray-500 mt-1">
                        {color.hex}
                      </p>
                      {color.rgb && (
                        <p className="text-xs text-gray-400 mt-0.5">{color.rgb}</p>
                      )}
                      {color.usage && (
                        <p className="text-xs text-gray-500 mt-2">{color.usage}</p>
                      )}
                    </div>
                  </div>
                ) : null,
              )}
            </div>

            {/* Neutral palette */}
            {colorPalette?.neutral && colorPalette.neutral.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
                  Neutrals
                </h3>
                <div className="flex rounded-xl overflow-hidden border shadow-sm">
                  {colorPalette.neutral.map((c) => (
                    <div key={c.hex} className="flex-1 group relative">
                      <div
                        className="h-16"
                        style={{ backgroundColor: c.hex }}
                      />
                      <div className="text-center py-2 bg-white">
                        <p className="text-xs font-mono text-gray-500">{c.hex}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Typography */}
        {typography && (
          <section>
            <h2 className="text-3xl font-bold text-gray-900 mb-8 pb-3 border-b">
              Typography
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {typography.primary && (
                <div className="rounded-xl border p-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Primary Typeface
                  </h3>
                  <p
                    className="text-4xl font-bold text-gray-900 mb-2"
                    style={{ fontFamily: typography.primary.family }}
                  >
                    {typography.primary.family}
                  </p>
                  <p
                    className="text-lg text-gray-600 mb-4"
                    style={{ fontFamily: typography.primary.family }}
                  >
                    The quick brown fox jumps over the lazy dog
                  </p>
                  <div className="space-y-1 text-sm text-gray-500">
                    <p>
                      Weights: {typography.primary.weights.join(', ')}
                    </p>
                    <p className="text-xs">{typography.primary.usage}</p>
                  </div>
                </div>
              )}
              {typography.secondary && (
                <div className="rounded-xl border p-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Secondary Typeface
                  </h3>
                  <p
                    className="text-4xl font-bold text-gray-900 mb-2"
                    style={{ fontFamily: typography.secondary.family }}
                  >
                    {typography.secondary.family}
                  </p>
                  <p
                    className="text-lg text-gray-600 mb-4"
                    style={{ fontFamily: typography.secondary.family }}
                  >
                    The quick brown fox jumps over the lazy dog
                  </p>
                  <div className="space-y-1 text-sm text-gray-500">
                    <p>
                      Weights: {typography.secondary.weights.join(', ')}
                    </p>
                    <p className="text-xs">{typography.secondary.usage}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Voice & Tone */}
        {voiceAndTone && (
          <section>
            <h2 className="text-3xl font-bold text-gray-900 mb-8 pb-3 border-b">
              Voice & Tone
            </h2>
            {voiceAndTone.brandVoice && (
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                {voiceAndTone.brandVoice}
              </p>
            )}

            {voiceAndTone.toneAttributes &&
              voiceAndTone.toneAttributes.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Tone Attributes
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {voiceAndTone.toneAttributes.map((attr) => (
                      <span
                        key={attr}
                        className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700"
                      >
                        {attr}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {voiceAndTone.communicationStyle && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Communication Style
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {voiceAndTone.communicationStyle}
                </p>
              </div>
            )}

            {voiceAndTone.doAndDonts && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-xl border border-green-200 bg-green-50/50 p-5">
                  <h3 className="text-sm font-semibold text-green-700 mb-3">
                    Do
                  </h3>
                  <ul className="space-y-2">
                    {voiceAndTone.doAndDonts.do.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-sm text-green-800"
                      >
                        <span className="mt-0.5 shrink-0">+</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-5">
                  <h3 className="text-sm font-semibold text-red-700 mb-3">
                    Don't
                  </h3>
                  <ul className="space-y-2">
                    {voiceAndTone.doAndDonts.dont.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-sm text-red-800"
                      >
                        <span className="mt-0.5 shrink-0">-</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t py-8 px-6 text-center">
        <p className="text-sm text-gray-400">
          Powered by{' '}
          <span className="font-semibold text-gray-500">BrandOS</span>
        </p>
      </footer>
    </div>
  );
}
