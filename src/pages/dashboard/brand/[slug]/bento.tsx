/**
 * Bento Grid — brand-scoped page.
 *
 * Fullscreen editor (no brand shell), same pattern as design-ai.tsx.
 * Uses the shared BentoEditor; this page is a thin wrapper that loads
 * the brand.
 */
import { useParams } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { BentoEditor } from '@/features/bento/BentoEditor';

export default function BrandBentoPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand } = useBrandBySlug(slug);

  return <BentoEditor brand={brand} backTo={`/b/${slug ?? ''}`} />;
}
