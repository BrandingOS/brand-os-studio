/**
 * Service Container — lightweight dependency injection for BrandOS.
 *
 * Usage:
 *   container.register('brands', () => new LocalBrandsService());
 *   const brands = container.get<BrandsService>('brands');
 *
 * This replaces the old registry.ts singleton pattern with a proper
 * DI container that:
 * - Separates service creation from service consumption
 * - Supports singleton and transient lifetimes
 * - Can be reset for testing
 * - Does not create circular dependencies
 */

type Factory<T> = () => T;

interface Registration<T> {
  factory: Factory<T>;
  singleton: boolean;
  instance?: T;
}

export class ServiceContainer {
  private registrations = new Map<string, Registration<unknown>>();

  /**
   * Register a service factory.
   * @param singleton If true, the factory is called once and the result cached.
   */
  register<T>(key: string, factory: Factory<T>, singleton = true): this {
    this.registrations.set(key, { factory, singleton });
    return this;
  }

  /**
   * Get a service by key. Throws if not registered.
   */
  get<T>(key: string): T {
    const reg = this.registrations.get(key);
    if (!reg) {
      throw new Error(`[ServiceContainer] Service "${key}" is not registered.`);
    }

    if (reg.singleton) {
      if (!reg.instance) {
        reg.instance = reg.factory();
      }
      return reg.instance as T;
    }

    return reg.factory() as T;
  }

  /**
   * Check if a service is registered.
   */
  has(key: string): boolean {
    return this.registrations.has(key);
  }

  /**
   * Reset all singleton instances (useful for testing).
   */
  reset(): void {
    for (const [, reg] of this.registrations) {
      reg.instance = undefined;
    }
  }

  /**
   * Clear all registrations entirely.
   */
  clear(): void {
    this.registrations.clear();
  }
}

/** Global app container — configured at boot in main.tsx */
export const container = new ServiceContainer();
