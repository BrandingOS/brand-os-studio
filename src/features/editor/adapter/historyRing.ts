/**
 * Moved to `@/shared/history`.
 *
 * `HistoryRing` was always generic — a ring buffer over `T` with no editor,
 * Fabric or document knowledge — and it is now the foundation the whole app's
 * undo/redo is built on. It had to move out of `features/` because
 * `shared/*` may never import `features/*`.
 *
 * This re-export exists so `FabricAdapter` and its tests keep working
 * unchanged. New code should import from `@/shared/history`.
 */
export {
  HistoryRing,
  MAX_HISTORY_DEFAULT,
  HISTORY_DEBOUNCE_MS_DEFAULT,
} from '@/shared/history/HistoryRing';
