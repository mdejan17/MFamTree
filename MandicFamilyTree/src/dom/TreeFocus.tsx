import Header from '../components/Header.tsx'
import Footer from '../components/Footer.tsx'
import '../components/modules/Tree.css';
import 'treeflex/dist/css/treeflex.css'
import AddUser from '../components/AddUser.tsx'
import './modules/Home.module.css'
import FamTree from '../components/FamTree.tsx';
import './modules/TreeFocus.cusom-module.css'
import style from './modules/TreeFocus.module.css'



function TreeFocus() {
    
    return(
        <>
            <div className={style.rootDiv}  >
            <Header></Header>
            <AddUser></AddUser>
            <FamTree></FamTree>
            <Footer></Footer>
            </div>
        </>
    )
}
export default TreeFocus