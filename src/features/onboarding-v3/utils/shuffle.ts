export interface Lockable {
  locked: boolean;
}

export function reshuffle<T extends Lockable>(items: T[], generate: () => T): T[] {
  return items.map(item => (item.locked ? item : generate()));
}

export function lockedCount<T extends Lockable>(items: T[]): number {
  return items.reduce((n, x) => n + (x.locked ? 1 : 0), 0);
}
