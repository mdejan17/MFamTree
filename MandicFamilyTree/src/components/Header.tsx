import styles from './modules/Header.module.css'
import stylesAddUSer from './modules/AddUser.module.css'
import { Link } from 'react-router-dom';

function Header(){

    function addUserHandler() {
        (document.getElementsByClassName(stylesAddUSer.popup) as HTMLCollectionOf<HTMLElement>)[0].style.display='grid';
        (document.getElementsByClassName(stylesAddUSer.overlay) as HTMLCollectionOf<HTMLElement>)[0].style.display='block';
    }

    return(
        <header className={styles.header}>
            <nav>
                    <ul>
                        <li><Link to={'/'}>Home</Link></li>
                        <li><Link to={'/overview'}>Search</Link></li>
                        <li><a className='addUser' onClick={() => addUserHandler()}>Add</a></li>
                        <li><Link to={'/login'}>Login</Link></li>
                        <li><Link to={'/focus'}>Focus</Link></li>
                    </ul>
            </nav>
        </header>
    );
}
export default Header