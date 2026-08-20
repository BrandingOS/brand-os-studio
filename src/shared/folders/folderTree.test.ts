import { describe, expect, it } from 'vitest';
import type { BrandFolder } from '@/shared/types/brand';
import {
  buildFolderTree,
  childrenOf,
  countByFolder,
  descendantIds,
  folderPath,
  isNameTaken,
  validateFolderName,
} from './folderTree';

function folder(id: string, name: string, parentId: string | null = null): BrandFolder {
  return {
    id,
    brandId: 'b1',
    name,
    parentId,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
}

/** Campaigns → Summer Launch → Assets, plus a sibling root. */
const tree = [
  folder('campaigns', 'Campaigns'),
  folder('summer', 'Summer Launch', 'campaigns'),
  folder('shots', 'Shots', 'summer'),
  folder('print', 'Print'),
];

describe('buildFolderTree', () => {
  it('nests children under their parent, sorted by name', () => {
    const roots = buildFolderTree(tree);
    expect(roots.map((n) => n.folder.name)).toEqual(['Campaigns', 'Print']);
    expect(roots[0].children[0].folder.name).toBe('Summer Launch');
    expect(roots[0].children[0].children[0].folder.name).toBe('Shots');
  });

  it('sorts numerically, so Q2 comes before Q10', () => {
    const roots = buildFolderTree([folder('a', 'Q10'), folder('b', 'Q2')]);
    expect(roots.map((n) => n.folder.name)).toEqual(['Q2', 'Q10']);
  });

  it('surfaces an orphan as a root rather than dropping it', () => {
    // Local deleteFolder can leave a dangling parent behind. A folder the
    // user cannot reach is indistinguishable from one that was lost.
    const roots = buildFolderTree([folder('lost', 'Lost', 'gone')]);
    expect(roots.map((n) => n.folder.name)).toEqual(['Lost']);
  });

  it('terminates on a cycle instead of recursing forever', () => {
    const cyclic = [folder('a', 'A', 'b'), folder('b', 'B', 'a')];
    expect(() => buildFolderTree(cyclic)).not.toThrow();
  });
});

describe('folderPath', () => {
  it('reads root → folder for the breadcrumb', () => {
    expect(folderPath(tree, 'shots').map((f) => f.name)).toEqual([
      'Campaigns',
      'Summer Launch',
      'Shots',
    ]);
  });

  it('is empty for the root and for an id that no longer exists', () => {
    // An unreadable ?folder= in the URL must land at the root, never throw.
    expect(folderPath(tree, null)).toEqual([]);
    expect(folderPath(tree, 'deleted-elsewhere')).toEqual([]);
  });

  it('truncates a cycle rather than hanging', () => {
    const cyclic = [folder('a', 'A', 'b'), folder('b', 'B', 'a')];
    expect(folderPath(cyclic, 'a').length).toBeLessThanOrEqual(2);
  });
});

describe('childrenOf', () => {
  it('lists the root when asked for null', () => {
    expect(childrenOf(tree, null).map((f) => f.name)).toEqual(['Campaigns', 'Print']);
  });

  it('lists direct children only', () => {
    expect(childrenOf(tree, 'campaigns').map((f) => f.name)).toEqual(['Summer Launch']);
  });
});

describe('descendantIds', () => {
  it('includes the folder itself and everything beneath it', () => {
    expect([...descendantIds(tree, 'campaigns')].sort()).toEqual(['campaigns', 'shots', 'summer']);
  });

  it('is just the folder when it is a leaf', () => {
    expect([...descendantIds(tree, 'print')]).toEqual(['print']);
  });
});

describe('naming', () => {
  it('refuses a duplicate among siblings, case-insensitively', () => {
    expect(isNameTaken(tree, 'campaigns', 'summer launch')).toBe(true);
    expect(isNameTaken(tree, null, 'Summer Launch')).toBe(false);
  });

  it('lets a folder keep its own name when renaming', () => {
    expect(validateFolderName('Summer Launch', tree, 'campaigns', 'summer')).toBeNull();
  });

  it('rejects blank and over-long names', () => {
    expect(validateFolderName('   ', tree, null)).toBeTruthy();
    expect(validateFolderName('x'.repeat(61), tree, null)).toBeTruthy();
  });

  it('reports the clash before the write, not as a 23505', () => {
    expect(validateFolderName('Print', tree, null)).toBe('A folder here already has that name.');
  });
});

describe('countByFolder', () => {
  it('rolls descendants up, so a parent never reads 0 over a full subtree', () => {
    const counts = countByFolder(tree, [
      { folderId: 'shots' },
      { folderId: 'shots' },
      { folderId: 'summer' },
      { folderId: null },
      {},
    ]);
    expect(counts.get('shots')).toBe(2);
    expect(counts.get('summer')).toBe(3);
    expect(counts.get('campaigns')).toBe(3);
    expect(counts.get('print')).toBe(0);
  });

  it('counts any content type — the tree does not know what an item is', () => {
    const counts = countByFolder(tree, [{ folderId: 'print' }, { folderId: 'print' }]);
    expect(counts.get('print')).toBe(2);
  });
});
