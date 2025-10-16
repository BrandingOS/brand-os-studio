import { useEffect } from 'react';
import { useBrandStore } from '@/shared/store/brandStore';
import { useSessionStore } from '@/shared/store/sessionStore';
import { useNavigate } from 'react-router-dom';

export function useDashboard() {
  const navigate = useNavigate();
  const { list: brands, loadAll, isLoading, error } = useBrandStore();
  const { mode } = useSessionStore();

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleCreateBrand = () => {
    navigate('/onboarding');
  };

  const handleViewBrand = (brandId: string) => {
    const brand = brands.find(b => b.id === brandId);
    if (brand) {
      navigate(`/brand/${brand.slug}`);
    }
  };

  const canCreateMoreBrands = mode === 'user' || brands.length === 0;

  return {
    brands,
    isLoading,
    error,
    canCreateMoreBrands,
    mode,
    handleCreateBrand,
    handleViewBrand,
  };
}