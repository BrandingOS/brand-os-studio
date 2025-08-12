import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useOnboardingStore } from '@/shared/store/onboardingStore';
import OnboardingPage from '../app/onboarding/page';

export default function OnboardingRoute() {
  const [searchParams] = useSearchParams();
  const { setAnswer } = useOnboardingStore();
  
  useEffect(() => {
    const brandName = searchParams.get('name');
    if (brandName) {
      setAnswer('brand-name', brandName);
    }
  }, [searchParams, setAnswer]);

  return <OnboardingPage />;
}