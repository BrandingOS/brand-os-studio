import { cloneElement, isValidElement, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  ContextMenu,
  type ContextMenuItem,
  type ContextMenuState,
} from '@/features/setup/components/ContextMenu';
// `.ctx-menu` lives in workspace.css. Importing it here means the menu looks
// right on every page that uses this component, including the ones outside
// the workspace shell (e.g. the /dashboard/brands list).
import '@/shared/styles/workspace.css';
import './brandCardMenu.css';
import { DsButton, DsConfirmDialog, DsInput, DsModal } from '@/shared/ds';
import { useBrandStore } from '@/shared/store/brandStore';
import {
  mergeWorkspaceCard,
  useBrandCardFace,
  useBrandCardPairings,
} from '@/shared/brand/workspaceCard';
import { CardCoverPopover, type CoverChange } from './CardCoverPopover';
import { useProjectRename } from './useProjectRename';
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
const CoverIcon = () => (
  <svg {...iconProps}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="m21 15-5-5L5 21" />
  </svg>
);
const CheckIcon = () => (
  <svg {...iconProps}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
/* Two arrows crossing — the universal shuffle. */
const ShuffleIcon = () => (
  <svg {...iconProps}>
    <path d="M16 3h5v5" />
    <path d="M4 20 21 3" />
    <path d="M21 16v5h-5" />
    <path d="M15 15l6 6" />
    <path d="M4 4l5 5" />
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
const MoreIcon = () => (
  <svg {...iconProps} width={16} height={16}>
    <circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

interface Props {
  brand: Brand;
  /** Where "Edit brand" goes — the caller owns URL shape (Studio vs Classic). */
  editUrl: string;
  /**
   * Where the button sits. A tall card has a free top-right corner; a list row
   * does not — its own actions are already there — so the row gives the button
   * a column at the end instead of stacking it on top of them. The MENU is the
   * same either way; only the way in moves.
   */
  placement?: 'corner' | 'end';
  /**
   * Selection, when the surface supports it. The slot is where the checkbox
   * belongs — it is the only element that wraps the card without being inside
   * the link, which a checkbox must not be.
   */
  selectable?: boolean;
  selected?: boolean;
  /** True while ANY project is selected, so every card shows where it stands. */
  selecting?: boolean;
  onToggleSelect?: (modifiers: { shift: boolean; meta: boolean }) => void;
  /** A single element (card / link). The handler is attached to it directly
   *  so no extra element lands between the slot and the card. */
  children: React.ReactElement;
}

/**
 * A dashboard card's actions — for BOTH card surfaces.
 *
 * Two ways in, on purpose. Right-click is what it always was; the `⋯` button
 * that appears on hover is what makes the actions discoverable, because a menu
 * nobody knows about is a menu nobody uses. They open the same menu, in the
 * same place, with the same items.
 *
 * The card here is a PROJECT. Rename and Delete are worded and implemented
 * against the project — the name lives on `workspaceCard.label` and the brand's
 * own `name` is never touched, which is what lets two cards hold the same
 * identity and still be told apart. The brand's real name is edited where the
 * brand is edited.
 */
export function BrandCardMenu({
  brand,
  editUrl,
  children,
  placement = 'corner',
  selectable = false,
  selected = false,
  selecting = false,
  onToggleSelect,
}: Props) {
  const navigate = useNavigate();
  const updateBrand = useBrandStore((s) => s.update);
  /** The tail of the card's own writes, so each one reads what the last left. */
  const cardWrites = useRef<Promise<unknown>>(Promise.resolve());
  const deleteBrand = useBrandStore((s) => s.delete);

  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const anchorRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const { label, rename } = useProjectRename(brand);
  /** Every logo-on-colour this brand can wear and be seen in, best first. */
  const pairings = useBrandCardPairings(brand);
  // The MEASURED face, so "where am I in that list" is asked of the same
  // numbers the list was built from. The unmeasured guess can name a different
  // logo, and the search would then miss and always restart from the head.
  const face = useBrandCardFace(brand);

  /**
   * One half of the cover, applied at once and leaving the other half alone.
   *
   * A cover is a logo on a colour, so any pick here also clears a full-bleed
   * photo: the photo IS the card while it is set, and a choice that changed
   * nothing visible would look broken. The picture itself stays in Brand
   * Assets — this is a decision about the card, not about the brand's
   * material.
   */
  const applyCoverChange = async (change: CoverChange) => {
    setBusy(true);
    try {
      await saveCard({ ...change, coverAssetId: undefined, coverUrl: undefined });
    } catch (err) {
      toast.error('Could not change the cover', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setBusy(false);
    }
  };

  const closeMenu = useCallback(() => {
    anchorRef.current?.classList.remove('is-ctx-active');
    anchorRef.current = null;
    triggerRef.current?.classList.remove('is-open');
    setMenu(null);
  }, []);

  /** One write path for every card change, so they all merge and clear alike. */
  /**
   * Read-modify-WRITE — and both halves of that are load-bearing here.
   *
   * The cover picker applies each pick as it is made, so the logo and the
   * ground arrive as two writes a moment apart. Merging into the `brand` this
   * render closed over builds the second patch from the state before the
   * first, which silently undoes it; so the read is taken live from the store.
   * And a live read is only worth taking after the previous write has landed,
   * so the writes are queued rather than fired together.
   */
  const saveCard = (change: Parameters<typeof mergeWorkspaceCard>[1]) => {
    const next = cardWrites.current
      .catch(() => {})
      .then(() => {
        const live = useBrandStore.getState().list.find((b) => b.id === brand.id) ?? brand;
        return updateBrand(brand.id, {
          workspaceCard: mergeWorkspaceCard(live.workspaceCard, change),
        });
      });
    cardWrites.current = next;
    return next;
  };

  /**
   * The next pairing that reads, wrapping at the end.
   *
   * It starts from what the card is SHOWING rather than from what it has
   * stored: a card that has never been touched stores nothing, and beginning at
   * the head of the list would then apply the answer already on screen — one
   * press that visibly does nothing, on the one control whose whole promise is
   * that pressing it changes something.
   */
  const shuffleCover = async () => {
    if (pairings.length === 0) return;
    const at = pairings.findIndex(
      (p) =>
        p.logoUrl === face.logoUrl &&
        p.coverBackground.toLowerCase() === face.background.toLowerCase(),
    );
    const next = pairings[(at + 1) % pairings.length];
    await applyCoverChange({ logoRole: next.logoRole, coverBackground: next.coverBackground });
  };

  // Same write the card's own name field performs — one behaviour, two ways in.
  const commitRename = async () => {
    setBusy(true);
    try {
      if (await rename(draftName)) setRenaming(false);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await deleteBrand(brand.id);
      toast.success('Project deleted', { description: `“${label}” was removed.` });
      setConfirmingDelete(false);
    } catch (err) {
      toast.error('Could not delete this project', {
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

  const items = (): ContextMenuItem[] => [
    // The way IN to selecting. The checkbox no longer appears on hover — a
    // control that shows up under the pointer on every card is noise on a page
    // people mostly come to to open one brand — so the menu is where the mode
    // is entered, and every other card's checkbox appears once it is.
    ...(selectable
      ? [
          {
            label: selected ? 'Deselect' : 'Select',
            icon: <CheckIcon />,
            onSelect: () => onToggleSelect?.({ shift: false, meta: false }),
          } as ContextMenuItem,
        ]
      : []),
    {
      label: 'Rename project',
      icon: <RenameIcon />,
      onSelect: () => {
        setDraftName(label);
        setRenaming(true);
      },
    },
    // The card picks its logo AND its ground by measuring the artwork, and gets
    // it right most of the time — but "by default" has to mean there is a way to
    // overrule it, and overruling only half of it never worked.
    {
      label: 'Change cover',
      icon: <CoverIcon />,
      onSelect: () => setCoverOpen(true),
    },
    // Beside it, for when the answer matters less than not having to make it:
    // step to the next pairing that reads. One offer is not a choice, so with
    // nothing else to move to the item is not there at all.
    ...(pairings.length > 1
      ? [
          {
            label: 'Shuffle cover',
            icon: <ShuffleIcon />,
            onSelect: () => void shuffleCover(),
          } as ContextMenuItem,
        ]
      : []),
    { label: 'Edit brand', icon: <EditIcon />, onSelect: () => navigate(editUrl) },
    {
      label: 'Share',
      icon: <ShareIcon />,
      // The brand's Identity page IS what gets shared — the presentation over
      // the canonical brand, which is mounted publicly from the same component.
      onSelect: () => navigate(`/b/${brand.slug}/identity`),
    },
    { label: 'Copy link', icon: <LinkIcon />, onSelect: () => void copyPublicLink() },
    {
      label: 'Delete project',
      icon: <TrashIcon />,
      destructive: true,
      onSelect: () => setConfirmingDelete(true),
    },
  ];

  const openMenu = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    anchorRef.current?.classList.remove('is-ctx-active');
    anchorRef.current = e.currentTarget;
    e.currentTarget.classList.add('is-ctx-active');
    setMenu({ x: e.clientX, y: e.clientY, items: items() });
  };

  /** The button opens the same menu, positioned off the button itself rather
   *  than the pointer — a menu that appeared under the cursor's exact pixel
   *  would sit on top of the control that summoned it. */
  const openMenuFromButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    // The card is a link. Without this the menu opens and the brand opens with
    // it, and the user never sees what they clicked.
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.classList.add('is-open');
    setMenu({ x: rect.left, y: rect.bottom + 6, items: items() });
  };

  const trigger = isValidElement(children)
    ? cloneElement(children as React.ReactElement<{ onContextMenu?: (e: React.MouseEvent<HTMLElement>) => void }>, {
        onContextMenu: openMenu,
      })
    : children;

  return (
    // `group/slot` lets a Tailwind-styled card react to hover on the SLOT, so
    // the card and its menu button behave as one thing (see brandCardMenu.css).
    <div
      className={placement === 'end' ? 'bcm-slot bcm-slot--end group/slot' : 'bcm-slot group/slot'}
      data-selected={selected ? 'true' : undefined}
      data-selecting={selecting ? 'true' : undefined}
      data-project-id={brand.id}
    >
      {trigger}

      {selectable && (
        <button
          type="button"
          className="bcm-check"
          role="checkbox"
          aria-checked={selected}
          aria-label={`Select ${label}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSelect?.({ shift: e.shiftKey, meta: e.metaKey || e.ctrlKey });
          }}
        >
          <svg {...iconProps} width={14} height={14}>
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </button>
      )}

      <button
        type="button"
        ref={triggerRef}
        className={placement === 'end' ? 'bcm-trigger bcm-trigger--end' : 'bcm-trigger'}
        aria-label={`Actions for ${label}`}
        aria-haspopup="menu"
        onClick={openMenuFromButton}
        // A card is a link, and a pointer press on the button starts the link's
        // activation before the click handler ever runs.
        onMouseDown={(e) => e.preventDefault()}
      >
        <MoreIcon />
      </button>

      {coverOpen && (
        <CardCoverPopover
          brand={brand}
          placement={placement}
          onChange={(change) => applyCoverChange(change)}
          onClose={() => setCoverOpen(false)}
        />
      )}

      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={closeMenu} />
      )}

      <DsModal
        open={renaming}
        onClose={() => !busy && setRenaming(false)}
        eyebrow="Dashboard"
        title="Rename project"
        secondaryActions={
          <DsButton
            tone="tertiary"
            size="sm"
            onClick={() => setDraftName('')}
            disabled={busy || !draftName.trim()}
          >
            Use brand name
          </DsButton>
        }
        actions={
          <>
            <DsButton tone="secondary" size="sm" onClick={() => setRenaming(false)} disabled={busy}>
              Cancel
            </DsButton>
            <DsButton tone="primary" size="sm" onClick={() => void commitRename()} disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </DsButton>
          </>
        }
      >
        <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ds-text-secondary)', margin: 0 }}>
          This is the name on your dashboard. The brand is still called “{brand.name}” everywhere
          else.
        </p>
        <DsInput
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void commitRename();
          }}
          placeholder={brand.name}
          aria-label="Project name"
        />
      </DsModal>

      <DsConfirmDialog
        open={confirmingDelete}
        title={`Delete “${label}”?`}
        description="This removes the project and everything saved in it — logos, colors, fonts and guidelines. It can’t be undone."
        confirmLabel={busy ? 'Deleting…' : 'Delete project'}
        onCancel={() => !busy && setConfirmingDelete(false)}
        onConfirm={() => !busy && void confirmDelete()}
      />
    </div>
  );
}
