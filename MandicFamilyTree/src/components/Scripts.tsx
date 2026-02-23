import styles from './modules/Toolbar.module.css'

export function Scripts() {
    

    const delayedHover = (el:any, delay = 1000) => {
        let timer:any;
        el.addEventListener("mouseenter", () => {
        timer = setTimeout(() => {
            console.log("Hover held for 1 second → action triggered!");
            // You can put more code here later
        }, delay);
        });
        
        el.addEventListener("mouseleave", () => {
        clearTimeout(timer);
        });
    };
    //const box = document.getElementById('myDiv');
    const box = document.querySelector('.'+styles.toolbar)
    // const box = document.getElementsByClassName(styles.toolbar).item(1);
    console.log('Element ' + box);
    delayedHover(box, 1000);
    return(<></>)
}