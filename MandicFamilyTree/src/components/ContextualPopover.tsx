import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './modules/ContextualPopover.css'
import placeholderPic from '../assets/placeholder.jpeg'
import { useHoveredPerson, PIN_DELAY_MS } from '../ui/HoveredPersonContext.tsx'
import { useAddUserPopup } from '../ui/AddUserPopupContext.tsx'
import { useBranch } from '../ui/BranchContext.tsx'
import { useLocale } from '../i18n/LocaleContext.tsx'
import { resolveAssetUrl } from '../api/client.ts'
import { fetchMediaForPerson } from '../api/media.ts'
import type { MediaItem } from '../api/media.ts'

// Tree-view-only replacement for Toolbar/SideBar: instead of a fixed panel
// on the screen edge, this anchors itself right next to whichever node is
// hovered (see HoveredPersonContext's hoveredRect/pinnedRect, reported by
// CustomNode's onMouseOver in PersonCard.tsx), with a small pointer tail
// connecting the two. Same dwell/pin state machine as Toolbar's bar — just
// drawn as a ring around the avatar — and the same actions/gallery.
type BarPhase = 'hidden' | 'filling' | 'filled' | 'retracting';
const RETRACT_MS = 350; // matches .popoverRingFill--retracting's transition duration
const MARGIN = 16; // keep-out distance from the viewport edge
const GAP = 32; // distance between the node and the popover's edge

function ContextualPopover() {
    const { hovered, hoveredRect, pinned, pinnedPerson, pinnedRect, unpin } = useHoveredPerson();
    const { open: openAddUser } = useAddUserPopup();
    const { activeBranch } = useBranch();
    const { t } = useLocale();
    const navigate = useNavigate();
    const [media, setMedia] = useState<MediaItem[]>([]);
    const panelRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ left: number; top: number; flipped: boolean } | null>(null);

    // While nothing is actively under the mouse, fall back to whoever got
    // pinned (2s dwell) rather than disappearing — mirrors Toolbar.
    const displayed = hovered ?? pinnedPerson;
    const anchorRect = hovered ? hoveredRect : pinnedRect;
    const displayedIsPinned = !!(pinned && pinnedPerson && displayed && pinnedPerson.uid === displayed.uid);

    // --- Dwell-progress ring ----------------------------------------------
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
            if (displayedIsPinned && curPhase !== 'filled' && curPhase !== 'filling') {
                clearBarTimers();
                setBarPhase('filled');
            }
            return;
        }

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
            pendingUidRef.current = uid;
            setBarPhase('retracting');
            retractTimer.current = setTimeout(handleRetractEnd, RETRACT_MS);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- handleFillEnd/handleRetractEnd close over state via refs/functional updates, not via this effect's deps
    }, [displayed, displayedIsPinned]);

    useEffect(() => {
        return () => clearBarTimers();
    }, []);

    // --- Gallery ------------------------------------------------------------
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

    // --- Position: anchor next to the node's on-screen rect, flipping to
    // the other side (and clamping) near viewport edges. Re-measured
    // whenever the panel's own content changes size (gallery loading in,
    // the dwell ring state changing), not continuously during panning —
    // see ContextualPopover.css for the tradeoff this implies.
    useLayoutEffect(() => {
        if (!anchorRect || !displayed) {
            setPos(null);
            return;
        }
        const el = panelRef.current;
        const w = el?.offsetWidth ?? 320;
        const h = el?.offsetHeight ?? 280;

        let flipped = false;
        let left = anchorRect.right + GAP;
        if (left + w + MARGIN > window.innerWidth) {
            flipped = true;
            left = anchorRect.left - GAP - w;
        }
        left = Math.max(MARGIN, Math.min(left, window.innerWidth - w - MARGIN));

        let top = anchorRect.top + anchorRect.height / 2 - h / 2;
        top = Math.max(MARGIN, Math.min(top, window.innerHeight - h - MARGIN));

        setPos({ left, top, flipped });
    }, [anchorRect, displayed, media.length, barPhase]);

    if (!displayed || !pos) return null;

    const photo = displayed.profilePic ? resolveAssetUrl(displayed.profilePic) : placeholderPic;

    return (
        <div
            ref={panelRef}
            className={`popoverCard${pos.flipped ? ' popoverFlipped' : ''}`}
            style={{ left: pos.left, top: pos.top }}
        >
            {displayedIsPinned && (
                <button type="button" className="popoverCloseBtn" onClick={unpin} aria-label={t('toolbar.close')}>×</button>
            )}
            <div className="popoverTopRow">
                <div className="popoverAvatarWrap">
                    <svg className="popoverRing" viewBox="0 0 48 48">
                        <circle className="popoverRingTrack" cx="24" cy="24" r="21" pathLength={100} />
                        <circle
                            className={`popoverRingFill${barPhase !== 'hidden' ? ` popoverRingFill--${barPhase}` : ''}`}
                            cx="24" cy="24" r="21" pathLength={100}
                        />
                    </svg>
                    <img src={photo} alt="" className="popoverPhoto" />
                </div>
                <div className="popoverHeadText">
                    <p className="popoverName">{displayed.firstName} {displayed.lastName}</p>
                    {displayed.note && <p className="popoverNote">{displayed.note}</p>}
                </div>
            </div>
            <ul className="popoverActions">
                <li onClick={() => navigate(`/profile/${displayed.uid}`)}>{t('toolbar.personProfile')}</li>
                <li onClick={() => navigate(`/focus/${displayed.uid}`)}>{t('toolbar.focus')}</li>
                <li onClick={() => openAddUser(displayed.uid)}>{t('toolbar.addOffspring')}</li>
                {activeBranch?.rootPersonId === displayed.uid && (
                    <li onClick={() => openAddUser(undefined, displayed.uid)}>{t('toolbar.addParent')}</li>
                )}
            </ul>
            <div>
                <p className="popoverGalleryLabel">{t('toolbar.gallery')}</p>
                <div className="popoverGallery">
                    {media.length === 0 && <p>{t('toolbar.noPhotosUploaded')}</p>}
                    {media.map((item) => (
                        <img
                            key={item.id}
                            src={resolveAssetUrl(item.file_url)}
                            alt={item.caption ?? ''}
                            className="popoverGalleryPhoto"
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

export default ContextualPopover
