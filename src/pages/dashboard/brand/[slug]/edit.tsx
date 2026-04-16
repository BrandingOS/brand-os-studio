/**
 * `/b/:slug/edit` is a legacy editor surface. Per the v3 brand system
 * unification (PR3), all editing moved to `/b/:slug/identity`. This
 * route now redirects so any inbound links (dashboards, Logo Maker
 * "Save to Brand", Brand Sidebar, bookmarks) still land on the
 * canonical editor.
 */
import { useParams, Navigate } from 'react-router-dom';

export default function BrandEditPage() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) return <Navigate to="/dashboard/brands" replace />;
  return <Navigate to={`/dashboard/brand/${slug}/identity`} replace />;
}
