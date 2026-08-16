/**
 * ContinueSurface — "Continue editing X" card on the workspace home.
 *
 * Implements User Flow F6 (USER-FLOWS.md): when Riley returns to the app,
 * the workspace home shows the most-recently-edited brand front-and-centre
 * with a single "Resume" action.
 *
 * No new tracking — uses the brand's existing `updatedAt` field. The
 * brand with the most recent updatedAt wins. If no brands exist, the
 * surface is hidden (the empty-state CTA in DashboardMain handles that).
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import { BrandAvatar } from '@/shared/brand/BrandAvatar';

interface ContinueSurfaceProps {
  brands: Brand[];
}

function getUpdatedTime(brand: Brand): number {
  const u = brand.updatedAt;
  if (!u) return 0;
  // updatedAt may be a Date or an ISO string depending on storage backend.
  if (u instanceof Date) return u.getTime();
  const t = new Date(u as unknown as string).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function formatRelative(ts: number): string {
  if (!ts) return 'recently';
  const delta = Date.now() - ts;
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function ContinueSurface({ brands }: ContinueSurfaceProps) {
  const navigate = useNavigate();

  const mostRecent = useMemo(() => {
    if (brands.length === 0) return null;
    return [...brands].sort((a, b) => getUpdatedTime(b) - getUpdatedTime(a))[0];
  }, [brands]);

  if (!mostRecent) return null;

  const updatedTs = getUpdatedTime(mostRecent);

  return (
    <Card
      onClick={() => navigate(`/b/${mostRecent.slug}`)}
      className="group relative overflow-hidden p-6 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5 bg-gradient-to-br from-background to-muted/40"
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-primary" />

      <div className="flex items-center gap-5">
        <BrandAvatar brand={mostRecent} size={64} radius={12} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground mb-1">
            <Clock className="w-3 h-3" />
            <span>Continue where you left off</span>
          </div>
          <h2 className="text-xl font-bold truncate">{mostRecent.name}</h2>
          <p className="text-sm text-muted-foreground">
            {mostRecent.tone || 'Brand'} · edited {formatRelative(updatedTs)}
          </p>
        </div>

        <Button className="gap-2 shrink-0 group-hover:gap-3 transition-all">
          Resume
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
