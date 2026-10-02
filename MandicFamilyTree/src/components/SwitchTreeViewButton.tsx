import styles from './modules/Button.module.css'
import { useLocale } from '../i18n/LocaleContext.tsx'

interface SwitchTreeViewButtonProps {
    viewMode: 'card' | 'text';
    onToggle: () => void;
}

function SwitchTreeViewButton({ viewMode, onToggle }: SwitchTreeViewButtonProps) {
    const { t } = useLocale();
    return(
        <button className={styles.btn} onClick={onToggle}>
            {viewMode === 'card' ? t('home.switchToTextView') : t('home.switchToCardView')}
        </button>
    )
}
export default SwitchTreeViewButton
