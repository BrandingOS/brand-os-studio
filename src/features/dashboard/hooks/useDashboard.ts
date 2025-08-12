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
    navigate(`/brand/${brandId}`);
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