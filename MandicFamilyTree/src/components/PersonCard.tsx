import placeholderPic from '../assets/placeholder.jpeg'
import styles from './modules/PersonCard.module.css'
import stylesSVG from './modules/PersonCardSVG.module.css'
import type { Person } from '../data/mockDatabase.tsx';
import type { CustomNodeElementProps } from 'react-d3-tree';
import { useEffect } from 'react'
import { resolveAssetUrl } from '../api/client.ts'
import { useHoveredPerson } from '../ui/HoveredPersonContext.tsx'
import { useTreeNodePositions } from '../ui/TreeNodePositionContext.tsx'
import { needsReview } from '../utils/review.ts'
import { useLocale } from '../i18n/LocaleContext.tsx'
import { yearsRange } from '../utils/personDates.ts'
import PersonAvatar from './PersonAvatar.tsx'

function pictureFor(profilePic?: string): string {
  return profilePic ? resolveAssetUrl(profilePic) : placeholderPic;
}

// Deterministic per-card tilt direction, so a given person's polaroid always
// leans the same way instead of flipping on every re-render — a classic
// GLSL-style hash turned into a coin flip, rather than Math.random(), since
// this has to be a pure function of uid.
function tiltSign(uid: number): 1 | -1 {
  const h = Math.sin(uid * 12.9898) * 43758.5453;
  return h - Math.floor(h) < 0.5 ? -1 : 1;
}

export function PersonCard({ person }: { person: Person }){
  const { t } = useLocale();
  const { setHovered } = useHoveredPerson();
  return(
      <g className={`personCard${person.uid.toString()}`}>
      <div
        className={styles.card}
        onMouseOver={() => setHovered(person)}
        onMouseOut={() => setHovered(null)}
      >
          {needsReview(person) && (
            <span className={styles.reviewBadge} title={t('personCard.reviewTitle')}>{t('personCard.reviewBadge')}</span>
          )}
          <PersonAvatar person={person} className={`${styles.personCardImg} ${styles.cardAvatar}`} />
          <h2 className={styles.personCardTitle}>{person.firstName}</h2>
          <p className={styles.personCardText}>{yearsRange(person)}</p>
      </div></g>
  );
}
export function PersonCardSVG({ person }: { person: Person }){
    return(
        <foreignObject width={350} height={300} x={-105} y={-100} style={{ pointerEvents: "all" }}>
            <div className={styles.card}
                onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();}}>
                <img
                    className={styles.personCardImg}
                    src={pictureFor(person.profilePic)}
                    alt="Person Picture"
                />
                <h2 className={styles.personCardTitle}>{person.firstName}</h2>
                <p className={styles.personCardText}>{person.note}</p>
            </div>
        </foreignObject>
    )
}
export function CustomNode({ nodeDatum, toggleNode, hierarchyPointNode }: CustomNodeElementProps) {
  // Polaroid layout: a square photo inset in an off-white frame, with a
  // blank caption strip below it (inside the frame) holding the name —
  // chosen over the previous circular-avatar-plus-card design because it
  // reads as a distinct, high-contrast shape against the dark tree
  // background even at small zoomed-out scale, which was the original
  // complaint.
  const photoSize = 190;
  const padSide = 18;
  const padTop = 18;
  const captionHeight = 62;
  const frameWidth = photoSize + padSide * 2;
  const frameHeight = padTop + photoSize + captionHeight;
  const frameX = -frameWidth / 2;
  const frameY = -frameHeight / 2;
  const photoX = frameX + padSide;
  const photoY = frameY + padTop;

  const { setHovered } = useHoveredPerson();
  const nodePositions = useTreeNodePositions();

  const profilePic = pictureFor(nodeDatum.attributes?.profilePic as string | undefined);
  const uid = nodeDatum.attributes?.uid as number | undefined;

  // Reports this person's on-tree coordinates so the profile page's
  // "View in Tree" button can jump the view straight to them later — see
  // TreeNodePositionContext.tsx.
  const { x, y } = hierarchyPointNode;
  useEffect(() => {
    if (uid === undefined) return;
    nodePositions?.register(uid, { x, y });
    // Unregisters on true unmount (collapsed away, or no longer part of
    // the tree after a branch switch) — re-running this effect for an x/y
    // change just unregisters-then-immediately-re-registers in the same
    // flush, which is a no-op in practice.
    return () => {
      nodePositions?.unregister(uid);
    };
  }, [uid, x, y, nodePositions]);

  const isFocused = uid !== undefined && nodePositions?.focusedUid === uid;
  const clipId = `photoClip-${uid ?? 'unknown'}`;
  // A scattered-on-a-desk, scrapbook feel — a fixed 15° lean, direction
  // picked per person (see tiltSign) so it's stable across re-renders
  // instead of jittering. Applied on an inner <g> via the SVG `transform`
  // attribute, deliberately separate from the outer <g>'s CSS-driven hover
  // scale (stylesSVG.rootSVG) — an inline/attribute transform here would
  // otherwise fight the stylesheet's own `transform` on hover.
  const tiltDeg = uid !== undefined ? 15 * tiltSign(uid) : 0;
  // Two blank "photos" peeking out from underneath, fanned the opposite
  // way from the main tilt so the whole stack reads as scattered rather
  // than perfectly nested. Purely decorative — no pointer events, no
  // photo/caption content, just an off-white frame over a dark inset.
  const sign = tiltDeg >= 0 ? 1 : -1;
  const backCards = [
    { dx: -sign * 16, dy: 11, deg: -sign * 19 },
    { dx: -sign * 9, dy: 21, deg: -sign * 10 },
  ];

  return (
    <g
      data-uid={uid}
      onClick={toggleNode}
      onMouseOver={(e) => setHovered((nodeDatum.attributes as unknown as Person) ?? null, e.currentTarget.getBoundingClientRect())}
      onMouseOut={() => setHovered(null)}
      className={stylesSVG.rootSVG}
    >
      {backCards.map((card, i) => (
        <g
          key={i}
          transform={`translate(${card.dx}, ${card.dy}) rotate(${card.deg})`}
          style={{ pointerEvents: 'none' }}
        >
          <rect
            x={frameX}
            y={frameY}
            width={frameWidth}
            height={frameHeight}
            rx={4}
            ry={4}
            className={stylesSVG.polaroidBack}
          />
          <rect
            x={photoX}
            y={photoY}
            width={photoSize}
            height={photoSize}
            className={stylesSVG.polaroidBackPhoto}
          />
        </g>
      ))}
      <g transform={`rotate(${tiltDeg})`}>
        <defs>
          {/* Clips the photo to the exact inset rect below — shares the same
              x/y/width/height, so the crop can't drift from the visible
              frame opening the way the old circular clip-path once did. */}
          <clipPath id={clipId}>
            <rect x={photoX} y={photoY} width={photoSize} height={photoSize} />
          </clipPath>
        </defs>
        <rect
          x={frameX}
          y={frameY}
          width={frameWidth}
          height={frameHeight}
          rx={4}
          ry={4}
          strokeWidth={isFocused ? 5 : 0}
          className={isFocused ? `${stylesSVG.polaroidFrame} ${stylesSVG.polaroidFrameFocused}` : stylesSVG.polaroidFrame}
        />
        <image
          href={profilePic}
          x={photoX}
          y={photoY}
          width={photoSize}
          height={photoSize}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="xMidYMid slice"
        />
        <text
          x={0}
          y={photoY + photoSize + captionHeight / 2 + 9}
          textAnchor="middle"
          className={stylesSVG.name}
        >
          {nodeDatum.name}
        </text>
      </g>
    </g>
  );
}
export default PersonCard
