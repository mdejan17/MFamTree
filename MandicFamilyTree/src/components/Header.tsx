import styles from './modules/Header.module.css'
import stylesAddUSer from './modules/AddUser.module.css'
function Header(){

    function addUserHandler() {
        (document.getElementsByClassName(stylesAddUSer.popup) as HTMLCollectionOf<HTMLElement>)[0].style.display='grid';
        (document.getElementsByClassName(stylesAddUSer.overlay) as HTMLCollectionOf<HTMLElement>)[0].style.display='block';
     
    }

    return(
        <header className={styles.header}>
            <nav>
                    <ul>
                        <li><a href="">Home</a></li>
                        <li><a href="">Search</a></li>
                        <li><a className='addUser' onClick={() => addUserHandler()}>Add</a></li>
                        <li><a href="">Login</a></li>
                    </ul>
            </nav>
        </header>
    );
}
export default Header