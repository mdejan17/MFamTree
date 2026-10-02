import styles from './modules/Footer.module.css'
function Footer() {
    return(
        <footer className={styles.footer}>
            <p className={styles.text}>&copy; {new Date().getFullYear()} Mandic Family Tree</p>
        </footer>
    )
}
export default Footer