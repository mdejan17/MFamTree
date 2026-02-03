import styles from './Header.module.css'
function Header(){

    return(
        <header className={styles}>
            <nav>
                    <ul>
                        <li><a href="">Home</a></li>
                        <li><a href="">About</a></li>
                        <li><a href="">Login</a></li>
                    </ul>
            </nav>
        </header>
    );
}
export default Header