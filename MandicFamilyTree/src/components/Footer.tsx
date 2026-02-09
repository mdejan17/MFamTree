import styles from './modules/Footer.module.css'
function Footer() {
    return(
        <footer className={styles.footer}>
            <p>&copy; {new Date().getFullYear()} Website Name</p>
        </footer>
    )
}
export default Footer