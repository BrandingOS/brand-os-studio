// Phase B port helper — Studio brand-scoped shell.
//
// The legacy /a/:slug/* tree mounts BrandRouteLayout, which provides
// BOTH the chrome (AppRail + InnerNavRail via BrandLayout) AND the
// BrandSettingsProvider context. Pages inside that tree assume the
// provider is present (Identity and Share read it via
// useBrandSettings; throws "must be used within a
// <BrandSettingsProvider>" if missing).
//
// Studio pages wrap in WorkspaceShell for chrome, but that doesn't
// supply the provider. This thin component composes both — Studio
// chrome + brand-settings context — so each Studio brand-page wrapper
// stays a one-line forward.
//
// Use this from every /b/:slug/* Studio page that wraps a legacy
// brand-page component.
import type { ReactNode } from 'react';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';
import { BrandSettingsProvider } from '@/shared/brand-settings';

export function StudioBrandShell({ children }: { children: ReactNode }) {
  return (
    <BrandSettingsProvider>
      <WorkspaceShell>{children}</WorkspaceShell>
    </BrandSettingsProvider>
  );
}
