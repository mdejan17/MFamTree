import styles from './modules/Button.module.css'
function Button() {
    const clickHandler = (e:any) => {
        e.target.textContent=="Pressed" ? e.target.textContent='Click Me' : e.target.textContent='Pressed' 
    }
    const doubleClickHandler = (e:any) => {
        e.target.style.display = 'none';
    }
    return(
        <button className={styles.button} onDoubleClick={(e) => doubleClickHandler(e)} onClick={(e) => clickHandler(e)}>Click Me</button>
    )
}
export default Button