/**
 * The brand's folder tree, as React state.
 *
 * Wraps the folder half of `IAssetsService` — which has carried
 * listFolders/createFolder/renameFolder/deleteFolder since migration 017,
 * in both the local and Supabase adapters, with no UI ever calling it. The
 * name is a historical wart: folders are brand-level and shared by Library,
 * Designs and Kit, they are not an asset concern. Read the service as the
 * transport, not as the meaning.
 *
 * Deleting a folder never deletes what is in it — items fall back to unfiled.
 * That is the service's contract and it is the right one: a folder is an
 * arrangement, and losing an arrangement should not lose the work.
 */
import * as React from 'react';
import { toast } from 'sonner';
import { useService, SERVICE_KEYS } from '@/core';
import type { IAssetsService } from '@/core/types/services';
import type { BrandFolder } from '@/shared/types/brand';
import { validateFolderName } from './folderTree';

export interface BrandFolders {
  folders: BrandFolder[];
  loading: boolean;
  /** Resolves to the new folder, or null when the name was refused. */
  create: (name: string, parentId: string | null) => Promise<BrandFolder | null>;
  rename: (id: string, name: string) => Promise<boolean>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useBrandFolders(brandId: string | undefined): BrandFolders {
  const assets = useService<IAssetsService>(SERVICE_KEYS.ASSETS);
  const [folders, setFolders] = React.useState<BrandFolder[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    if (!brandId) return;
    try {
      setFolders(await assets.listFolders(brandId));
    } catch {
      setFolders([]);
    }
  }, [brandId, assets]);

  React.useEffect(() => {
    if (!brandId) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const list = await assets.listFolders(brandId);
        if (!cancelled) setFolders(list);
      } catch {
        if (!cancelled) setFolders([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brandId, assets]);

  const create = React.useCallback(
    async (name: string, parentId: string | null) => {
      if (!brandId) return null;
      const problem = validateFolderName(name, folders, parentId);
      if (problem) {
        toast.error(problem);
        return null;
      }
      try {
        const folder = await assets.createFolder({ brandId, name: name.trim(), parentId });
        setFolders((prev) => [...prev, folder]);
        return folder;
      } catch {
        toast.error("Couldn't create the folder");
        return null;
      }
    },
    [brandId, assets, folders],
  );

  const rename = React.useCallback(
    async (id: string, name: string) => {
      const target = folders.find((f) => f.id === id);
      const problem = validateFolderName(name, folders, target?.parentId ?? null, id);
      if (problem) {
        toast.error(problem);
        return false;
      }
      try {
        const updated = await assets.renameFolder(id, name.trim());
        setFolders((prev) => prev.map((f) => (f.id === id ? updated : f)));
        return true;
      } catch {
        toast.error("Couldn't rename the folder");
        return false;
      }
    },
    [assets, folders],
  );

  const remove = React.useCallback(
    async (id: string) => {
      try {
        await assets.deleteFolder(id);
        // The service cascades to subfolders; re-read rather than guess which.
        await refresh();
      } catch {
        toast.error("Couldn't delete the folder");
      }
    },
    [assets, refresh],
  );

  return { folders, loading, create, rename, remove, refresh };
}
