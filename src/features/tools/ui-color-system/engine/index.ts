/**
 * Re-export of the engine so that tool-internal code can import from a
 * single path without reaching into `src/lib/color-engine` directly.
 * The engine itself stays pure and framework-free.
 */
export * from '@/lib/color-engine';
