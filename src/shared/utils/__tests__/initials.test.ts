import { describe, expect, it } from 'vitest';
import { initialsFromName } from '../initials';

describe('initialsFromName', () => {
  it('takes the first and last word', () => {
    expect(initialsFromName('Ada Lovelace')).toBe('AL');
  });

  it('takes two letters from a single name', () => {
    expect(initialsFromName('Ada')).toBe('AD');
  });

  it('ignores punctuation instead of treating it as an initial', () => {
    // "Dev (bypass)" used to render as "D(" on the avatar and in the header.
    expect(initialsFromName('Dev (bypass)')).toBe('DB');
  });

  it('drops a word that is only punctuation', () => {
    expect(initialsFromName('Ada — Lovelace')).toBe('AL');
  });

  it('handles non-Latin scripts', () => {
    expect(initialsFromName('حمزة عزت')).toBe('حع');
  });

  it('falls back when there is nothing to work with', () => {
    expect(initialsFromName('')).toBe('U');
    expect(initialsFromName(undefined)).toBe('U');
    expect(initialsFromName('!!!')).toBe('U');
    expect(initialsFromName(null, 'JT')).toBe('JT');
  });

  it('handles extra whitespace', () => {
    expect(initialsFromName('  Ada   Byron  Lovelace ')).toBe('AL');
  });
});
