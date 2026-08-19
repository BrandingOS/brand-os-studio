/**
 * Mounting the Brand Board must never cost the user unsaved work.
 *
 * The board's draft lives in memory only — what survives a reload is
 * whatever was saved back onto the brand. That makes `initFromBrand` a
 * destructive call: it replaces the draft AND clears undo history. It was
 * the only way to initialise, and both the board editor and (now) the
 * Brand Kit's embedded board need "a draft for this brand to exist" on
 * mount. Two surfaces on one brand meant the second one to mount silently
 * threw away the first one's edits.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useBrandBoardStore } from './useBrandBoardStore';

const brandA = { id: 'brand-a', name: 'Alpha', primaryColor: '#112233' };
const brandB = { id: 'brand-b', name: 'Beta', primaryColor: '#445566' };

beforeEach(() => {
  useBrandBoardStore.setState({ initializedForBrandId: null });
  useBrandBoardStore.getState().initFromBrand(brandA);
});

describe('ensureInitFromBrand', () => {
  it('initialises when the store holds no draft for this brand', () => {
    useBrandBoardStore.setState({ initializedForBrandId: null });
    useBrandBoardStore.getState().ensureInitFromBrand(brandA);

    expect(useBrandBoardStore.getState().initializedForBrandId).toBe('brand-a');
    expect(useBrandBoardStore.getState().draft.brandName).toBe('Alpha');
  });

  it('leaves an in-progress draft for the SAME brand completely alone', () => {
    // The user has been editing — a colour changed and there is undo
    // history behind it.
    useBrandBoardStore.getState().setColor('primary', '#ff0000');
    const before = useBrandBoardStore.getState();
    expect(before.draft.colors.primary).toBe('#ff0000');
    expect(before.history.length).toBeGreaterThan(0);

    // A second surface mounts on the same brand.
    useBrandBoardStore.getState().ensureInitFromBrand(brandA);

    const after = useBrandBoardStore.getState();
    expect(after.draft.colors.primary).toBe('#ff0000');
    expect(after.history.length).toBe(before.history.length);
    expect(after.draft).toBe(before.draft);
  });

  it('re-initialises when the brand actually changes', () => {
    useBrandBoardStore.getState().setColor('primary', '#ff0000');
    useBrandBoardStore.getState().ensureInitFromBrand(brandB);

    const after = useBrandBoardStore.getState();
    expect(after.initializedForBrandId).toBe('brand-b');
    expect(after.draft.brandName).toBe('Beta');
    expect(after.draft.colors.primary).toBe('#445566');
    // A different brand's undo history is not this brand's undo history.
    expect(after.history.length).toBe(0);
  });

  it('still initialises for a brand with no id rather than silently doing nothing', () => {
    useBrandBoardStore.getState().ensureInitFromBrand({ name: 'No Id' });
    expect(useBrandBoardStore.getState().draft.brandName).toBe('No Id');
  });

  it('initFromBrand stays destructive — ensure is the safe door, not a rename', () => {
    useBrandBoardStore.getState().setColor('primary', '#ff0000');
    useBrandBoardStore.getState().initFromBrand(brandA);

    expect(useBrandBoardStore.getState().draft.colors.primary).toBe('#112233');
    expect(useBrandBoardStore.getState().history.length).toBe(0);
  });
});
