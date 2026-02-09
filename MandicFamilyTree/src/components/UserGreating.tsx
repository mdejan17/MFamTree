
import styles from './modules/Login.module.css'

interface Login{
    isLoggedIn: boolean;
    username: string;
}
function UserGreating(login:Login) {
    const wellcomeMessage = <h2 className={styles.wellcomeMessage}>Wellcome {login.username}</h2> ;
    const loginMessage = <h2 className={styles.loginMessage}>Please log it to continue</h2>;
    return(login.isLoggedIn ? wellcomeMessage:loginMessage )
}

export default UserGreating;