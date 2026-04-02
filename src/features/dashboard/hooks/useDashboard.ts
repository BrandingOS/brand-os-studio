import { useEffect } from 'react';
import { useBrandStore } from '@/shared/store/brandStore';
import { useSessionStore } from '@/shared/store/sessionStore';
import { useNavigate } from 'react-router-dom';

export function useDashboard() {
  const navigate = useNavigate();
  const { list: brands, loadAll, isLoading, error } = useBrandStore();
  const { mode, isAuthenticated } = useSessionStore();

  useEffect(() => {
    // Only load brands after authentication state is determined
    if (mode === 'user' && !isAuthenticated) {
      console.log('[useDashboard] ⏳ Waiting for authentication...');
      return;
    }
    
    console.log('[useDashboard] 🔄 Loading brands... Mode:', mode, 'Auth:', isAuthenticated);
    loadAll().then(() => {
      console.log('[useDashboard] ✅ Brands loaded successfully');
    }).catch((err) => {
      console.error('[useDashboard] ❌ Failed to load brands:', err);
    });
  }, [loadAll, mode, isAuthenticated]);

  const handleCreateBrand = () => {
    navigate('/onboarding');
  };

  const handleViewBrand = (brandId: string) => {
    const brand = brands.find(b => b.id === brandId);
    if (brand) {
      navigate(`/dashboard/brand/${brand.slug}`);
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