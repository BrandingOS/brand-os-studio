/**
 * Renaming a project — one write, wherever the rename is started from.
 *
 * There are two ways in and they must not become two behaviours: the menu's
 * "Rename project", and clicking the name on the card itself. Both land here,
 * so both merge into `workspaceCard` the same way, both clear the label rather
 * than refusing an empty name, and neither ever touches `Brand.name`.
 */
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { useBrandStore } from '@/shared/store/brandStore';
import { brandCardLabel, mergeWorkspaceCard } from '@/shared/brand/workspaceCard';
import type { Brand } from '@/shared/types/brand';

export function useProjectRename(brand: Brand) {
  const updateBrand = useBrandStore((s) => s.update);
  const [saving, setSaving] = useState(false);

  const label = brandCardLabel(brand);

  const rename = useCallback(
    async (next: string): Promise<boolean> => {
      const trimmed = next.trim();
      if (trimmed === label) return true;
      setSaving(true);
      try {
        // An empty field is not an error — it is "call it what the brand is
        // called", so the label is cleared rather than the save refused.
        await updateBrand(brand.id, {
          workspaceCard: mergeWorkspaceCard(brand.workspaceCard, { label: trimmed }),
        });
        toast.success(trimmed ? 'Project renamed' : 'Project name reset', {
          description: trimmed ? `Now called “${trimmed}”.` : `Back to “${brand.name}”.`,
        });
        return true;
      } catch (err) {
        toast.error('Could not rename this project', {
          description: err instanceof Error ? err.message : 'Please try again.',
        });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [brand.id, brand.name, brand.workspaceCard, label, updateBrand],
  );

  return { label, rename, saving };
}
