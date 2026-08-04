import { describe, expect, it } from 'vitest';
import { planPrimarySwap, primaryRank } from './logoFamily';
import type { LogoSlot } from '../types';

type A = { id: string; logoSlot: LogoSlot | null; aiLogoSlot?: LogoSlot };
const auto = (entries: Array<[string, LogoSlot]>) => new Map(entries);

describe('primaryRank', () => {
  it('orders lockup > unhinted > wordmark > mark', () => {
    expect(primaryRank('primary')).toBeGreaterThan(primaryRank('horizontal'));
    expect(primaryRank('horizontal')).toBeGreaterThan(primaryRank(undefined));
    expect(primaryRank(undefined)).toBeGreaterThan(primaryRank('wordmark'));
    expect(primaryRank('wordmark')).toBeGreaterThan(primaryRank('mark'));
  });
});

describe('planPrimarySwap', () => {
  // The BrandingOS case: dots icon finished first and took Primary; the
  // full lockup landed in the mark slot.
  const brandingOS: A[] = [
    { id: 'icon', logoSlot: 'primary', aiLogoSlot: 'mark' },
    { id: 'text', logoSlot: 'wordmark', aiLogoSlot: 'wordmark' },
    { id: 'lockup', logoSlot: 'mark', aiLogoSlot: 'horizontal' },
  ];

  it('swaps the icon out of Primary for the lockup', () => {
    const plan = planPrimarySwap(
      brandingOS,
      auto([['icon', 'primary'], ['text', 'wordmark'], ['lockup', 'mark']]),
    );
    expect(plan).toEqual({ promoteId: 'lockup', demoteId: 'icon', demoteTo: 'mark' });
  });

  it('never touches a user-placed primary', () => {
    // User dragged the icon into Primary themselves → no auto record.
    const plan = planPrimarySwap(
      brandingOS,
      auto([['text', 'wordmark'], ['lockup', 'mark']]),
    );
    expect(plan).toBeNull();
  });

  it('skips a user-moved candidate but still ranks the rest', () => {
    // The lockup sits in "mark" because the user PUT it there — untouchable.
    // Among the auto-placed rest, the wordmark still outranks the bare icon.
    const plan = planPrimarySwap(
      brandingOS,
      auto([['icon', 'primary'], ['text', 'wordmark'], ['lockup', 'vertical']]),
    );
    expect(plan).toEqual({ promoteId: 'text', demoteId: 'icon', demoteTo: 'wordmark' });
  });

  it('does nothing when the holder is already the best candidate', () => {
    const assets: A[] = [
      { id: 'lockup', logoSlot: 'primary', aiLogoSlot: 'primary' },
      { id: 'icon', logoSlot: 'mark', aiLogoSlot: 'mark' },
    ];
    expect(
      planPrimarySwap(assets, auto([['lockup', 'primary'], ['icon', 'mark']])),
    ).toBeNull();
  });

  it('a wordmark does not steal Primary from an unhinted upload', () => {
    // Unhinted often means a flat lockup export the model could not read.
    const assets: A[] = [
      { id: 'flat', logoSlot: 'primary' },
      { id: 'text', logoSlot: 'wordmark', aiLogoSlot: 'wordmark' },
    ];
    expect(
      planPrimarySwap(assets, auto([['flat', 'primary'], ['text', 'wordmark']])),
    ).toBeNull();
  });

  it('demotes to the holder’s hinted slot when free', () => {
    const assets: A[] = [
      { id: 'icon', logoSlot: 'primary', aiLogoSlot: 'mark' },
      { id: 'lockup', logoSlot: 'horizontal', aiLogoSlot: 'primary' },
    ];
    const plan = planPrimarySwap(
      assets,
      auto([['icon', 'primary'], ['lockup', 'horizontal']]),
    );
    expect(plan).toEqual({ promoteId: 'lockup', demoteId: 'icon', demoteTo: 'mark' });
  });

  it('falls back to the vacated slot when the hint is occupied', () => {
    const assets: A[] = [
      { id: 'icon', logoSlot: 'primary', aiLogoSlot: 'mark' },
      { id: 'icon2', logoSlot: 'mark', aiLogoSlot: 'mark' },
      { id: 'lockup', logoSlot: 'vertical', aiLogoSlot: 'vertical' },
    ];
    const plan = planPrimarySwap(
      assets,
      auto([['icon', 'primary'], ['icon2', 'mark'], ['lockup', 'vertical']]),
    );
    expect(plan).toEqual({ promoteId: 'lockup', demoteId: 'icon', demoteTo: 'vertical' });
  });

  it('no primary holder → nothing to do', () => {
    expect(planPrimarySwap([{ id: 'a', logoSlot: 'mark', aiLogoSlot: 'mark' }], auto([['a', 'mark']]))).toBeNull();
  });
});
