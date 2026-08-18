/**
 * Initials for a person's avatar.
 *
 * Splitting on whitespace and taking the first character of each word looks
 * right until a name carries punctuation: "Dev (bypass)" came out as "D(", on
 * both the settings avatar and the workspace header. Only letters and digits
 * can be an initial.
 */
export function initialsFromName(name?: string | null, fallback = 'U'): string {
  const words = (name ?? '')
    .split(/\s+/)
    // Strip anything that is not a letter or a digit, so "(bypass)" becomes
    // "bypass" and "—" disappears entirely rather than becoming an initial.
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);

  if (words.length === 0) return fallback;
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase();
}
