import type { Person } from '../data/mockDatabase.tsx'

function yearOf(value: unknown): string {
  const iso = value as string | undefined;
  return iso ? String(iso).slice(0, 4) : '';
}

// Compact "1965–2020" / "1965" / "–2020" label for display in tight spaces
// (grid cards, list rows) where a full date range would be too wide.
export function yearsRange(person: Pick<Person, 'dateOfBirth' | 'dateOfDeath'>): string {
  const birth = yearOf(person.dateOfBirth);
  const death = yearOf(person.dateOfDeath);
  if (birth && death) return `${birth}–${death}`;
  if (birth) return birth;
  if (death) return `–${death}`;
  return '';
}
