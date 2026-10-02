import { useState } from 'react'
import type { Person } from '../data/mockDatabase.tsx'
import { resolveAssetUrl } from '../api/client.ts'
import styles from './modules/PersonAvatar.module.css'

// A muted, jewel-toned palette that reads well against the dark Atlas
// background with light text on top — picked for even perceived lightness
// so any entry looks fine regardless of which color it lands on.
const PALETTE = [
  '#5b6ee1', '#2f9e6f', '#c9623f', '#2f93a8',
  '#8a5fd1', '#b0793f', '#3f7ab0', '#a34f82',
];

// Same GLSL-style sine hash used elsewhere in the app (see tiltSign in
// PersonCard.tsx) for a deterministic, re-render-stable pick — just mapped
// to a palette index instead of a coin flip.
function paletteIndexFor(uid: number): number {
  const h = Math.sin(uid * 12.9898) * 43758.5453;
  const frac = h - Math.floor(h);
  return Math.floor(frac * PALETTE.length) % PALETTE.length;
}

function initialsFor(person: Pick<Person, 'firstName' | 'lastName'>): string {
  const first = person.firstName?.trim()?.[0] ?? '';
  const last = person.lastName?.trim()?.[0] ?? '';
  const initials = `${first}${last}`.toUpperCase();
  return initials || '?';
}

interface PersonAvatarProps {
  person: Person;
  // Applied to both the <img> and the monogram <div> so callers can reuse
  // their existing sizing/border/margin rules (e.g. PersonCard's
  // .personCardImg) — this component only adds the monogram-specific
  // centering/typography on top via its own module class.
  className?: string;
}

// Renders the person's real photo when one is on file, or an initials
// monogram (colored by uid) otherwise — and falls back to the monogram if
// the photo URL turns out to be broken (404/removed file), instead of
// showing a broken-image icon.
function PersonAvatar({ person, className }: PersonAvatarProps) {
  const [broken, setBroken] = useState(false);
  const hasPhoto = !!person.profilePic && !broken;

  if (hasPhoto) {
    return (
      <img
        className={className}
        src={resolveAssetUrl(person.profilePic as string)}
        alt=""
        onError={() => setBroken(true)}
        // Images are natively draggable by default — starting that native
        // drag-and-drop gesture swallows the pointer sequence before a
        // caller's own pointer-based dragging (e.g. FamTree's bubbles) ever
        // sees it, silently breaking it only for people with a real photo.
        draggable={false}
      />
    );
  }

  return (
    <div
      className={className ? `${styles.monogram} ${className}` : styles.monogram}
      style={{ background: PALETTE[paletteIndexFor(person.uid)] }}
      aria-hidden="true"
    >
      {initialsFor(person)}
    </div>
  );
}

export default PersonAvatar
