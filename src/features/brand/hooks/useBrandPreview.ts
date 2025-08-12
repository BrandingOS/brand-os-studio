import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { useBrandStore } from '@/shared/store/brandStore';
import type { CreateBrandInput } from '@/shared/types/brand';

export function useBrandPreview() {
  const location = useLocation();
  const navigate = useNavigate();
  const { answers, isComplete } = useOnboardingStore();
  const { create: createBrand, current: currentBrand } = useBrandStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<CreateBrandInput>>({});

  // Get brand data from either onboarding answers or current brand
  const brandData = currentBrand || {
    name: answers['brand-name'] || 'Untitled Brand',
    logo: answers['logo-upload'],
    primaryColor: answers['primary-color'] || '#000000',
    secondaryColor: answers['secondary-color'],
    fonts: {
      primary: answers['primary-font'] || 'Inter',
      secondary: answers['secondary-font'],
    },
    tone: answers['tone'] || 'Professional',
    audience: answers['audience'] || 'General',
  };

  const previewData = isEditing ? { ...brandData, ...editedData } : brandData;

  useEffect(() => {
    // If no brand data and not from onboarding, redirect to onboarding
    if (!currentBrand && !isComplete && Object.keys(answers).length === 0) {
      navigate('/onboarding');
    }
  }, [currentBrand, isComplete, answers, navigate]);

  const handleEdit = (field: string, value: any) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      if (currentBrand) {
        // Update existing brand
        const { update } = useBrandStore.getState();
        await update(currentBrand.id, editedData);
      } else {
        // Create new brand from preview
        const brandInput: CreateBrandInput = {
          name: previewData.name || 'Untitled Brand',
          logo: previewData.logo,
          primaryColor: previewData.primaryColor || '#000000',
          secondaryColor: previewData.secondaryColor,
          fonts: previewData.fonts || { primary: 'Inter' },
          tone: previewData.tone || 'Professional',
          audience: previewData.audience || 'General',
        };
        await createBrand(brandInput);
      }
      setIsEditing(false);
      setEditedData({});
    } catch (error) {
      console.error('Failed to save brand:', error);
      alert('Failed to save brand. Please try again.');
    }
  };

  const handleContinue = () => {
    navigate('/dashboard');
  };

  const handleBackToOnboarding = () => {
    navigate('/onboarding');
  };

  return {
    brandData: previewData,
    isEditing,
    setIsEditing,
    handleEdit,
    handleSave,
    handleContinue,
    handleBackToOnboarding,
    isSaved: !!currentBrand,
  };
}