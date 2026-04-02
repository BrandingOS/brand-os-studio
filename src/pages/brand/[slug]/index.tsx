import { useParams } from 'react-router-dom';
import { BrandDetails } from '@/features/brand';

export default function BrandDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  
  if (!slug) {
    return <div>Brand slug not found</div>;
  }
  
  return <BrandDetails brandSlug={slug} />;
}