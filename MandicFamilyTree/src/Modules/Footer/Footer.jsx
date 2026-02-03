import styles from './Footer.module.css'
function Footer() {
    return(
        <footer className={StyleSheet.footer}>
            <p>&copy; {new Date().getFullYear()} Website Name</p>
        </footer>
    )
}
export default Footer