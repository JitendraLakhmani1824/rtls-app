/** Pin and avatar colours: distinct on the light map, readable with white initials, never grey (grey means stale). */
export const PALETTE = [
  '#E4572E',
  '#17BEBB',
  '#D4A20A',
  '#2E282A',
  '#76B041',
  '#7B2CBF',
  '#3A86FF',
  '#FF006E',
  '#0F766E',
  '#B45309',
  '#4F46E5',
  '#BE123C',
] as const;

/** FNV-1a: a small, stable 32-bit hash of a string (seeds and colours, not security). */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Hashed with the key; this one gives the sample sessions no repeated colours. */
const COLOUR_SALT = 'colour:2';

/** A person's colour, the same on every screen and every phone. */
export function colourFor(key: string): string {
  return PALETTE[hashString(COLOUR_SALT + key) % PALETTE.length] as string;
}

/** "Riya Shah" → "RS", "Riya" → "R". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0]?.[0] ?? '?';
  if (words.length === 1) return first.toUpperCase();
  return (first + (words[words.length - 1]?.[0] ?? '')).toUpperCase();
}
