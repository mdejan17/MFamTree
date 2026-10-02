import styles from './modules/SideBar.module.css'
import { useHoveredPerson } from '../ui/HoveredPersonContext.tsx'
import { useLocale } from '../i18n/LocaleContext.tsx'

// Sits behind the floating Toolbar card as a plain colored backdrop, so the
// lane the card floats over/within doesn't look like a hole into the tree
// canvas. It no longer duplicates the hovered person's photo/name/dates —
// Toolbar (which sits on top of this, with a higher z-index) already shows
// that — this only ever renders the placeholder prompt, and only while
// nothing is hovered yet.
function SideBar() {
    const { hovered } = useHoveredPerson();
    const { t } = useLocale();

    return (
        <div className={styles.sideBarBody}>
            {!hovered && <p>{t('toolbar.hoverPrompt')}</p>}
        </div>
    )
}
export default SideBar
