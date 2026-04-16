import { useContext } from 'react';
import {
  BrandSettingsContext,
  type BrandSettingsContextValue,
} from './BrandSettingsProvider';

/**
 * Access the Brand Settings dialog controls.
 * Throws if used outside of `<BrandSettingsProvider>`.
 */
export function useBrandSettings(): BrandSettingsContextValue {
  const ctx = useContext(BrandSettingsContext);
  if (!ctx) {
    throw new Error(
      'useBrandSettings must be used within a <BrandSettingsProvider>',
    );
  }
  return ctx;
}

/**
 * Safe variant -- returns `null` when outside the provider.
 * Useful in editor tools that may render outside the brand scope.
 */
export function useBrandSettingsSafe(): BrandSettingsContextValue | null {
  return useContext(BrandSettingsContext);
}
