/**
 * Service Registry — compatibility bridge.
 *
 * This file bridges the old `services.brands.xxx()` pattern
 * to the new ServiceContainer architecture.
 *
 * MIGRATION PATH:
 * 1. Old code: import { services } from '@/shared/services/registry'
 * 2. New code: import { useService, SERVICE_KEYS } from '@/core'
 *
 * Once all consumers are migrated, this file can be deleted.
 */

import { container } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS, type IBrandsService } from '@/core/types/services';

export interface Services {
  brands: IBrandsService;
}

export const services: Services = {
  get brands(): IBrandsService {
    return container.get<IBrandsService>(SERVICE_KEYS.BRANDS);
  },
};

/** @deprecated Use container.get() or useService() instead */
export function createServices(): Services {
  return services;
}
