import profilePic from '../assets/placeholder.jpeg'
import styles from './modules/PersonCard.module.css'
import type { Person, PersonNode } from '../data/mockDatabase.tsx';
import React from "react";

export function PersonCard(person: Person) {
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

export function PersonCardSVGxmlns({ person }: { person: Person }) {
    return (
      <foreignObject
        width={350}
        height={300}
        x={-175}
        y={-150}
        style={{ pointerEvents: "all" }}
        xmlns="http://www.w3.org/1999/xhtml" // ✅ move xmlns here
      >
        <div
          className={styles.card}
          style={{
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
            border: '1px solid #ccc',
            borderRadius: '8px',
            backgroundColor: 'white',
            padding: '10px',
            textAlign: 'center',
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <img
            className={styles.personCardImg}
            src={profilePic}
            alt={`${person.firstName} picture`}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              objectFit: 'cover',
              marginBottom: '8px',
            }}
          />
          <h2
            className={styles.personCardTitle}
            style={{ fontSize: '16px', margin: '4px 0' }}
          >
            {person.firstName} {person.lastName}
          </h2>
          {person.note && (
            <p
              className={styles.personCardText}
              style={{ fontSize: '12px', margin: '4px 0' }}
            >
              {person.note}
            </p>
          )}
        </div>
      </foreignObject>
    );
  }

export function CustomNode({ nodeDatum, toggleNode }: { nodeDatum: any; toggleNode: () => void }) {
    const width = 250;
    const height = 300;
    const imageSize = 200;
  
    const note = nodeDatum.attributes?.note || "";
    const profilePersonPic = nodeDatum.attributes?.profilePic || "";
  
    return (
      <g onClick={toggleNode} style={{ cursor: "pointer" }}>
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
        />
        {profilePic && (
          <image
            href={profilePic}
            x={-imageSize / 2}
            y={-height / 2 - 0}
            width={imageSize}
            height={imageSize}
            clipPath="circle(80px at 80px 90px)"
          />
        )}
        <text
          x={0}
          y={-height / 2 + imageSize + 60}
          textAnchor="middle"
          style={{ fontSize: "2em"}}
        >
          {nodeDatum.name}
        </text>
        {/* {note && (
          <text
            x={0}
            y={-height / 2 + imageSize + 100}
            textAnchor="middle"
            style={{ fontSize: "1em" }}
          >
            {note}
          </text>
        )} */}
      </g>
    );
  }
export default PersonCard