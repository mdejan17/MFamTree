import styles from './modules/Crest.module.css'

// No family crest image wired up yet — see Phase 4 (media upload) in the
// build plan. Falls back to a plain placeholder until then.
const crestImg: string | null = null;

function Crest() {
    if (crestImg){
        return(
            <>
              <img src={crestImg}  className={styles.crestPhoto} alt="" />
            </>
        )
    }
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
export default Crest
