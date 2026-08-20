/**
 * Saved designs, as a view over the brand's folder tree.
 *
 * Loading lives here rather than in the panel because the FOLDER TILES need
 * it: a folder's item count is the count for the tab you are looking at, so
 * the page has to hold every content type's list, not just the one being
 * rendered.
 */
import * as React from 'react';
import { toast } from 'sonner';
import { useService, SERVICE_KEYS } from '@/core';
import type { DesignSummary, IDesignStorage } from '@/core/types/services';

export interface DesignLibrary {
  designs: DesignSummary[];
  loading: boolean;
  moveToFolder: (designId: string, folderId: string | null) => Promise<void>;
  remove: (designId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

function newestFirst(list: DesignSummary[]): DesignSummary[] {
  return [...list].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
}

export function useDesignLibrary(brandId: string | undefined): DesignLibrary {
  const storage = useService<IDesignStorage>(SERVICE_KEYS.DESIGN_STORAGE);
  const [designs, setDesigns] = React.useState<DesignSummary[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    if (!brandId) return;
    try {
      setDesigns(newestFirst(await storage.listDesigns(brandId)));
    } catch {
      setDesigns([]);
    }
  }, [brandId, storage]);

  React.useEffect(() => {
    if (!brandId) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const list = await storage.listDesigns(brandId);
        if (!cancelled) setDesigns(newestFirst(list));
      } catch {
        if (!cancelled) setDesigns([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brandId, storage]);

  const moveToFolder = React.useCallback(
    async (designId: string, folderId: string | null) => {
      if (!brandId) return;
      // Optimistic: filing is instant and reversible, and waiting on a round
      // trip to see a tile leave a folder makes the whole page feel remote.
      setDesigns((prev) => prev.map((d) => (d.id === designId ? { ...d, folderId } : d)));
      try {
        await storage.moveDesignToFolder(brandId, designId, folderId);
      } catch {
        toast.error("Couldn't move that design");
        await refresh();
      }
    },
    [brandId, storage, refresh],
  );

  const remove = React.useCallback(
    async (designId: string) => {
      if (!brandId) return;
      try {
        await storage.deleteDesign(brandId, designId);
        setDesigns((prev) => prev.filter((d) => d.id !== designId));
        toast.success('Design deleted');
      } catch {
        toast.error("Couldn't delete that design");
      }
    },
    [brandId, storage],
  );

  return { designs, loading, moveToFolder, remove, refresh };
}
