//import crestImg from './smtn.jpeg'
import styles from './modules/Crest.module.css'
let crestImg:any = null
function Crest() {
    if (crestImg){      
        




        return(
            <>
              <img src={crestImg}  className={styles.crestPhoto} alt="" />             
            </>
        )
    }
    else{
        return(
            <>
                <div className={styles.crestPhoto}>
                    <h1>
                        M
                    </h1>
                </div>
            </>
        )
    }



    
}
export default Crest