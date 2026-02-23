
import Header from '../components/Header.tsx'
import Footer from '../components/Footer.tsx'
import PersonCard from '../components/PersonCard.tsx'
//import {DatabaseFlat} from '../data/mockDatabase.tsx'
import {DatabaseBigFlat} from '../data/bigDatabase.tsx'
import AddUser from '../components/AddUser.tsx'
import style from './modules/Overview.module.css'
import SideBar from '../components/SideBar.tsx';
import Toolbar from '../components/Toolbar.tsx'

function Overview() {
    
    return(
        <>
            <div className={style.rootDiv}>
                <Header></Header>
                <AddUser></AddUser>
                <SideBar></SideBar>
                <Toolbar></Toolbar>
                <div className={style.overview}>
                    {DatabaseBigFlat.map((personI) => (
                        <PersonCard person={personI}
                        />
                    ))}
                </div>
                <Footer></Footer>
            </div>
        </>
    )
}
export default Overview