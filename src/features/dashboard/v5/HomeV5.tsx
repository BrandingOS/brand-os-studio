/**
 * HomeV5 — the BrandOS v5 workspace home.
 *
 * Replaces the dense card-grid look of DashboardMain with a portal-style
 * landing inspired by Frontify (cover hero) + Linear (calm density).
 *
 * Sections in vertical order:
 *   1. WorkspaceHero          — branded hero with continue/create actions + ⌘K + AI
 *   2. QuickActionsRail       — 4 large action tiles (most common starts)
 *   3. ContinueSurface        — existing "resume" card (kept)
 *   4. BrandsGridV5           — premium brand cards
 *   5. RecentAssetsRow        — last touched assets across brands
 *   6. ActivityFeed (lightweight)
 *
 * See docs/ux-redesign/BRANDOS-V5-PRD.md §3.1 / Phase 1.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import { ContinueSurface } from './../components/ContinueSurface';
import { AdminPanel } from './../components/AdminPanel';
import { WorkspaceHero } from './sections/WorkspaceHero';
import { QuickActionsRail } from './sections/QuickActionsRail';
import { BrandsGridV5 } from './sections/BrandsGridV5';
import { RecentAssetsRow } from './sections/RecentAssetsRow';
import { ActivityFeed } from './sections/ActivityFeed';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HomeV5() {
  const navigate = useNavigate();
  const { brands, isLoading, error, mode, handleCreateBrand } = useDashboard();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <Activity className="mx-auto mb-3 h-10 w-10 text-destructive" />
        <h3 className="mb-2 text-lg font-semibold">Couldn't load your brands</h3>
        <p className="mb-4 text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-10 pb-10">
      {/* Admin tools — visible only to admins, kept for parity */}
      <AdminPanel />

      {/* 1. Hero */}
      <WorkspaceHero
        brandsCount={brands.length}
        onCreateBrand={handleCreateBrand}
        mode={mode}
      />

      {/* 2. Quick actions */}
      <QuickActionsRail brands={brands} onCreateBrand={handleCreateBrand} />

      {/* 3. Continue working */}
      <ContinueSurface brands={brands} />

      {/* 4. Brands grid */}
      <BrandsGridV5 brands={brands} onCreateBrand={handleCreateBrand} />

      {/* 5. Recent assets */}
      <RecentAssetsRow brands={brands} />

      {/* 6. Activity feed */}
      <ActivityFeed brands={brands} />
    </div>
  );
}
