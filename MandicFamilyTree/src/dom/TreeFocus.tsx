import Header from '../components/Header.tsx'
import Footer from '../components/Footer.tsx'
import 'treeflex/dist/css/treeflex.css'
import AddUser from '../components/AddUser.tsx'
import FamTree from '../components/FamTree.tsx';
import './modules/TreeFocus.cusom-module.css'
import style from './modules/TreeFocus.module.css'
import SideBar from '../components/SideBar.tsx';

function TreeFocus() {
    
    return(
        <>
            <div className={style.rootDiv}  >
            <Header></Header>
            <AddUser></AddUser>
            <SideBar></SideBar>
            <FamTree></FamTree>
            <Footer></Footer>
            </div>
        </>
    )
}
export default TreeFocus