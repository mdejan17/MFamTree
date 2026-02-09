import type { MouseEvent, SyntheticEvent } from 'react';
import styles from './modules/Button.module.css'
function Button() {
    let count = 0;
    const handleClick = (param:string) => {
        if (count < 3) {
            count++;
            console.log(param + ' pressed the button ' + count + ' times!')
        }else{
            console.log(param + ' stop clicking me');
        }
    }

//    const clickHandler = (e) => {
//        console.log(e)
//    }
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