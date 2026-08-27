/**
 * Moved to the shared product layer — 5 consumers across 4 features made
 * it a real shared component (and shared/editor may not import from
 * features/*). This re-export keeps every existing import site working.
 */
export { ColorPickerHSV } from '@/shared/components/ColorPickerHSV';
