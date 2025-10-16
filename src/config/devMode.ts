/**
 * Developer Mode Configuration
 * 
 * IMPORTANT: This should ONLY be enabled in local development.
 * Set DEV_MODE to false before deploying to production.
 */

// Main dev mode toggle - set to false for production
export const DEV_MODE = true;

// Dev user configuration
export const DEV_USER = {
  id: '12345678-1234-1234-1234-123456789012',
  email: 'hamza2007ezzat@gmail.com',
  name: 'Hamza Ezzat',
  avatar: undefined,
  plan: 'pro' as const,
  role: 'admin' as const,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date()
};

// Safety check - prevent dev mode in production
const isProduction = import.meta.env.PROD;
if (isProduction && DEV_MODE) {
  console.error('🚨 CRITICAL: Dev mode is enabled in production! This is a security risk.');
  throw new Error('Dev mode must be disabled in production builds');
}

// Log dev mode status
if (DEV_MODE) {
  console.log('🔓 DEV MODE ACTIVE');
  console.log('📦 Using localStorage for all data');
  console.log('👤 Auto-logged in as:', DEV_USER.email);
  console.log('🔑 Role:', DEV_USER.role);
}

export const isDevMode = () => DEV_MODE;
