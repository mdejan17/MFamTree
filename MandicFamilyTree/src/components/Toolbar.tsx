import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './modules/Toolbar.css'
import placeholderPic from '../assets/placeholder.jpeg'
import { useHoveredPerson, PIN_DELAY_MS } from '../ui/HoveredPersonContext.tsx'
import { useAddUserPopup } from '../ui/AddUserPopupContext.tsx'
import { useLocale } from '../i18n/LocaleContext.tsx'
import { resolveAssetUrl } from '../api/client.ts'
import { fetchMediaForPerson } from '../api/media.ts'
import type { MediaItem } from '../api/media.ts'

// Dwell-progress bar state machine (see the bar's JSX further down):
//   hidden     -> nothing to show yet
//   filling    -> animating 0% -> 100% over PIN_DELAY_MS, same window
//                 HoveredPersonContext uses to pin
//   filled     -> stays lit, full, once pinned — doesn't disappear
//   retracting -> someone else is now hovered; slides back to 0% first,
//                 then starts a fresh "filling" for them
// Advanced purely by JS timers (not transitionend/animationend) — a CSS
// animation interrupted mid-flight by swapping classes doesn't reliably
// fire a matching end event in every browser, which previously left the
// bar stuck in 'retracting' forever whenever a hover was abandoned before
// the fill finished.
type BarPhase = 'hidden' | 'filling' | 'filled' | 'retracting';
const RETRACT_MS = 350; // matches .toolbarLoadBarFill--retracting's transition duration
const PANEL_TRANSITION_MS = 300; // matches .toolbar's opacity/transform transition duration

function Toolbar() {
    const { hovered, pinned, pinnedPerson, unpin } = useHoveredPerson();
    const { open: openAddUser } = useAddUserPopup();
    const { t } = useLocale();
    const navigate = useNavigate();
    const [media, setMedia] = useState<MediaItem[]>([]);

    // While nothing is actively under the mouse, fall back to whoever got
    // pinned (2s dwell) rather than going blank — see HoveredPersonContext.
    const displayed = hovered ?? pinnedPerson;
    const displayedIsPinned = !!(pinned && pinnedPerson && displayed && pinnedPerson.uid === displayed.uid);

    // --- Panel open/closed ---------------------------------------------
    // Hovering straight from one person to another (without the mouse ever
    // leaving the tree) would otherwise leave the panel continuously open
    // the whole time — this instead slides it back out and back in on
    // every switch, so each new person gets their own reveal instead of
    // the content just silently swapping underneath it.
    const [panelVisible, setPanelVisible] = useState(false);
    const prevDisplayedUidRef = useRef<number | null>(null);
    const panelReopenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const uid = displayed?.uid ?? null;
        const prevUid = prevDisplayedUidRef.current;
        prevDisplayedUidRef.current = uid;

        if (panelReopenTimer.current) {
            clearTimeout(panelReopenTimer.current);
            panelReopenTimer.current = null;
        }

        if (uid === null) {
            setPanelVisible(false);
            return;
        }
        if (prevUid === null || prevUid === uid) {
            setPanelVisible(true);
            return;
        }
        // Switched from one person to a different one — hide, then reopen
        // once the hide transition would have finished.
        setPanelVisible(false);
        panelReopenTimer.current = setTimeout(() => {
            panelReopenTimer.current = null;
            setPanelVisible(true);
        }, PANEL_TRANSITION_MS);
    }, [displayed]);

    // --- Dwell-progress bar ----------------------------------------------
    const [barUid, setBarUid] = useState<number | null>(null);
    const [barPhase, setBarPhase] = useState<BarPhase>('hidden');
    const barUidRef = useRef(barUid);
    const barPhaseRef = useRef(barPhase);
    const pendingUidRef = useRef<number | null>(null);
    const fillTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const retractTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    barUidRef.current = barUid;
    barPhaseRef.current = barPhase;

    function clearBarTimers() {
        if (fillTimer.current) { clearTimeout(fillTimer.current); fillTimer.current = null; }
        if (retractTimer.current) { clearTimeout(retractTimer.current); retractTimer.current = null; }
    }

    function handleFillEnd() {
        fillTimer.current = null;
        setBarPhase((p) => (p === 'filling' ? 'filled' : p));
    }

    function handleRetractEnd() {
        retractTimer.current = null;
        const next = pendingUidRef.current;
        pendingUidRef.current = null;
        if (next === null) {
            setBarUid(null);
            setBarPhase('hidden');
            return;
        }
        setBarUid(next);
        if (pinned && pinnedPerson?.uid === next) {
            setBarPhase('filled');
        } else {
            setBarPhase('filling');
            fillTimer.current = setTimeout(handleFillEnd, PIN_DELAY_MS);
        }
    }

    useEffect(() => {
        const uid = displayed?.uid ?? null;
        const curUid = barUidRef.current;
        const curPhase = barPhaseRef.current;

        if (uid === null) {
            if (curPhase === 'filled' || curPhase === 'filling') {
                clearBarTimers();
                pendingUidRef.current = null;
                setBarPhase('retracting');
                retractTimer.current = setTimeout(handleRetractEnd, RETRACT_MS);
            }
            return;
        }

        if (uid === curUid) {
            // Already tracking this person — nothing to do; any in-flight
            // fill/retract timer keeps running undisturbed.
            if (displayedIsPinned && curPhase !== 'filled' && curPhase !== 'filling') {
                clearBarTimers();
                setBarPhase('filled');
            }
            return;
        }

        // A different person is now displayed.
        clearBarTimers();
        if (curPhase === 'hidden') {
            setBarUid(uid);
            if (displayedIsPinned) {
                setBarPhase('filled');
            } else {
                setBarPhase('filling');
                fillTimer.current = setTimeout(handleFillEnd, PIN_DELAY_MS);
            }
        } else {
            // Slide the current bar back out first; handleRetractEnd (fired
            // by the timer above) switches it over to the new person.
            pendingUidRef.current = uid;
            setBarPhase('retracting');
            retractTimer.current = setTimeout(handleRetractEnd, RETRACT_MS);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- handleFillEnd/handleRetractEnd close over state via refs/functional updates, not via this effect's deps
    }, [displayed, displayedIsPinned]);

    // Avoid setState-after-unmount if a timer is still pending when this
    // page is navigated away from.
    useEffect(() => {
        return () => {
            clearBarTimers();
            if (panelReopenTimer.current) clearTimeout(panelReopenTimer.current);
        };
    }, []);

    useEffect(() => {
        if (!displayed) {
            setMedia([]);
            return;
        }
        let cancelled = false;
        fetchMediaForPerson(displayed.uid)
            .then((items) => { if (!cancelled) setMedia(items); })
            .catch(() => { if (!cancelled) setMedia([]); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the displayed person actually changes, not on every object identity change
    }, [displayed?.uid]);

    const photo = displayed?.profilePic ? resolveAssetUrl(displayed.profilePic) : placeholderPic;
    // The hover-prompt placeholder only makes sense before anyone has been
    // shown yet — once a real person is displayed, an empty note should
    // just stay empty rather than falling back to instructional copy.
    const bio = displayed ? (displayed.note || '') : t('toolbar.hoverPrompt');

    return (
        <div className={`toolbar${panelVisible ? ' toolbarVisible' : ''}${pinned ? ' toolbarPinned' : ''}`}>
            {pinned && (
                <button type="button" className="toolbarCloseBtn" onClick={unpin} aria-label={t('toolbar.close')}>×</button>
            )}
            <div className="toolbarAvatarWrap">
                <svg className="toolbarRing" viewBox="0 0 84 84">
                    <circle className="toolbarRingTrack" cx="42" cy="42" r="38" pathLength={100} />
                    <circle
                        className={`toolbarRingFill${barPhase !== 'hidden' ? ` toolbarRingFill--${barPhase}` : ''}`}
                        cx="42" cy="42" r="38" pathLength={100}
                    />
                </svg>
                <img src={photo} alt="" className="toolbarPhoto"/>
            </div>
            <div className="toolbarScroll">
                <div className='toolbarInfo'>
                    <p className="toolbarName">{displayed ? `${displayed.firstName} ${displayed.lastName}` : t('toolbar.noOneSelected')}</p>
                    {bio && <p className="toolbarNote">{bio}</p>}
                </div>
                <ul>
                    <li
                        className={!displayed ? 'disabled' : ''}
                        onClick={() => displayed && navigate(`/profile/${displayed.uid}`)}
                    >
                        {t('toolbar.personProfile')}
                    </li>
                    <li
                        className={!displayed ? 'disabled' : ''}
                        onClick={() => displayed && navigate(`/focus/${displayed.uid}`)}
                    >
                        {t('toolbar.focus')}
                    </li>
                    <li
                        className={!displayed ? 'disabled' : ''}
                        onClick={() => displayed && openAddUser(displayed.uid)}
                    >
                        {t('toolbar.addOffspring')}
                    </li>
                </ul>
                <p className='toolbarGalleryLabel'>{t('toolbar.gallery')}</p>
                <div className='toolbarGallery'>
                    {media.length === 0 && displayed && <p>{t('toolbar.noPhotosUploaded')}</p>}
                    {media.map((item) => (
                        <img
                            key={item.id}
                            src={resolveAssetUrl(item.file_url)}
                            alt={item.caption ?? ''}
                            className='toolbarGalleryPhoto'
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

export default Toolbar
