import SetupPage from '@/features/setup/SetupPage';

/**
 * Brand-scoped Setup tab at /b/:slug/setup.
 *
 * SetupPage already renders inside CosmosWorkspaceShell. The shell
 * auto-detects the /b/:slug/* prefix and builds brand-scoped tabs from
 * it, so the 5-tab nav will route correctly between sibling tabs
 * without SetupPage itself needing to know anything about slug.
 *
 * Brand data is currently seeded from mockBrand.ts inside SetupPage —
 * wiring it to the real brand from the URL slug is tracked as a
 * follow-up (see docs/ux-v2/PLAN.md §1.2).
 */
export default function BrandSetupPage() {
  return <SetupPage />;
}
