import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header.tsx'
import Footer from '../components/Footer.tsx'
import PersonPickerModal from '../components/PersonPickerModal.tsx'
import MediaUploadModal from '../components/MediaUploadModal.tsx'
import { useAuth } from '../auth/AuthContext.tsx'
import {
  fetchPeople,
  updatePerson,
  createRelationship,
  deleteRelationship,
  deletePerson,
} from '../api/people.ts'
import type { Person } from '../data/mockDatabase.tsx'
import { resolveAssetUrl } from '../api/client.ts'
import { uploadMedia, fetchMediaForPerson } from '../api/media.ts'
import type { MediaItem } from '../api/media.ts'
import { ApiRequestError } from '../api/client.ts'
import { notifyPersonAdded, onPersonAdded } from '../events.ts'
import { needsReview } from '../utils/review.ts'
import { useLocale } from '../i18n/LocaleContext.tsx'
import PersonAvatar from '../components/PersonAvatar.tsx'
import style from './modules/PersonProfile.module.css'

type RelationshipKind = 'child' | 'parent' | 'spouse';

function formatDate(iso?: string): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function displayName(p: Person | undefined, unknownLabel: string): string {
  if (!p) return unknownLabel;
  return `${p.firstName} ${p.lastName}`.trim();
}

// A compact "b. 1950" / "1952–2015" label for a shelf row or children chip —
// the dossier concept's shorthand for a lifespan, shown alongside the name
// rather than the full dates the main card and record panel use.
function lifespanLabel(p: Person | undefined): string {
  if (!p) return '';
  const by = p.dateOfBirth ? String(p.dateOfBirth).slice(0, 4) : '';
  const dy = p.dateOfDeath ? String(p.dateOfDeath).slice(0, 4) : '';
  if (dy) return `${by || '?'}–${dy}`;
  if (by) return `b. ${by}`;
  return '';
}

function PersonProfile() {
  const { id } = useParams<{ id: string }>();
  const uid = Number(id);
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { t } = useLocale();
  const canEdit = user?.role === 'admin' || user?.role === 'editor';

  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', maidenName: '', gender: '',
    dateOfBirth: '', dateOfDeath: '', residency: '', note: '',
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Which section's "Add ___" button opened the picker modal, if any —
  // drives both which modal is shown and which relationship type gets
  // created when a person is picked from it.
  const [pickerKind, setPickerKind] = useState<RelationshipKind | null>(null);
  const [relError, setRelError] = useState<string | null>(null);
  const [relErrorKind, setRelErrorKind] = useState<RelationshipKind | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [uploadKind, setUploadKind] = useState<'photo' | 'document'>('photo');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  function load() {
    fetchPeople()
      .then(setPeople)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  // uid changes without the component remounting (clicking a relationship
  // link just swaps the :id route param), so this is memoized on uid and
  // re-subscribed below rather than captured once in a deps-[] effect —
  // otherwise the subscription would keep refetching media for whichever
  // person was on screen when the component first mounted.
  const loadMedia = useCallback(() => {
    if (!uid) return;
    fetchMediaForPerson(uid)
      .then(setMedia)
      .catch(() => setMediaError(t('personProfile.couldNotLoadPhotos')));
  }, [uid, t]);

  useEffect(load, [uid]);
  useEffect(loadMedia, [loadMedia]);
  useEffect(() => onPersonAdded(load), []);
  useEffect(() => onPersonAdded(loadMedia), [loadMedia]);

  const person = useMemo(() => people.find((p) => p.uid === uid), [people, uid]);
  const peopleById = useMemo(() => new Map(people.map((p) => [p.uid, p])), [people]);

  useEffect(() => {
    if (person) {
      setForm({
        firstName: person.firstName ?? '',
        lastName: person.lastName ?? '',
        maidenName: person.maidenName ?? '',
        gender: person.gender ?? '',
        dateOfBirth: formatDate(person.dateOfBirth as unknown as string),
        dateOfDeath: formatDate(person.dateOfDeath as unknown as string),
        residency: person.residency ?? '',
        note: person.note ?? '',
      });
    }
  }, [person]);

  function updateField(field: keyof typeof form) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!token || !person) return;
    setSaveError(null);
    setSaving(true);
    try {
      await updatePerson(person.uid, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        maidenName: form.maidenName.trim() || undefined,
        gender: form.gender || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        dateOfDeath: form.dateOfDeath || undefined,
        residency: form.residency.trim() || undefined,
        note: form.note.trim() || undefined,
      }, token);
      notifyPersonAdded();
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof ApiRequestError ? err.message : t('personProfile.couldNotSaveChanges'));
    } finally {
      setSaving(false);
    }
  }

  async function handleGalleryUpload(e: FormEvent) {
    e.preventDefault();
    const fileInput = (e.target as HTMLFormElement).elements.namedItem('file') as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file || !token || !person) return;
    setUploadError(null);
    setUploadingMedia(true);
    try {
      await uploadMedia(person.uid, file, uploadKind, token, uploadCaption.trim() || undefined);
      setUploadCaption('');
      if (fileInput) fileInput.value = '';
      setShowUploadModal(false);
      loadMedia();
      // Refreshes `person.profilePic` too, in case this was the first photo
      // ever uploaded (the only case the backend auto-adopts it as the
      // profile picture — see server/src/routes/media.ts).
      if (uploadKind === 'photo') notifyPersonAdded();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t('personProfile.couldNotUploadFile'));
    } finally {
      setUploadingMedia(false);
    }
  }

  async function handleAddRelationship(kind: RelationshipKind, targetId: number) {
    if (!token || !person) return;
    setRelError(null);
    setRelErrorKind(null);
    setPickerKind(null);
    try {
      if (kind === 'child') {
        await createRelationship({ personAId: person.uid, personBId: targetId, type: 'parent_of' }, token);
      } else if (kind === 'parent') {
        await createRelationship({ personAId: targetId, personBId: person.uid, type: 'parent_of' }, token);
      } else {
        await createRelationship({ personAId: person.uid, personBId: targetId, type: 'spouse_of' }, token);
      }
      notifyPersonAdded();
    } catch (err) {
      setRelError(err instanceof ApiRequestError ? err.message : t('personProfile.couldNotAddRelationship'));
      setRelErrorKind(kind);
    }
  }

  async function handleRemoveRelationship(kind: RelationshipKind, otherId: number) {
    if (!token || !person) return;
    const key = `${kind}-${otherId}`;
    setRelError(null);
    setRemovingKey(key);
    try {
      if (kind === 'child') {
        await deleteRelationship({ personAId: person.uid, personBId: otherId, type: 'parent_of' }, token);
      } else if (kind === 'parent') {
        await deleteRelationship({ personAId: otherId, personBId: person.uid, type: 'parent_of' }, token);
      } else {
        await deleteRelationship({ personAId: person.uid, personBId: otherId, type: 'spouse_of' }, token);
      }
      notifyPersonAdded();
    } catch (err) {
      setRelError(err instanceof ApiRequestError ? err.message : t('personProfile.couldNotRemoveRelationship'));
    } finally {
      setRemovingKey(null);
    }
  }

  async function handleSetProfilePhoto(fileUrl: string) {
    if (!token || !person) return;
    setUploadError(null);
    try {
      await updatePerson(person.uid, { profilePic: fileUrl }, token);
      notifyPersonAdded();
    } catch (err) {
      setUploadError(err instanceof ApiRequestError ? err.message : t('personProfile.couldNotSetProfilePhoto'));
    }
  }

  async function handleDeletePerson() {
    if (!token || !person) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await deletePerson(person.uid, token);
      notifyPersonAdded();
      navigate('/overview');
    } catch (err) {
      setDeleteError(err instanceof ApiRequestError ? err.message : t('personProfile.couldNotDeletePerson'));
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className={style.rootDiv}>
        <Header></Header>
        <div className={style.content}><p className={style.statusMessage}>{t('personProfile.loading')}</p></div>
        <Footer></Footer>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className={style.rootDiv}>
        <Header></Header>
        <div className={style.content}><p className={style.statusMessage}>{error ? t('personProfile.loadError') : t('personProfile.personNotFound')}</p></div>
        <Footer></Footer>
      </div>
    );
  }

  const otherPeople = people.filter((p) => p.uid !== person.uid);
  // Per-section candidate lists, each excluding whoever's already linked
  // in that role, so the picker doesn't offer someone already listed.
  const parentCandidates = otherPeople.filter((p) => !person.parentUid.includes(p.uid));
  const spouseCandidates = otherPeople.filter((p) => !(person.spouseUid ?? []).includes(p.uid));
  const childCandidates = otherPeople.filter((p) => !person.offspringUid.includes(p.uid));
  const pickerConfig = pickerKind && {
    parent: { title: t('personProfile.addParent'), people: parentCandidates },
    spouse: { title: t('personProfile.addSpouse'), people: spouseCandidates },
    child: { title: t('personProfile.addChild'), people: childCandidates },
  }[pickerKind];

  return (
    <div className={style.rootDiv}>
      <Header></Header>
      <div className={style.content}>
        <div className={style.actions}>
          <button
            type="button"
            className={style.backBtn}
            title={t('personProfile.back')}
            aria-label={t('personProfile.back')}
            onClick={() => navigate(-1)}
          >
            ←
          </button>
          <button type="button" className={style.secondary} onClick={() => navigate(`/focus/${person.uid}`)}>
            {t('personProfile.viewInFocus')}
          </button>
          <button type="button" className={style.secondary} onClick={() => navigate('/', { state: { focusUid: person.uid } })}>
            {t('personProfile.viewInTree')}
          </button>
          {canEdit && (
            <button type="button" className={style.secondary} onClick={() => setEditing((v) => !v)}>
              {editing ? t('personProfile.cancelEdit') : t('personProfile.editDetails')}
            </button>
          )}
          {canEdit && (
            !deleteConfirming ? (
              <button type="button" className={style.danger} onClick={() => setDeleteConfirming(true)}>
                {t('personProfile.deletePerson')}
              </button>
            ) : (
              <>
                <span className={style.confirmPrompt}>
                  {t('personProfile.confirmDeletePrompt', { name: displayName(person, t('personProfile.unknown')) })}
                </span>
                <button type="button" className={style.danger} onClick={handleDeletePerson} disabled={deleting}>
                  {deleting ? t('personProfile.deleting') : t('personProfile.confirmDelete')}
                </button>
                <button type="button" className={style.secondary} onClick={() => setDeleteConfirming(false)} disabled={deleting}>
                  {t('personProfile.cancel')}
                </button>
              </>
            )
          )}
        </div>
        {deleteError && <p className={style.error}>{deleteError}</p>}

        {editing && (
          <form className={style.section + ' ' + style.form} onSubmit={handleSave}>
            <div className={style.field}>
              <label>{t('personProfile.firstNameLabel')}</label>
              <input value={form.firstName} onChange={updateField('firstName')} required />
            </div>
            <div className={style.field}>
              <label>{t('personProfile.lastNameLabel')}</label>
              <input value={form.lastName} onChange={updateField('lastName')} />
            </div>
            <div className={style.field}>
              <label>{t('personProfile.maidenNameLabel')}</label>
              <input value={form.maidenName} onChange={updateField('maidenName')} />
            </div>
            <div className={style.field}>
              <label>{t('personProfile.genderLabel')}</label>
              <input value={form.gender} onChange={updateField('gender')} />
            </div>
            <div className={style.field}>
              <label>{t('personProfile.dobLabel')}</label>
              <input type="date" value={form.dateOfBirth} onChange={updateField('dateOfBirth')} />
            </div>
            <div className={style.field}>
              <label>{t('personProfile.dodLabel')}</label>
              <input type="date" value={form.dateOfDeath} onChange={updateField('dateOfDeath')} />
            </div>
            <div className={style.field}>
              <label>{t('personProfile.residencyLabel')}</label>
              <input value={form.residency} onChange={updateField('residency')} />
            </div>
            <div className={style.field + ' ' + style.fieldWide}>
              <label>{t('personProfile.notesLabel')}</label>
              <textarea rows={4} value={form.note} onChange={updateField('note')} />
            </div>
            {saveError && <p className={style.error + ' ' + style.fieldWide}>{saveError}</p>}
            <div className={style.formActions}>
              <button type="submit" disabled={saving}>{saving ? t('personProfile.saving') : t('personProfile.saveChanges')}</button>
            </div>
          </form>
        )}

        {/* The dossier: parents + spouses shelved on one side, the person
            themself as a centered ID card, and a record panel of counts on
            the other — modeled on the "Dossier" focus-page concept, adapted
            from a couple's record to one person's. */}
        <div className={style.dossierGrid}>
          <div className={style.sideCol}>
            <div className={style.shelf}>
              <h3>{t('personProfile.parents')}</h3>
              {person.parentUid.length === 0 ? (
                <p className={style.shelfEmpty}>{t('personProfile.noParentsOnRecord')}</p>
              ) : (
                person.parentUid.map((pid) => {
                  const rp = peopleById.get(pid);
                  return (
                    <div key={pid} className={style.shelfRow}>
                      {rp ? (
                        <PersonAvatar person={rp} className={style.shelfAvatar} />
                      ) : (
                        <div className={style.shelfAvatarGhost}>?</div>
                      )}
                      <Link to={`/profile/${pid}`} className={style.shelfName}>
                        <span>{displayName(rp, t('personProfile.unknown'))}</span>
                        {lifespanLabel(rp) && <span className={style.shelfYears}>{lifespanLabel(rp)}</span>}
                      </Link>
                      {canEdit && (
                        <button
                          type="button"
                          className={style.unlinkBtn}
                          title={t('personProfile.removeParentTitle')}
                          disabled={removingKey === `parent-${pid}`}
                          onClick={() => handleRemoveRelationship('parent', pid)}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })
              )}
              {canEdit && (
                <button type="button" className={style.ghostRow} onClick={() => setPickerKind('parent')}>
                  <span className={style.ghostCircle}>+</span>
                  <span className={style.ghostLabel}>{t('personProfile.addParent')}</span>
                </button>
              )}
              {relErrorKind === 'parent' && relError && <p className={style.error}>{relError}</p>}
            </div>

            <div className={style.shelf}>
              <h3>{t('personProfile.spouses')}</h3>
              {!person.spouseUid || person.spouseUid.length === 0 ? (
                <p className={style.shelfEmpty}>{t('personProfile.noneOnRecord')}</p>
              ) : (
                person.spouseUid.map((sid) => {
                  const rs = peopleById.get(sid);
                  return (
                    <div key={sid} className={style.shelfRow}>
                      {rs ? (
                        <PersonAvatar person={rs} className={style.shelfAvatar} />
                      ) : (
                        <div className={style.shelfAvatarGhost}>?</div>
                      )}
                      <Link to={`/profile/${sid}`} className={style.shelfName}>
                        <span>{displayName(rs, t('personProfile.unknown'))}</span>
                        {lifespanLabel(rs) && <span className={style.shelfYears}>{lifespanLabel(rs)}</span>}
                      </Link>
                      {canEdit && (
                        <button
                          type="button"
                          className={style.unlinkBtn}
                          title={t('personProfile.removeSpouseTitle')}
                          disabled={removingKey === `spouse-${sid}`}
                          onClick={() => handleRemoveRelationship('spouse', sid)}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })
              )}
              {canEdit && (
                <button type="button" className={style.ghostRow} onClick={() => setPickerKind('spouse')}>
                  <span className={style.ghostCircle}>+</span>
                  <span className={style.ghostLabel}>{t('personProfile.addSpouse')}</span>
                </button>
              )}
              {relErrorKind === 'spouse' && relError && <p className={style.error}>{relError}</p>}
            </div>
          </div>

          <div className={style.dossierCard}>
            <PersonAvatar person={person} className={style.cardAvatar} />
            <h1 className={style.cardName}>
              {displayName(person, t('personProfile.unknown'))}
              {needsReview(person) && (
                <span className={style.reviewBadge} title={t('personCard.reviewTitle')}>{t('personProfile.needsReview')}</span>
              )}
            </h1>
            {person.maidenName && <p className={style.cardMeta}>{t('personProfile.neeMaidenName', { name: person.maidenName })}</p>}
            <p className={style.cardMeta}>
              {formatDate(person.dateOfBirth as unknown as string) || '?'}
              {' – '}
              {formatDate(person.dateOfDeath as unknown as string) || t('personProfile.present')}
            </p>
            {person.note && <p className={style.cardNote}>{person.note}</p>}
          </div>

          <div className={style.sideCol}>
            <div className={style.shelf}>
              <h3>{t('personProfile.record')}</h3>
              <div className={style.fact}><span>{t('personProfile.born')}</span><span>{formatDate(person.dateOfBirth as unknown as string) || '?'}</span></div>
              <div className={style.fact}><span>{t('personProfile.died')}</span><span>{formatDate(person.dateOfDeath as unknown as string) || '/'}</span></div>
              {person.residency && (
                <div className={style.fact}><span>{t('personProfile.residencyLabel')}</span><span>{person.residency}</span></div>
              )}
              <div className={style.fact}><span>{t('personProfile.children')}</span><span>{person.offspringUid.length}</span></div>
              <div className={style.fact}><span>{t('personProfile.spouses')}</span><span>{(person.spouseUid ?? []).length}</span></div>
              <div className={style.fact}><span>{t('personProfile.parentsOnRecord')}</span><span>{person.parentUid.length}</span></div>
            </div>
          </div>
        </div>

        <div className={style.shelf + ' ' + style.section}>
          <h3>{t('personProfile.children')} — {person.offspringUid.length}</h3>
          {person.offspringUid.length === 0 && !canEdit ? (
            <p className={style.shelfEmpty}>{t('personProfile.noneOnRecord')}</p>
          ) : (
            <div className={style.childrenRow}>
              {person.offspringUid.map((cid) => {
                const rc = peopleById.get(cid);
                return (
                  <div key={cid} className={style.chip}>
                    <div className={style.chipAvatarWrap}>
                      {rc ? (
                        <PersonAvatar person={rc} className={style.chipAvatar} />
                      ) : (
                        <div className={style.chipAvatarGhost}>?</div>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          className={style.chipRemoveBtn}
                          title={t('personProfile.removeChildTitle')}
                          disabled={removingKey === `child-${cid}`}
                          onClick={() => handleRemoveRelationship('child', cid)}
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <Link to={`/profile/${cid}`} className={style.chipName}>{displayName(rc, t('personProfile.unknown'))}</Link>
                    {lifespanLabel(rc) && <span className={style.chipYears}>{lifespanLabel(rc)}</span>}
                  </div>
                );
              })}
              {canEdit && (
                <button type="button" className={style.chip + ' ' + style.ghostChip} onClick={() => setPickerKind('child')}>
                  <div className={style.chipAvatarGhost}>+</div>
                  <span className={style.chipName}>{t('personProfile.addChild')}</span>
                </button>
              )}
            </div>
          )}
          {relErrorKind === 'child' && relError && <p className={style.error}>{relError}</p>}
        </div>

        {pickerKind && pickerConfig && (
          <PersonPickerModal
            title={pickerConfig.title}
            people={pickerConfig.people}
            onSelect={(targetId) => handleAddRelationship(pickerKind, targetId)}
            onClose={() => setPickerKind(null)}
          />
        )}

        <div className={style.shelf + ' ' + style.section}>
          <h3>{t('personProfile.photosAndDocuments')}</h3>
          {mediaError && <p className={style.error}>{mediaError}</p>}
          {media.length === 0 && !canEdit ? (
            <p className={style.empty}>{t('personProfile.nothingUploadedYet')}</p>
          ) : (
            <div className={style.galleryGrid}>
              {media.map((m) => {
                const isProfilePhoto = m.kind === 'photo' && !!person.profilePic && resolveAssetUrl(m.file_url) === resolveAssetUrl(person.profilePic);
                return (
                  <div key={m.id} className={style.galleryItem}>
                    <a href={resolveAssetUrl(m.file_url)} target="_blank" rel="noreferrer">
                      {m.kind === 'photo' ? (
                        <img src={resolveAssetUrl(m.file_url)} alt={m.caption ?? ''} className={style.galleryPhoto} />
                      ) : (
                        <div className={style.galleryDoc}>{t('personProfile.document')}</div>
                      )}
                    </a>
                    {m.caption && <span className={style.galleryCaption}>{m.caption}</span>}
                    {m.kind === 'photo' && canEdit && (
                      isProfilePhoto ? (
                        <span className={style.profilePhotoBadge}>{t('personProfile.profilePhotoBadge')}</span>
                      ) : (
                        <button
                          type="button"
                          className={style.setProfileBtn}
                          onClick={() => handleSetProfilePhoto(m.file_url)}
                        >
                          {t('personProfile.setAsProfilePhoto')}
                        </button>
                      )
                    )}
                  </div>
                );
              })}
              {canEdit && (
                <button
                  type="button"
                  className={style.galleryItem + ' ' + style.galleryGhostItem}
                  onClick={() => { setUploadError(null); setShowUploadModal(true); }}
                >
                  <div className={style.galleryGhost}>+</div>
                  <span className={style.galleryCaption}>{t('personProfile.addMedia')}</span>
                </button>
              )}
            </div>
          )}
          {uploadError && !showUploadModal && <p className={style.error}>{uploadError}</p>}
        </div>

        {showUploadModal && (
          <MediaUploadModal
            uploadKind={uploadKind}
            onKindChange={setUploadKind}
            caption={uploadCaption}
            onCaptionChange={setUploadCaption}
            uploading={uploadingMedia}
            error={uploadError}
            onSubmit={handleGalleryUpload}
            onClose={() => setShowUploadModal(false)}
          />
        )}
      </div>
      <Footer></Footer>
    </div>
  );
}

export default PersonProfile
