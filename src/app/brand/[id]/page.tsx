import { useParams } from 'react-router-dom';
import { BrandDetails } from '@/features/brand';

export default function BrandDetailPage() {
  const { id } = useParams<{ id: string }>();
  
  if (!id) {
    return <div>Brand ID not found</div>;
  }
  
  return <BrandDetails brandId={id} />;
}