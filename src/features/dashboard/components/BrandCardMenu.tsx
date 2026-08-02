import { cloneElement, isValidElement, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ContextMenu, type ContextMenuState } from '@/features/setup/components/ContextMenu';
// `.ctx-menu` lives in workspace.css. Importing it here means the menu looks
// right on every page that uses this component, including the ones outside
// the workspace shell (e.g. the /dashboard/brands list).
import '@/shared/styles/workspace.css';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Brand } from '@/shared/types/brand';

const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const RenameIcon = () => (
  <svg {...iconProps}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
const EditIcon = () => (
  <svg {...iconProps}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
  </svg>
);
const ShareIcon = () => (
  <svg {...iconProps}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);
const LinkIcon = () => (
  <svg {...iconProps}>
    <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
    <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
  </svg>
);
const TrashIcon = () => (
  <svg {...iconProps}>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6" />
  </svg>
);

interface Props {
  brand: Brand;
  /** Where "Edit" goes — the caller owns URL shape (Studio vs Classic). */
  editUrl: string;
  /** A single element (card / link). The handler is attached to it directly
   *  so no wrapper div lands in the middle of a grid or flex layout. */
  children: React.ReactElement;
}

/** Right-click actions for a brand card: rename, edit, share, delete. */
export function BrandCardMenu({ brand, editUrl, children }: Props) {
  const navigate = useNavigate();
  const updateBrand = useBrandStore((s) => s.update);
  const deleteBrand = useBrandStore((s) => s.delete);

  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(brand.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const anchorRef = useRef<HTMLElement | null>(null);

  const closeMenu = useCallback(() => {
    anchorRef.current?.classList.remove('is-ctx-active');
    anchorRef.current = null;
    setMenu(null);
  }, []);

  const commitRename = async () => {
    const next = draftName.trim();
    if (!next || next === brand.name) {
      setRenaming(false);
      return;
    }
    setBusy(true);
    try {
      await updateBrand(brand.id, { name: next });
      toast.success('Brand renamed', { description: `Now called “${next}”.` });
      setRenaming(false);
    } catch (err) {
      toast.error('Could not rename brand', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await deleteBrand(brand.id);
      toast.success('Brand deleted', { description: `“${brand.name}” was removed.` });
      setConfirmingDelete(false);
    } catch (err) {
      toast.error('Could not delete brand', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setBusy(false);
    }
  };

  const copyPublicLink = async () => {
    const url = `${window.location.origin}/brand/${brand.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied', { description: url });
    } catch {
      toast.error('Could not copy the link', { description: url });
    }
  };

  const openMenu = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    anchorRef.current?.classList.remove('is-ctx-active');
    anchorRef.current = e.currentTarget;
    e.currentTarget.classList.add('is-ctx-active');

    setMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: 'Rename',
          icon: <RenameIcon />,
          onSelect: () => {
            setDraftName(brand.name);
            setRenaming(true);
          },
        },
        { label: 'Edit brand', icon: <EditIcon />, onSelect: () => navigate(editUrl) },
        {
          label: 'Share',
          icon: <ShareIcon />,
          onSelect: () => navigate(`/b/${brand.slug}/share`),
        },
        { label: 'Copy link', icon: <LinkIcon />, onSelect: () => void copyPublicLink() },
        {
          label: 'Delete brand',
          icon: <TrashIcon />,
          destructive: true,
          onSelect: () => setConfirmingDelete(true),
        },
      ],
    });
  };

  const trigger = isValidElement(children)
    ? cloneElement(children as React.ReactElement<{ onContextMenu?: (e: React.MouseEvent<HTMLElement>) => void }>, {
        onContextMenu: openMenu,
      })
    : children;

  return (
    <>
      {trigger}

      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={closeMenu} />
      )}

      <Dialog open={renaming} onOpenChange={(open) => !busy && setRenaming(open)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename brand</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void commitRename();
            }}
            placeholder="Brand name"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenaming(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void commitRename()} disabled={busy || !draftName.trim()}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmingDelete}
        onOpenChange={(open) => !busy && setConfirmingDelete(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{brand.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the brand and everything saved in it — logos, colors, fonts and
              guidelines. It can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                // Keep the dialog up while the delete runs so the user sees the
                // busy state rather than a flash of the old list.
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={busy}
            >
              {busy ? 'Deleting…' : 'Delete brand'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
