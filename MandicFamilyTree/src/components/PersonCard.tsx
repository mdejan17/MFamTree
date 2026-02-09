import profilePic from '../assets/placeholder.jpeg'
import styles from './modules/PersonCard.module.css'
import type { Person } from '../data/mockDatabase.tsx';


// export interface Person{
//     uid: number;
//     firstName: string;
//     note?: string;
//     age?: number;
//     profilePic?: string;
// }

function PersonCard(person: Person) {
    return(
        <g className={`personCard${person.uid.toString()}`}>
        <div className={styles.card}>
            <img className={styles.personCardImg} src={profilePic} alt="Person Picture" />
            <h2 className={styles.personCardTitle}>{person.firstName}</h2>
            <p className={styles.personCardText}>{person.note}</p>
        </div></g>
    );
}
export default PersonCard