import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header.tsx'
import Footer from '../components/Footer.tsx'
import AddUser from '../components/AddUser.tsx'
import PersonAvatar from '../components/PersonAvatar.tsx'
import { useAuth } from '../auth/AuthContext.tsx'
import { useBranch } from '../ui/BranchContext.tsx'
import { useAddUserPopup } from '../ui/AddUserPopupContext.tsx'
import { useLocale } from '../i18n/LocaleContext.tsx'
import { fetchPeople } from '../api/people.ts'
import type { Person } from '../data/mockDatabase.tsx'
import { renameBranch, uploadBranchPhoto } from '../api/branches.ts'
import { resolveAssetUrl, ApiRequestError } from '../api/client.ts'
import { onPersonAdded } from '../events.ts'
import pstyle from './modules/PersonProfile.module.css'
import style from './modules/BranchProfile.module.css'

function displayName(p: Person | undefined): string {
  if (!p) return '';
  return `${p.firstName} ${p.lastName ?? ''}`.trim();
}

// Two-letter monogram for a branch with no photo yet — first letters of
// its first two words ("Mandić Family" -> "MF"), or just its first two
// characters for a single-word name.
function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const second = parts.length > 1 ? parts[1][0] : (parts[0][1] ?? '');
  return `${first}${second}`.toUpperCase() || '?';
}

function BranchProfile() {
  const { id } = useParams<{ id: string }>();
  const branchId = Number(id);
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { t } = useLocale();
  const {
    branches,
    loading: branchesLoading,
    selectBranch,
    deleteBranch: deleteBranchApi,
    purgeBranch: purgeBranchApi,
    refreshBranches,
  } = useBranch();
  const { open: openAddUser } = useAddUserPopup();
  const isAdmin = user?.role === 'admin';
  const canAddPerson = user?.role === 'admin' || user?.role === 'editor';

  const branch = useMemo(() => branches.find((b) => b.id === branchId), [branches, branchId]);

  // Viewing a branch's page makes it the active one, so "Add Person" (and
  // every other page) ends up scoped to the branch actually being looked
  // at, not whatever was active before navigating here.
  useEffect(() => {
    if (branch) selectBranch(branch.id);
  }, [branch, selectBranch]);

  const [people, setPeople] = useState<Person[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [peopleError, setPeopleError] = useState(false);

  const loadPeople = useCallback(() => {
    if (!branchId) return;
    setPeopleLoading(true);
    fetchPeople(branchId)
      .then(setPeople)
      .catch(() => setPeopleError(true))
      .finally(() => setPeopleLoading(false));
  }, [branchId]);
  useEffect(loadPeople, [loadPeople]);
  useEffect(() => onPersonAdded(loadPeople), [loadPeople]);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [purgeConfirming, setPurgeConfirming] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
  const [purging, setPurging] = useState(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);

  function closePurgeModal() {
    if (purging) return;
    setPurgeConfirming(false);
    setPurgeConfirmText('');
    setPurgeError(null);
  }

  useEffect(() => {
    if (!purgeConfirming) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !purging) {
        setPurgeConfirming(false);
        setPurgeConfirmText('');
        setPurgeError(null);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [purgeConfirming, purging]);

  function startEditingName() {
    setNameDraft(branch?.name ?? '');
    setNameError(null);
    setEditingName(true);
  }

  async function handleSaveName(e: FormEvent) {
    e.preventDefault();
    if (!token || !branch || !nameDraft.trim()) return;
    setSavingName(true);
    setNameError(null);
    try {
      await renameBranch(branch.id, nameDraft.trim(), token);
      await refreshBranches();
      setEditingName(false);
    } catch (err) {
      setNameError(err instanceof ApiRequestError ? err.message : t('branchProfile.couldNotRename'));
    } finally {
      setSavingName(false);
    }
  }

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !token || !branch) return;
    setPhotoError(null);
    setUploadingPhoto(true);
    try {
      await uploadBranchPhoto(branch.id, file, token);
      await refreshBranches();
    } catch (err) {
      setPhotoError(err instanceof ApiRequestError ? err.message : t('branchProfile.couldNotUploadPhoto'));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleDeleteBranch() {
    if (!token || !branch) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteBranchApi(branch.id, token);
      navigate('/');
    } catch (err) {
      setDeleteError(err instanceof ApiRequestError ? err.message : t('branchProfile.couldNotDelete'));
      setDeleting(false);
    }
  }

  async function handlePurgeBranch() {
    if (!token || !branch || purgeConfirmText.trim() !== 'DELETE') return;
    setPurgeError(null);
    setPurging(true);
    try {
      await purgeBranchApi(branch.id, token);
      navigate('/');
    } catch (err) {
      setPurgeError(err instanceof ApiRequestError ? err.message : t('branchProfile.couldNotPurge'));
      setPurging(false);
    }
  }

  if (branchesLoading) {
    return (
      <div className={pstyle.rootDiv}>
        <Header />
        <div className={pstyle.content}><p className={pstyle.statusMessage}>{t('branchProfile.loading')}</p></div>
        <Footer />
      </div>
    );
  }

  if (!branch) {
    return (
      <div className={pstyle.rootDiv}>
        <Header />
        <div className={pstyle.content}><p className={pstyle.statusMessage}>{t('branchProfile.notFound')}</p></div>
        <Footer />
      </div>
    );
  }

  const rootPerson = branch.rootPersonId ? people.find((p) => p.uid === branch.rootPersonId) : undefined;

  return (
    <div className={pstyle.rootDiv}>
      <Header />
      <AddUser />
      <div className={pstyle.content}>
        <div className={pstyle.actions}>
          <button
            type="button"
            className={pstyle.backBtn}
            title={t('branchProfile.back')}
            aria-label={t('branchProfile.back')}
            onClick={() => navigate(-1)}
          >
            ←
          </button>
          {isAdmin && (
            <div className={style.topRightActions}>
              {deleteConfirming ? (
                <>
                  <span className={pstyle.confirmPrompt}>
                    {t('branchProfile.confirmDeletePrompt', { name: branch.name, count: people.length })}
                  </span>
                  <button type="button" className={pstyle.danger} onClick={handleDeleteBranch} disabled={deleting}>
                    {deleting ? t('branchProfile.deleting') : t('branchProfile.confirmDelete')}
                  </button>
                  <button type="button" className={pstyle.secondary} onClick={() => setDeleteConfirming(false)} disabled={deleting}>
                    {t('branchProfile.cancel')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={style.iconBtnDanger}
                    title={t('branchProfile.deleteBranch')}
                    aria-label={t('branchProfile.deleteBranch')}
                    onClick={() => setDeleteConfirming(true)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={style.iconBtnDanger + ' ' + style.iconBtnDangerFilled}
                    title={t('branchProfile.purgeBranch')}
                    aria-label={t('branchProfile.purgeBranch')}
                    onClick={() => setPurgeConfirming(true)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        {deleteError && <p className={pstyle.error}>{deleteError}</p>}

        {editingName && (
          <form className={pstyle.section + ' ' + pstyle.form} onSubmit={handleSaveName}>
            <div className={pstyle.field + ' ' + pstyle.fieldWide}>
              <label>{t('branchProfile.nameLabel')}</label>
              <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} required />
            </div>
            {nameError && <p className={pstyle.error + ' ' + pstyle.fieldWide}>{nameError}</p>}
            <div className={pstyle.formActions}>
              <button type="submit" disabled={savingName}>
                {savingName ? t('branchProfile.saving') : t('branchProfile.saveChanges')}
              </button>
              <button type="button" className={pstyle.secondary} onClick={() => setEditingName(false)}>
                {t('branchProfile.cancel')}
              </button>
            </div>
          </form>
        )}

        <div className={style.dossierGridBranch}>
          <div className={pstyle.dossierCard}>
            <div
              className={style.avatarWrap}
              style={{ cursor: isAdmin ? 'pointer' : 'default' }}
              onClick={isAdmin ? () => fileInputRef.current?.click() : undefined}
              role={isAdmin ? 'button' : undefined}
              tabIndex={isAdmin ? 0 : undefined}
              title={isAdmin ? t('branchProfile.changePhoto') : undefined}
            >
              {branch.photoUrl ? (
                <img src={resolveAssetUrl(branch.photoUrl)} alt="" className={pstyle.cardAvatar} />
              ) : (
                <div className={`${pstyle.cardAvatar} ${style.monogram}`}>{initialsFor(branch.name)}</div>
              )}
            </div>
            {isAdmin && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className={style.hiddenFileInput}
                  onChange={handlePhotoChange}
                />
                <button
                  type="button"
                  className={style.changePhotoLink}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? t('branchProfile.uploading') : t('branchProfile.changePhoto')}
                </button>
              </>
            )}
            <h1 className={pstyle.cardName}>
              {branch.name}
              {isAdmin && !editingName && (
                <button
                  type="button"
                  className={style.editNameBtn}
                  title={t('branchProfile.rename')}
                  aria-label={t('branchProfile.rename')}
                  onClick={startEditingName}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              )}
            </h1>
            <p className={pstyle.cardMeta}>
              {t('branchProfile.createdOn', { date: branch.createdAt.slice(0, 10) })}
            </p>
            {photoError && <p className={pstyle.error}>{photoError}</p>}
          </div>

          <div className={pstyle.sideCol}>
            <div className={pstyle.shelf}>
              <h3>{t('branchProfile.record')}</h3>
              <div className={pstyle.fact}>
                <span>{t('branchProfile.people')}</span>
                <span>{people.length}</span>
              </div>
              <div className={pstyle.fact}>
                <span>{t('branchProfile.rootPerson')}</span>
                <span>
                  {branch.rootPersonId ? (
                    <Link to={`/profile/${branch.rootPersonId}`} className={style.rootLink}>
                      {displayName(rootPerson) || '…'}
                    </Link>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={pstyle.shelf + ' ' + pstyle.section}>
          <h3>{t('branchProfile.members')} — {people.length}</h3>
          {peopleError && <p className={pstyle.error}>{t('branchProfile.loadError')}</p>}
          {!peopleLoading && !peopleError && people.length === 0 && !canAddPerson ? (
            <p className={pstyle.shelfEmpty}>{t('branchProfile.noMembers')}</p>
          ) : (
            <div className={style.membersGrid}>
              {people.map((p) => (
                <div key={p.uid} className={pstyle.chip}>
                  <div className={pstyle.chipAvatarWrap}>
                    <PersonAvatar person={p} className={pstyle.chipAvatar} />
                  </div>
                  <Link to={`/profile/${p.uid}`} className={pstyle.chipName}>{displayName(p)}</Link>
                </div>
              ))}
              {canAddPerson && (
                <button
                  type="button"
                  className={style.addMemberBtn}
                  title={t('branchProfile.addPerson')}
                  aria-label={t('branchProfile.addPerson')}
                  onClick={() => openAddUser()}
                >
                  +
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {purgeConfirming && (
        <>
          <div className={style.purgeOverlay} onClick={closePurgeModal} />
          <div className={style.purgePopup} role="dialog" aria-modal="true" aria-label={t('branchProfile.purgeTitle')}>
            <h2>{t('branchProfile.purgeTitle')}</h2>
            <p className={style.purgeWarning}>
              {t('branchProfile.purgeWarning', { name: branch.name, count: people.length })}
            </p>
            <p className={style.purgeWarning}>{t('branchProfile.purgeInstructions')}</p>
            <input
              className={style.purgeInput}
              value={purgeConfirmText}
              onChange={(e) => setPurgeConfirmText(e.target.value)}
              placeholder={t('branchProfile.purgeConfirmPlaceholder')}
              autoFocus
              disabled={purging}
            />
            {purgeError && <p className={pstyle.error}>{purgeError}</p>}
            <div className={style.purgeActions}>
              <button type="button" className={style.purgeCancelBtn} onClick={closePurgeModal} disabled={purging}>
                {t('branchProfile.cancel')}
              </button>
              <button
                type="button"
                className={style.purgeConfirmBtn}
                onClick={handlePurgeBranch}
                disabled={purging || purgeConfirmText.trim() !== 'DELETE'}
              >
                {purging ? t('branchProfile.deleting') : t('branchProfile.purgeConfirmButton')}
              </button>
            </div>
          </div>
        </>
      )}
      <Footer />
    </div>
  );
}

export default BranchProfile
