import { describe, it, expect, beforeEach } from 'vitest';
import { ServiceContainer } from './ServiceContainer';

describe('ServiceContainer', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  it('registers and retrieves a service', () => {
    container.register('test', () => ({ value: 42 }));
    const service = container.get<{ value: number }>('test');
    expect(service.value).toBe(42);
  });

  it('returns the same singleton instance on repeated gets', () => {
    let callCount = 0;
    container.register('counter', () => ({ id: ++callCount }), true);

    const a = container.get('counter');
    const b = container.get('counter');
    expect(a).toBe(b);
    expect(callCount).toBe(1);
  });

  it('creates new instances for transient services', () => {
    let callCount = 0;
    container.register('transient', () => ({ id: ++callCount }), false);

    const a = container.get<{ id: number }>('transient');
    const b = container.get<{ id: number }>('transient');
    expect(a).not.toBe(b);
    expect(a.id).toBe(1);
    expect(b.id).toBe(2);
  });

  it('throws for unregistered services', () => {
    expect(() => container.get('nonexistent')).toThrow('Service "nonexistent" is not registered');
  });

  it('reset clears singleton instances but keeps registrations', () => {
    let callCount = 0;
    container.register('resettable', () => ({ id: ++callCount }));

    const before = container.get<{ id: number }>('resettable');
    expect(before.id).toBe(1);

    container.reset();

    const after = container.get<{ id: number }>('resettable');
    expect(after.id).toBe(2);
  });

  it('has() checks registration', () => {
    expect(container.has('missing')).toBe(false);
    container.register('present', () => ({}));
    expect(container.has('present')).toBe(true);
  });

  it('clear() removes all registrations', () => {
    container.register('a', () => ({}));
    container.register('b', () => ({}));
    container.clear();
    expect(container.has('a')).toBe(false);
    expect(container.has('b')).toBe(false);
  });
});
