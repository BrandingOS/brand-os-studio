import { useParams } from 'react-router-dom';
import DesignCosmosPage from '@/features/design-cosmos/DesignCosmosPage';
import { useBrandFromSlug } from '@/shared/hooks/useBrandFromSlug';

/**
 * Brand-scoped Design tab at /b/:slug/design.
 *
 * This is the v2 launchpad — a single surface that links out to every
 * fullscreen editor (Blank Canvas / AI Design / Design-with-AI /
 * Presentations / Social Media) plus inline quick-links for Content and
 * Templates. The actual canvas surfaces keep their existing fullscreen
 * routes and are intentionally NOT pulled into the Cosmos shell.
 *
 * The `key={slug}` force-remounts the launchpad when the user switches
 * brands so scroll position / active-section resets cleanly.
 */
export default function BrandDesignTabPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand, isLoading, error } = useBrandFromSlug(slug);

  return (
    <DesignCosmosPage
      key={slug}
      slug={slug ?? ''}
      brand={brand}
      isLoading={isLoading}
      error={error}
    />
  );
}
