// This hook is deprecated - no longer using auto-login
// Kept for backward compatibility
export const useAutoLogin = () => {
  return {
    isDevelopmentMode: false,
    isAutoLogin: false
  };
};