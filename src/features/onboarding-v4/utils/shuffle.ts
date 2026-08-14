export function shuffleUnlocked<T extends { locked?: boolean }>(items: T[], picker: () => T): T[] {
  return items.map((item) => (item.locked ? item : picker()));
}
