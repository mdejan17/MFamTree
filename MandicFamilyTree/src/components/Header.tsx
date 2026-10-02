import styles from './modules/Header.module.css'
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.tsx'
import { useAddUserPopup } from '../ui/AddUserPopupContext.tsx'
import { useBranch } from '../ui/BranchContext.tsx'
import { useLocale } from '../i18n/LocaleContext.tsx'
import BranchSwitcher from './BranchSwitcher.tsx'
import Crest from './Crest.tsx'

function Header(){
    const { user, logout } = useAuth();
    const { open: openAddUser } = useAddUserPopup();
    const { activeBranch } = useBranch();
    const { locale, setLocale, t } = useLocale();
    const navigate = useNavigate();

    function handleLogout() {
        logout();
        navigate('/login');
    }

    return(
        <header className={styles.header}>
            <div className={styles.mark}>
                <span className={styles.dot}></span>
                <span className={styles.markText}>Mandic Tree</span>
            </div>
            <nav className={styles.nav}>
                    <ul className={styles.navList}>
                        {user && <li><Link className={styles.navLink} to={'/'}>{t('header.home')}</Link></li>}
                        {user && <li><Link className={styles.navLink} to={'/overview'}>{t('header.search')}</Link></li>}
                        {user && <li><a className={styles.navLink} role="button" onClick={() => openAddUser()}>{t('header.add')}</a></li>}
                        {user && <li><Link className={styles.navLink} to={'/focus'}>{t('header.focus')}</Link></li>}
                        {user && activeBranch && (
                            <li><Link className={styles.navLink} to={`/branch/${activeBranch.id}`}>{t('header.branch')}</Link></li>
                        )}
                        {!user && (
                            <li><Link className={styles.navLink} to={'/login'}>{t('header.login')}</Link></li>
                        )}
                    </ul>
            </nav>
            {user && <BranchSwitcher />}
            {user && (
                <div className={styles.userMenu} tabIndex={0}>
                    <span className={styles.greeting}>{t('header.greeting', { name: user.displayName || user.email })}</span>
                    <div className={styles.userDropdown}>
                        <a className={styles.dropdownItem} role="button" onClick={handleLogout}>{t('header.logout')}</a>
                    </div>
                </div>
            )}
            <div className={styles.langToggle}>
                <button
                    type="button"
                    className={locale === 'en' ? `${styles.langBtn} ${styles.langBtnActive}` : styles.langBtn}
                    onClick={() => setLocale('en')}
                >
                    EN
                </button>
                <button
                    type="button"
                    className={locale === 'sr' ? `${styles.langBtn} ${styles.langBtnActive}` : styles.langBtn}
                    onClick={() => setLocale('sr')}
                >
                    SR
                </button>
            </div>
            <Crest />
        </header>
    );
}
export default Header
