import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Development flag - set to false to disable auto-login
const DEV_AUTO_LOGIN = false; // Disabled - use real Supabase authentication instead

export const useAutoLogin = () => {
  const [isDevelopmentMode] = useState(DEV_AUTO_LOGIN);

  useEffect(() => {
    // Auto-login is now disabled - users should log in with real credentials
    // This ensures proper Supabase session and database access
  }, []);

  return {
    isDevelopmentMode: false, // Always false now
    isAutoLogin: false
  };
};