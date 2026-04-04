import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BrandLayout } from '@/features/brand/components/BrandLayout';
import { SocialMediaDesigner } from '@/features/social-media';
import { PageLoader } from '@/shared/design-system/Feedback';
import { services } from '@/shared/services/registry';
import type { Brand } from '@/shared/types/brand';

export default function SocialMediaPage() {
  const { slug } = useParams<{ slug: string }>();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      services.brands.getBySlug(slug).then((b) => {
        setBrand(b);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [slug]);

  if (loading) return <BrandLayout><PageLoader text="Loading brand..." /></BrandLayout>;
  if (!brand) return <BrandLayout><div className="text-center py-20 text-muted-foreground">Brand not found</div></BrandLayout>;

  return (
    <BrandLayout brandName={brand.name}>
      <SocialMediaDesigner brand={brand} />
    </BrandLayout>
  );
}
