import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header.tsx'
import Footer from '../components/Footer.tsx'
import PersonCard from '../components/PersonCard.tsx'
import PersonAvatar from '../components/PersonAvatar.tsx'
import AddUser from '../components/AddUser.tsx'
import style from './modules/Overview.module.css'
import SideBar from '../components/SideBar.tsx'
import Toolbar from '../components/Toolbar.tsx'
import { fetchPeople } from '../api/people.ts'
import type { Person } from '../data/mockDatabase.tsx'
import { onPersonAdded } from '../events.ts'
import { needsReview } from '../utils/review.ts'
import { yearsRange } from '../utils/personDates.ts'
import { useLocale } from '../i18n/LocaleContext.tsx'
import { useHoveredPerson } from '../ui/HoveredPersonContext.tsx'
import { useBranch } from '../ui/BranchContext.tsx'

type SortKey = 'name-asc' | 'name-desc' | 'birth-asc' | 'birth-desc';
type ViewMode = 'grid' | 'list';

const PAGE_SIZE = 60;

// Fixed candidate set for the A–Z jump rail — standard Latin alphabet plus
// the handful of extra Serbian-Latin letters (Č Ć Đ Š Ž), rather than
// trying to interleave them into "correct" collation order. Letters with
// no matching person are rendered dimmed rather than left out, so the
// rail's shape doesn't jump around as filters change.
const JUMP_ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), 'Č', 'Ć', 'Đ', 'Š', 'Ž'];

function birthYear(p: Person): number {
    const raw = p.dateOfBirth as unknown as string | undefined;
    const year = raw ? Number(raw.slice(0, 4)) : NaN;
    return Number.isFinite(year) ? year : Number.POSITIVE_INFINITY;
}

function fullName(p: Person): string {
    return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim().toLowerCase();
}

function displayFullName(p: Person): string {
    return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
}

// Which A–Z rail bucket a person belongs in — first letter of their first
// name, uppercased, matching the same string sortPeople() compares on.
function sectionLetterFor(p: Person): string {
    const ch = fullName(p).trim()[0];
    return ch ? ch.toUpperCase() : '#';
}

function sortPeople(list: Person[], sortKey: SortKey): Person[] {
    const sorted = [...list];
    switch (sortKey) {
        case 'name-desc':
            sorted.sort((a, b) => fullName(b).localeCompare(fullName(a)));
            break;
        case 'birth-asc':
            sorted.sort((a, b) => birthYear(a) - birthYear(b));
            break;
        case 'birth-desc':
            sorted.sort((a, b) => (birthYear(b) === Number.POSITIVE_INFINITY ? -1 : birthYear(b)) - (birthYear(a) === Number.POSITIVE_INFINITY ? -1 : birthYear(a)));
            break;
        case 'name-asc':
        default:
            sorted.sort((a, b) => fullName(a).localeCompare(fullName(b)));
    }
    return sorted;
}

type Group = { letter: string | null; people: Person[] };

function GridIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <rect x="0" y="0" width="6" height="6" rx="1.2" fill="currentColor" />
            <rect x="8" y="0" width="6" height="6" rx="1.2" fill="currentColor" />
            <rect x="0" y="8" width="6" height="6" rx="1.2" fill="currentColor" />
            <rect x="8" y="8" width="6" height="6" rx="1.2" fill="currentColor" />
        </svg>
    );
}

function ListIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <rect x="0" y="0.8" width="14" height="2.4" rx="1.2" fill="currentColor" />
            <rect x="0" y="5.8" width="14" height="2.4" rx="1.2" fill="currentColor" />
            <rect x="0" y="10.8" width="14" height="2.4" rx="1.2" fill="currentColor" />
        </svg>
    );
}

function Overview() {
    const navigate = useNavigate();
    const { t } = useLocale();
    const { setHovered } = useHoveredPerson();
    const { activeBranch } = useBranch();
    const [people, setPeople] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('name-asc');
    const [reviewOnly, setReviewOnly] = useState(false);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    // A pending A–Z rail target lives in a ref, not state — writing it
    // doesn't need to trigger a render, and consuming it inside the effect
    // below (via a ref mutation, not setState) avoids a cascading-render
    // lint violation from calling a state setter inside an effect body.
    const scrollTargetRef = useRef<string | null>(null);

    // The toolbar wraps onto a second line at common widths (and more
    // readily in Serbian, whose labels run longer), so its height isn't a
    // fixed constant — section headers below need to stick right under it,
    // not at a guessed pixel value, or a sticky header ends up bleeding
    // through mid-toolbar as a stray line. Measured via ResizeObserver and
    // fed to the CSS as a custom property instead.
    const toolbarRef = useRef<HTMLDivElement>(null);
    const [toolbarHeight, setToolbarHeight] = useState(64);

    useEffect(() => {
        const el = toolbarRef.current;
        if (!el) return;
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) setToolbarHeight(Math.ceil(entry.contentRect.height));
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const load = useCallback(() => {
        let cancelled = false;
        fetchPeople(activeBranch?.id)
            .then((data) => {
                if (!cancelled) setPeople(data);
            })
            .catch(() => {
                if (!cancelled) setError(t('overview.loadError'));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [t, activeBranch?.id]);

    useEffect(load, [load]);
    useEffect(() => onPersonAdded(load), [load]);

    const normalizedQuery = query.trim().toLowerCase();

    // Re-start pagination from the first page whenever the filters change,
    // otherwise "load more" clicks from a previous, larger result set would
    // leave visibleCount stuck past the end of a newly narrowed-down list.
    // Adjusting state during render (rather than in an effect) is the
    // pattern React recommends for "reset this when that prop/input
    // changes" — see https://react.dev/learn/you-might-not-need-an-effect.
    const filterSignature = `${normalizedQuery}|${sortKey}|${reviewOnly}`;
    const [prevFilterSignature, setPrevFilterSignature] = useState(filterSignature);
    if (filterSignature !== prevFilterSignature) {
        setPrevFilterSignature(filterSignature);
        setVisibleCount(PAGE_SIZE);
    }
    const filteredPeople = useMemo(() => {
        let list = people;
        if (normalizedQuery) {
            list = list.filter((p) => fullName(p).includes(normalizedQuery));
        }
        if (reviewOnly) {
            list = list.filter(needsReview);
        }
        return sortPeople(list, sortKey);
    }, [people, normalizedQuery, reviewOnly, sortKey]);

    const visiblePeople = filteredPeople.slice(0, visibleCount);
    const hasMore = visibleCount < filteredPeople.length;

    // The A–Z rail only makes sense when sorted by name — grouping entries
    // by birth year under alphabet letters would be meaningless.
    const isNameSorted = sortKey === 'name-asc' || sortKey === 'name-desc';

    // Grouped by A–Z letter (when name-sorted) so each group can carry its
    // own sticky header plus its own small grid/list of cards — rather than
    // one giant grid spanning the whole page with headers mixed in as
    // full-width items, which is what made sticky positioning behave
    // unreliably here (see the comment on .overview in the CSS module).
    const groups = useMemo<Group[]>(() => {
        if (!isNameSorted) {
            return visiblePeople.length > 0 ? [{ letter: null, people: visiblePeople }] : [];
        }
        const result: Group[] = [];
        for (const person of visiblePeople) {
            const letter = sectionLetterFor(person);
            const last = result[result.length - 1];
            if (last && last.letter === letter) {
                last.people.push(person);
            } else {
                result.push({ letter, people: [person] });
            }
        }
        return result;
    }, [visiblePeople, isNameSorted]);

    // Letters present anywhere in the filtered set (not just the currently
    // paginated slice), so the rail reflects what's actually reachable.
    const availableLetters = useMemo(() => {
        if (!isNameSorted) return new Set<string>();
        return new Set(filteredPeople.map(sectionLetterFor));
    }, [filteredPeople, isNameSorted]);

    // Scrolls a section header into view once it's actually rendered —
    // bumping visibleCount (if the letter isn't loaded yet) happens first,
    // and this effect fires again once that re-render has the element in
    // the DOM to scroll to.
    useEffect(() => {
        const letter = scrollTargetRef.current;
        if (!letter) return;
        const el = document.getElementById(`overview-section-${letter}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            scrollTargetRef.current = null;
        }
    }, [visibleCount]);

    function jumpToLetter(letter: string) {
        const idx = filteredPeople.findIndex((p) => sectionLetterFor(p) === letter);
        if (idx === -1) return;
        scrollTargetRef.current = letter;
        if (idx + 1 > visibleCount) {
            setVisibleCount(Math.min(filteredPeople.length, idx + PAGE_SIZE));
        } else {
            const el = document.getElementById(`overview-section-${letter}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            scrollTargetRef.current = null;
        }
    }

    return(
        <>
            <div className={style.rootDiv}>
                <Header></Header>
                <AddUser></AddUser>
                <SideBar></SideBar>
                <Toolbar></Toolbar>
                <div
                    className={style.overview}
                    style={{ '--toolbar-h': `${toolbarHeight}px` } as CSSProperties}
                >
                    <div className={style.toolbar} ref={toolbarRef}>
                        <div className={style.toolbarGroup}>
                            <input
                                type="search"
                                className={style.searchInput}
                                placeholder={t('overview.searchPlaceholder')}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                aria-label={t('overview.searchAriaLabel')}
                            />
                            <select
                                className={style.sortSelect}
                                value={sortKey}
                                onChange={(e) => setSortKey(e.target.value as SortKey)}
                                aria-label={t('overview.sortAriaLabel')}
                            >
                                <option value="name-asc">{t('overview.sortNameAsc')}</option>
                                <option value="name-desc">{t('overview.sortNameDesc')}</option>
                                <option value="birth-asc">{t('overview.sortBirthAsc')}</option>
                                <option value="birth-desc">{t('overview.sortBirthDesc')}</option>
                            </select>
                            <label className={style.reviewToggle}>
                                <input
                                    type="checkbox"
                                    checked={reviewOnly}
                                    onChange={(e) => setReviewOnly(e.target.checked)}
                                />
                                {t('overview.needsReviewOnly')}
                            </label>
                        </div>
                        <div className={style.toolbarGroup}>
                            {!loading && !error && (
                                <span className={style.resultCount}>
                                    {t('overview.showingCount', { shown: visiblePeople.length, total: filteredPeople.length })}
                                </span>
                            )}
                            <div className={style.viewToggle}>
                                <button
                                    type="button"
                                    className={viewMode === 'grid' ? `${style.viewBtn} ${style.viewBtnActive}` : style.viewBtn}
                                    onClick={() => setViewMode('grid')}
                                    aria-label={t('overview.viewGrid')}
                                    title={t('overview.viewGrid')}
                                >
                                    <GridIcon />
                                </button>
                                <button
                                    type="button"
                                    className={viewMode === 'list' ? `${style.viewBtn} ${style.viewBtnActive}` : style.viewBtn}
                                    onClick={() => setViewMode('list')}
                                    aria-label={t('overview.viewList')}
                                    title={t('overview.viewList')}
                                >
                                    <ListIcon />
                                </button>
                            </div>
                        </div>
                    </div>
                    {loading && <p className={style.noResults}>{t('overview.loadingMembers')}</p>}
                    {error && <p className={style.noResults}>{error}</p>}
                    {!loading && !error && filteredPeople.length === 0 && (
                        <p className={style.noResults}>
                            {reviewOnly ? t('overview.noMatchesReview') : t('overview.noMatchesQuery', { query })}
                        </p>
                    )}
                    {!loading && !error && groups.map((group) => (
                        <div key={group.letter ?? 'all'} className={style.sectionGroup}>
                            {group.letter && (
                                <div
                                    id={`overview-section-${group.letter}`}
                                    className={style.sectionHeader}
                                >
                                    {group.letter}
                                </div>
                            )}
                            <div className={viewMode === 'grid' ? style.cardGrid : style.cardList}>
                                {group.people.map((person) => (
                                    viewMode === 'list' ? (
                                        <div
                                            key={person.uid}
                                            className={style.listRow}
                                            onClick={() => navigate(`/profile/${person.uid}`)}
                                            onMouseOver={() => setHovered(person)}
                                            onMouseOut={() => setHovered(null)}
                                        >
                                            <PersonAvatar person={person} className={style.listAvatar} />
                                            <span className={style.listName}>{displayFullName(person)}</span>
                                            <span className={style.listYears}>{yearsRange(person)}</span>
                                            {needsReview(person) && (
                                                <span className={style.listReviewBadge} title={t('personCard.reviewTitle')}>
                                                    {t('personCard.reviewBadge')}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div
                                            key={person.uid}
                                            onClick={() => navigate(`/profile/${person.uid}`)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <PersonCard person={person} />
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    ))}
                    {!loading && !error && hasMore && (
                        <div className={style.loadMoreRow}>
                            <button
                                type="button"
                                className={style.loadMoreBtn}
                                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                            >
                                {t('overview.loadMore', { count: filteredPeople.length - visibleCount })}
                            </button>
                        </div>
                    )}
                </div>
                {isNameSorted && !loading && !error && filteredPeople.length > 0 && (
                    <div className={style.jumpRail}>
                        {JUMP_ALPHABET.map((letter) => (
                            <button
                                key={letter}
                                type="button"
                                className={availableLetters.has(letter) ? style.jumpBtn : `${style.jumpBtn} ${style.jumpBtnDisabled}`}
                                disabled={!availableLetters.has(letter)}
                                onClick={() => jumpToLetter(letter)}
                                aria-label={t('overview.jumpToLetter', { letter })}
                            >
                                {letter}
                            </button>
                        ))}
                    </div>
                )}
                <Footer></Footer>
            </div>
        </>
    )
}
export default Overview
