import profilePic from '../../assets/imgDejan.png'
import styles from './Person.module.css'



function Person(props) {
    return(
        <div className={styles.card}>
            <img className={styles.personCardImg} src={profilePic} alt="Person Picture" />
            <h2 className={styles.personCardTitle}>{props.name}</h2>
            <p className={styles.personCardText}>{props.bio}</p>
        </div>
    );
}

Person.defaultProps = {
    name: "Placeholder",
    bio: "Placeholder",
}
export default Person