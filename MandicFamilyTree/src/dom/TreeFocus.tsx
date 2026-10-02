import Header from '../components/Header.tsx'
import Footer from '../components/Footer.tsx'
import AddUser from '../components/AddUser.tsx'
import FamTree from '../components/FamTree.tsx';
import style from './modules/TreeFocus.module.css'
import ContextualPopover from '../components/ContextualPopover.tsx';

function TreeFocus() {

    return(
        <>
            <div className={style.rootDiv}  >
            <Header></Header>
            <AddUser></AddUser>
            <ContextualPopover></ContextualPopover>
            <FamTree></FamTree>
            <Footer></Footer>
            </div>
        </>
    )
}
export default TreeFocus