import type { Typescale } from '@/shared/types/typescale';
export function serializeJson(t: Typescale): string {
  return JSON.stringify(t, null, 2);
}
