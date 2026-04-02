/**
 * useService — React hook for accessing services from the DI container.
 *
 * Usage:
 *   const brandsService = useService<IBrandsService>(SERVICE_KEYS.BRANDS);
 *
 * This replaces direct imports of service implementations,
 * making components testable and decoupled from data access.
 */

import { container } from '../container/ServiceContainer';

export function useService<T>(key: string): T {
  return container.get<T>(key);
}
