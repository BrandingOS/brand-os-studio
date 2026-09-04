/**
 * Bento — brand-scoped page at `/b/:slug/bento`.
 *
 * A thin route: load the brand, hand it to the editor. The shell, the top bar
 * and the section nav all come from `BentoEditor`'s own `WorkspaceShell`, the
 * same as every other Studio page — this page used to render the editor
 * fullscreen, outside the application entirely.
 */
import { useParams } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { BentoEditor } from '@/features/bento/BentoEditor';

export default function BrandBentoPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand } = useBrandBySlug(slug);

  return <BentoEditor brand={brand} />;
}
