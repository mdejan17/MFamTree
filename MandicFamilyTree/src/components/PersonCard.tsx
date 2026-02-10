import profilePic from '../assets/placeholder.jpeg'
import styles from './modules/PersonCard.module.css'
import stylesSVG from './modules/PersonCardSVG.module.css'
import type { Person } from '../data/mockDatabase.tsx';


export function PersonCard({ person }: { person: Person }){
  return(
      <g className={`personCard${person.uid.toString()}`}>
      <div className={styles.card}>
          <img className={styles.personCardImg} src={profilePic} alt="Person Picture" />
          <h2 className={styles.personCardTitle}>{person.firstName}</h2>
          <p className={styles.personCardText}>{person.note}</p>
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
                    src={profilePic}
                    alt="Person Picture"
                />
                <h2 className={styles.personCardTitle}>{person.firstName}</h2>
                <p className={styles.personCardText}>{person.note}</p>
            </div>
        </foreignObject>
    )
}
export function CustomNode({ nodeDatum, toggleNode }: { nodeDatum: any; toggleNode: () => void }) {
  const width = 250;
  const height = 300;
  const imageSize = 200;

  // const note = nodeDatum.attributes?.note || "";
  // const profilePersonPic = nodeDatum.attributes?.profilePic || "";

  return (
    <g onClick={toggleNode} className={stylesSVG.rootSVG}>
      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        rx={10}
        ry={10}
        fill="#fff"
        stroke="#aaa"
        strokeWidth={2}
        className={stylesSVG.cardRect}
      />
      {profilePic && (
        <image
          href={profilePic}
          x={-imageSize / 2}
          y={-height / 2 - 0}
          width={imageSize}
          height={imageSize}
          clipPath="circle(80px at 80px 90px)"
          className={stylesSVG.profileImage}
        />
      )}
      <text
        x={0}
        y={-height / 2 + imageSize + 60}
        textAnchor="middle"
        style={{ fontSize: "2em"}}
        className={stylesSVG.name}
      >
        {nodeDatum.name}
      </text>
    </g>
  );
}
export default PersonCard