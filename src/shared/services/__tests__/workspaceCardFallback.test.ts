/**
 * The card's home of last resort, before migration 031 lands.
 *
 * Read together with `onboardingMarkerFallback.test.ts`: same arrangement, and
 * for a sharper reason. A marker is invisible machinery; a project name is
 * something the user just typed. If the save appears to work and the card is
 * back to the brand's name a second later, what they learn is that the feature
 * is broken.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  forgetWorkspaceCard,
  rememberedWorkspaceCard,
  rememberWorkspaceCard,
} from '../workspaceCardFallback';
import { brandCardLabel } from '@/shared/brand/workspaceCard';
import type { Brand } from '@/shared/types/brand';

beforeEach(() => localStorage.clear());

describe('a card the database could not take', () => {
  it('comes back for the brand it belongs to', () => {
    rememberWorkspaceCard('b1', { label: 'Client A' });
    expect(rememberedWorkspaceCard('b1')).toEqual({ label: 'Client A' });
    expect(rememberedWorkspaceCard('b2')).toBeUndefined();
  });

  it('keeps the rename the user just made visible — the whole point', () => {
    rememberWorkspaceCard('b1', { label: 'Client A' });
    const brand = {
      name: 'Acme',
      workspaceCard: rememberedWorkspaceCard('b1'),
    } as Brand;
    expect(brandCardLabel(brand)).toBe('Client A');
  });

  it('is not written for an empty card — silence already says that', () => {
    rememberWorkspaceCard('b1', {});
    expect(rememberedWorkspaceCard('b1')).toBeUndefined();
  });

  it('is cleared when the card is emptied again', () => {
    rememberWorkspaceCard('b1', { label: 'Client A' });
    rememberWorkspaceCard('b1', null);
    expect(rememberedWorkspaceCard('b1')).toBeUndefined();
  });

  it('is cleared when the brand is deleted', () => {
    rememberWorkspaceCard('b1', { label: 'Client A' });
    forgetWorkspaceCard('b1');
    expect(rememberedWorkspaceCard('b1')).toBeUndefined();
  });

  it('survives storage being unreadable rather than throwing at the caller', () => {
    localStorage.setItem('brandos:workspace-cards', 'not json');
    expect(rememberedWorkspaceCard('b1')).toBeUndefined();
    expect(() => rememberWorkspaceCard('b1', { label: 'Client A' })).not.toThrow();
    expect(rememberedWorkspaceCard('b1')).toEqual({ label: 'Client A' });
  });
});
