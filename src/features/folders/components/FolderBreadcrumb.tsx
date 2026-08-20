/**
 * FolderBreadcrumb — where you are in the brand, and the way back out.
 *
 * This IS the page title. The folder tree belongs to the brand rather than to
 * a tab, so the breadcrumb stays put when you switch between Library, Designs
 * and Kit: same place, different view of what is in it.
 */
import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import type { BrandFolder } from '@/shared/types/brand';

export interface FolderBreadcrumbProps {
  /** Root → current, from `folderPath`. Empty at the root. */
  path: BrandFolder[];
  /** null navigates to the root. */
  onNavigate: (folderId: string | null) => void;
  rootLabel?: string;
}

export function FolderBreadcrumb({ path, onNavigate, rootLabel = 'Folders' }: FolderBreadcrumbProps) {
  return (
    <nav className="fl-crumbs" aria-label="Folder path">
      {path.length === 0 ? (
        <h1 className="fl-title">{rootLabel}</h1>
      ) : (
        <button type="button" className="fl-crumb fl-crumb--root" onClick={() => onNavigate(null)}>
          {rootLabel}
        </button>
      )}

      {path.map((folder, i) => {
        const last = i === path.length - 1;
        return (
          <React.Fragment key={folder.id}>
            <ChevronRight className="fl-crumb-sep" size={15} strokeWidth={1.8} aria-hidden />
            {last ? (
              <h1 className="fl-title" aria-current="page">
                {folder.name}
              </h1>
            ) : (
              <button type="button" className="fl-crumb" onClick={() => onNavigate(folder.id)}>
                {folder.name}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
