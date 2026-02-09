import type { MouseEvent, SyntheticEvent } from 'react';
import styless from './modules/Button.module.css'
import stylesDom from '../dom/modules/Home.module.css'

function SwitchTreeViewButton() {
    let clickHandler = undefined;
    clickHandler = (e:any) => {
        console.log(document.getElementById(stylesDom.textViewTree)?.style.display);
        if (document.getElementById(stylesDom.textViewTree)?.style.display == 'none'){
            document.getElementById(stylesDom.cardViewTree)!.style.display='none';
            document.getElementById(stylesDom.textViewTree)!.style.display='block';
        }else{
            document.getElementById(stylesDom.cardViewTree)!.style.display='block';
            document.getElementById(stylesDom.textViewTree)!.style.display='none';
        }
}
    const doubleClickHandler = (e:any) => {}
    return(
        <button className={styless.button} id={styless.changeViewButton} onDoubleClick={(e) => doubleClickHandler(e)} onClick={(e) => clickHandler(e)}>Change View</button>)
}
export default SwitchTreeViewButton