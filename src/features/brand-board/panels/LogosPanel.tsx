/**
 * LogosPanel — shows every logo slot the brand has.
 *
 * Primary, wordmark, mark, and monochrome variants each get a tile on
 * a background tuned to the variant (dark bg for white logos, etc.).
 * Missing slots render as a soft placeholder with an "Add" hint.
 */
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Wand2 } from 'lucide-react';
import { useBrandStore } from '@/shared/store/brandStore';
import { resolveBrandLogo } from '@/shared/hooks/useBrandLogo';
import type { LogoRole } from '@/shared/types/brandAssets';

interface LogoSlot {
  role: LogoRole;
  label: string;
  /** dark = place on dark background, light = place on light background */
  surface: 'light' | 'dark';
}

const SLOTS: LogoSlot[] = [
  { role: 'primary',    label: 'Primary',   surface: 'light' },
  { role: 'iconmark',   label: 'Mark',      surface: 'light' },
  { role: 'horizontal', label: 'Wordmark',  surface: 'light' },
  { role: 'mono.white', label: 'Inverse',   surface: 'dark' },
];

function LogoTile({
  slot,
  url,
  onClick,
  fallbackInitial,
  fallbackColor,
}: {
  slot: LogoSlot;
  url?: string;
  onClick?: () => void;
  fallbackInitial?: string;
  fallbackColor?: string;
}) {
  const dark = slot.surface === 'dark';
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative rounded-[20px] overflow-hidden text-left"
      style={{
        background: dark ? '#0f0f12' : '#ffffff',
        aspectRatio: '1 / 1',
        boxShadow:
          '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -12px rgba(0,0,0,0.10)',
      }}
    >
      <span
        className="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: dark ? 'rgba(255,255,255,0.55)' : 'rgba(15,15,18,0.45)' }}
      >
        {slot.label}
      </span>

      <div className="absolute inset-0 flex items-center justify-center p-6">
        {url ? (
          <img
            src={url}
            alt={slot.label}
            className="max-h-[70%] max-w-[85%] object-contain"
            style={{
              filter: dark && slot.role === 'mono.white' ? 'brightness(0) invert(1)' : undefined,
            }}
          />
        ) : fallbackInitial ? (
          <span
            className="text-3xl font-bold tracking-tight"
            style={{
              color: dark ? '#ffffff' : (fallbackColor ?? '#0f0f12'),
              fontFamily: 'var(--bb-font-heading, Inter), sans-serif',
            }}
          >
            {fallbackInitial}
          </span>
        ) : (
          <Plus className="h-5 w-5" style={{ color: dark ? 'rgba(255,255,255,0.3)' : 'rgba(15,15,18,0.25)' }} />
        )}
      </div>
    </button>
  );
}

export function LogosPanel() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const currentBrand = useBrandStore((s) => s.current);

  const tiles = useMemo(() => {
    if (!currentBrand) return SLOTS.map((s) => ({ slot: s, url: undefined as string | undefined }));
    return SLOTS.map((s) => ({
      slot: s,
      url: resolveBrandLogo(currentBrand, s.role)?.url,
    }));
  }, [currentBrand]);

  const initial = currentBrand?.name?.charAt(0).toUpperCase() ?? 'B';
  const primaryColor = currentBrand?.primaryColor;

  const goToIdentity = () => navigate(`/b/${slug}/identity?tab=logo`);
  const goToVariantStudio = () => navigate(`/b/${slug}/tools/variant-studio`);

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[22px] font-semibold tracking-tight text-foreground">Logos</h3>
        <button
          type="button"
          onClick={goToVariantStudio}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-6px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.05),0_6px_16px_-6px_rgba(0,0,0,0.12)] transition-shadow"
        >
          <Wand2 className="h-3.5 w-3.5" />
          <span>Variants</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map(({ slot, url }) => (
          <LogoTile
            key={slot.role}
            slot={slot}
            url={url}
            fallbackInitial={slot.role === 'primary' || slot.role === 'iconmark' ? initial : undefined}
            fallbackColor={primaryColor}
            onClick={goToIdentity}
          />
        ))}
      </div>
    </section>
  );
}
