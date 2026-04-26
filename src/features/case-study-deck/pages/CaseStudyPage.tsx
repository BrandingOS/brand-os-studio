/**
 * /b/:slug/case-study — the brand's case-study deck.
 *
 * Full-screen viewer. No brand shell (intentional — the deck is the chrome).
 */

import { useNavigate, useParams } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { CaseStudyViewer } from '../viewer/CaseStudyViewer';

export default function CaseStudyPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand, isLoading, error } = useBrandBySlug(slug);

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#fff' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: '#0a0a0a', color: '#fff' }}>
        <div>{error ?? 'Brand not found.'}</div>
        <button onClick={() => navigate('/dashboard')} style={{ padding: '8px 16px', borderRadius: 8, background: '#fff', color: '#000', fontWeight: 600 }}>
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <CaseStudyViewer
      brand={brand}
      onBack={() => navigate(`/b/${slug}/share?tab=exports`)}
      onOpenLiveEditor={(slideIndex) => navigate(`/b/${slug}/case-study/edit/${slideIndex}`)}
    />
  );
}
