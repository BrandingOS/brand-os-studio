/**
 * A project's name, edited where it is read.
 *
 * The name on the card is the thing a user wants to change, so the name on the
 * card is what they click. Going through a menu to reach a dialog to edit the
 * text that is already on screen and already looks like a field is a detour
 * everyone has to learn once. The menu item stays — it is how you discover the
 * action exists — but it is no longer the only way.
 *
 * The card is a LINK, which is the whole difficulty: a click that starts an
 * edit must not also open the brand, and a text field inside an anchor must not
 * hand its keystrokes to the link. Both are handled here, once, for every
 * surface that shows a project name.
 */
import { useEffect, useRef, useState } from 'react';

import { useProjectRename } from './useProjectRename';
import type { Brand } from '@/shared/types/brand';
import './brandCardMenu.css';

interface Props {
  brand: Brand;
  /** Element to render when not editing — the surface owns its own type. */
  as?: 'h3' | 'span' | 'div';
  className?: string;
}

export function ProjectName({ brand, as: Tag = 'h3', className }: Props) {
  const { label, rename, saving } = useProjectRename(brand);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);
  // A blur caused by Escape must not also save. Without this the cancel path
  // and the commit path both fire and the cancel loses.
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!editing) setDraft(label);
  }, [editing, label]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const start = (e: React.MouseEvent) => {
    // The card around this is a link. Both halves are needed: prevent the
    // navigation, and stop the card's own handlers from seeing the click.
    e.preventDefault();
    e.stopPropagation();
    cancelledRef.current = false;
    setDraft(label);
    setEditing(true);
  };

  const commit = async () => {
    if (cancelledRef.current) return;
    const ok = await rename(draft);
    if (ok) setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={['bcm-name-input', className ?? ''].join(' ').trim()}
        value={draft}
        disabled={saving}
        aria-label="Project name"
        placeholder={brand.name}
        onChange={(e) => setDraft(e.target.value)}
        // Inside a link, every one of these would otherwise reach the anchor.
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            e.preventDefault();
            void commit();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            cancelledRef.current = true;
            setEditing(false);
          }
        }}
        onBlur={() => void commit()}
      />
    );
  }

  return (
    <Tag
      className={['bcm-name', className ?? ''].join(' ').trim()}
      onClick={start}
      title="Click to rename this project"
    >
      {label}
    </Tag>
  );
}
