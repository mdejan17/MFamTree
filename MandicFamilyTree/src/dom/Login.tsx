
import Header from '../components/Header.tsx'
import Footer from '../components/Footer.tsx'
import '../components/modules/Tree.css';
import 'treeflex/dist/css/treeflex.css'
import AddUser from '../components/AddUser.tsx'
import style from './modules/Login.module.css'
import SideBar from '../components/SideBar.tsx';

function Login() {
    

return(
    <>
    <div className={style.rootDiv}  >
      <Header></Header>
      <SideBar></SideBar>
      <Footer></Footer>
      </div>
    </>
)


}
export default Login