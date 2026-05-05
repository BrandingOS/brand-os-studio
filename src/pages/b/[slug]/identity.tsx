// Phase B port — Identity page mounted at /b/:slug/identity (Studio).
//
// Reuses the same IdentityPage component as /a/:slug/identity (Classic).
// The page is shell-agnostic — its `useBrandPageConfig` calls become
// no-ops without BrandRouteLayout as a parent (no inner-nav rail
// renders, but the page's own Tabs (Logo/Colors/Typography/Voice/Strategy)
// remain the primary section navigation). PageHeader provides the title.
//
// Studio chrome via WorkspaceShell. Classic chrome (AppRail + InnerNavRail)
// stays at /a/:slug/identity, untouched.
import { StudioBrandShell } from './_studioBrandShell';
import IdentityPage from '@/pages/dashboard/brand/[slug]/identity';

export default function StudioIdentityPage() {
  return (
    <StudioBrandShell>
      <IdentityPage />
    </StudioBrandShell>
  );
}
