import type { Person } from '../data/mockDatabase.tsx'

// The ancestry import flags a handful of records (garbled/truncated source
// cells, names it couldn't fully reconstruct) with a note saying so — see
// server/scripts/ancestry-import/review.txt. Surfacing that in the UI lets
// anyone reviewing the tree find those ~15-20 records instead of having to
// read all 276 notes by hand.
const REVIEW_PATTERN = /illegible|incomplete/i;

export function needsReview(person: Pick<Person, 'note'>): boolean {
  return !!person.note && REVIEW_PATTERN.test(person.note);
}
