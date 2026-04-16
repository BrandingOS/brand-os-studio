/**
 * BrandSettingsHub — compact brand summary card.
 *
 * Shows a read-only overview of the brand's identity (logo, colors, fonts,
 * tone, audience) with a prominent "Edit Brand Settings" button that opens
 * the centralized Brand Settings Dialog.
 *
 * The editing form that previously lived here has been moved into the
 * BrandSettingsDialog. This component is now purely a display surface.
 */
import * as React from 'react';
import { Settings } from 'lucide-react';
import { useBrandStore } from '@/shared/store/brandStore';
import { resolveBrandLogo } from '@/shared/hooks/useBrandLogo';
import { useBrandSettings } from '@/shared/brand-settings';

export interface BrandSettingsHubProps {
  /** When true, renders without the outer card shell so it can sit inside another card. */
  bare?: boolean;
}

export function BrandSettingsHub({ bare = false }: BrandSettingsHubProps) {
  const current = useBrandStore((s) => s.current);
  const { openSettings } = useBrandSettings();

  if (!current) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Loading brand...
      </div>
    );
  }

  const resolvedLogo = resolveBrandLogo(current, 'primary')?.url ?? current.logo ?? '';
  const primaryColor = current.primaryColor ?? '#7c3aed';
  const secondaryColor = current.secondaryColor;
  const fontPrimary = current.fonts?.primary ?? 'Inter';
  const fontSecondary = current.fonts?.secondary;
  const tone = current.tone;
  const audience = current.audience;
  const brandName = current.name ?? 'Untitled';
  const slug = current.slug ?? '';

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    bare ? <>{children}</> : <div className="rounded-2xl border border-border bg-card">{children}</div>;

  return (
    <Wrapper>
      <div className="p-6 space-y-5">
        {/* Identity row */}
        <div className="flex items-center gap-4">
          {/* Logo thumbnail */}
          <div className="flex-shrink-0 w-12 h-12 rounded-xl border border-border bg-card overflow-hidden flex items-center justify-center">
            {resolvedLogo ? (
              <img src={resolvedLogo} alt={brandName} className="max-h-[80%] max-w-[80%] object-contain" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-lg font-bold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {brandName[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-foreground truncate">{brandName}</h3>
            {slug && <p className="text-xs text-muted-foreground truncate">/{slug}</p>}
          </div>
        </div>

        {/* Color swatches */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Colors</span>
          <div className="flex items-center gap-1.5">
            <div
              className="w-5 h-5 rounded-full border border-border"
              style={{ backgroundColor: primaryColor }}
              title={`Primary: ${primaryColor}`}
            />
            {secondaryColor && (
              <div
                className="w-5 h-5 rounded-full border border-border"
                style={{ backgroundColor: secondaryColor }}
                title={`Secondary: ${secondaryColor}`}
              />
            )}
          </div>
        </div>

        {/* Font names */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Fonts</span>
          <span className="text-xs text-foreground">{fontPrimary}{fontSecondary ? ` / ${fontSecondary}` : ''}</span>
        </div>

        {/* Tone + audience */}
        {(tone || audience) && (
          <div className="space-y-1.5">
            {tone && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Tone</span>
                <span className="text-xs text-foreground truncate">{tone}</span>
              </div>
            )}
            {audience && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Audience</span>
                <span className="text-xs text-foreground truncate">{audience}</span>
              </div>
            )}
          </div>
        )}

        {/* Edit button */}
        <button
          type="button"
          onClick={openSettings}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted/50 hover:border-primary/40"
        >
          <Settings className="h-4 w-4" />
          Edit Brand Settings
        </button>
      </div>
    </Wrapper>
  );
}
