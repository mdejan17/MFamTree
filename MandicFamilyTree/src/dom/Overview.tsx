
import Header from '../components/Header.tsx'
import Footer from '../components/Footer.tsx'
import PersonCard from '../components/PersonCard.tsx'
//import {DatabaseFlat} from '../data/mockDatabase.tsx'
import {DatabaseBigFlat} from '../data/bigDatabase.tsx'
import AddUser from '../components/AddUser.tsx'
import style from './modules/Overview.module.css'


function Overview() {
    
    return(
        <>
            <div className={style.rootDiv}  >
                <Header></Header>
                <AddUser></AddUser>
                <div className={style.overview}>
                    {DatabaseBigFlat.map((person) => (
                    <PersonCard
                    uid={person.uid}
                    firstName={person.firstName}
                    lastName={person.lastName}
                    maidenName={person.maidenName}
                    gender={person.gender}
                    dateOfBirth={person.dateOfBirth}
                    dateOfDeath={person.dateOfDeath}
                    residency={person.residency}
                    note={person.note}
                    parentUid={person.parentUid}
                    spouseUid={person.spouseUid}
                    offspringUid={person.offspringUid}
                    profilePic={person.profilePic}
                    libarary={person.libarary}
                    />
                    ))}
                </div>
                <Footer></Footer>
            </div>
        </>
    )
}
export default Overview