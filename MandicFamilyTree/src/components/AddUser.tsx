import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import styles from './modules/AddUser.module.css'
import { useAuth } from '../auth/AuthContext.tsx'
import { useAddUserPopup } from '../ui/AddUserPopupContext.tsx'
import { createPerson, createRelationship, fetchPerson } from '../api/people.ts'
import type { Person } from '../data/mockDatabase.tsx'
import { setBranchRoot } from '../api/branches.ts'
import { ApiRequestError } from '../api/client.ts'
import { notifyPersonAdded } from '../events.ts'
import { useLocale } from '../i18n/LocaleContext.tsx'
import { useBranch } from '../ui/BranchContext.tsx'

const emptyForm = {
  firstName: '',
  lastName: '',
  maidenName: '',
  dateOfBirth: '',
  dateOfDeath: '',
  residency: '',
  note: '',
};

function displayName(p?: Person | null): string {
  if (!p) return '';
  return `${p.firstName} ${p.lastName ?? ''}`.trim();
}

function AddUser() {
  const { user, token } = useAuth();
  const { isOpen, parentUid, childUid, close } = useAddUserPopup();
  const { t } = useLocale();
  const { activeBranch, refreshBranches } = useBranch();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetched once per open, so "Add Offspring" (opened with a parentUid)
  // both shows who this person will be linked under and has the parent's
  // current spouse(s) on hand to link the new person to as well, without
  // a second round-trip at submit time.
  const [parent, setParent] = useState<Person | null>(null);

  useEffect(() => {
    if (!isOpen || parentUid === null) {
      setParent(null);
      return;
    }
    let cancelled = false;
    fetchPerson(parentUid)
      .then((p) => { if (!cancelled) setParent(p); })
      .catch(() => { if (!cancelled) setParent(null); });
    return () => { cancelled = true; };
  }, [isOpen, parentUid]);

  // Same idea for "Add Parent" (opened with a childUid): just needs this
  // person's name for the hint text below.
  const [child, setChild] = useState<Person | null>(null);

  useEffect(() => {
    if (!isOpen || childUid === null) {
      setChild(null);
      return;
    }
    let cancelled = false;
    fetchPerson(childUid)
      .then((p) => { if (!cancelled) setChild(p); })
      .catch(() => { if (!cancelled) setChild(null); });
    return () => { cancelled = true; };
  }, [isOpen, childUid]);

  function closePopup() {
    setError(null);
    close();
  }

  function updateField(field: keyof typeof emptyForm) {
    return (e: ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setError(t('addUser.loginRequired'));
      return;
    }
    if (!form.firstName.trim()) {
      setError(t('addUser.firstNameRequired'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const created = await createPerson(
        {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim() || undefined,
          maidenName: form.maidenName.trim() || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          dateOfDeath: form.dateOfDeath || undefined,
          residency: form.residency.trim() || undefined,
          note: form.note.trim() || undefined,
          branchId: activeBranch?.id,
        },
        token
      );

      // Opened via "Add Offspring" on a specific person — link the new
      // person as their child, and as a child of their spouse(s) too, so
      // they don't show up floating with no relationships.
      if (parentUid !== null) {
        try {
          await createRelationship({ personAId: parentUid, personBId: created.uid, type: 'parent_of' }, token);
          for (const spouseUid of parent?.spouseUid ?? []) {
            await createRelationship({ personAId: spouseUid, personBId: created.uid, type: 'parent_of' }, token);
          }
        } catch {
          notifyPersonAdded();
          setForm(emptyForm);
          setError(t('addUser.linkFailed', { name: form.firstName.trim(), parent: displayName(parent) }));
          setSubmitting(false);
          return;
        }
      }

      // Opened via "Add Parent" on the branch's current root — link the
      // new person as that person's parent, then move the branch's single
      // entry point up onto them, so the tree keeps growing upward from
      // here instead of staying stuck on their child.
      if (childUid !== null) {
        try {
          await createRelationship({ personAId: created.uid, personBId: childUid, type: 'parent_of' }, token);
          if (activeBranch) {
            await setBranchRoot(activeBranch.id, created.uid, token);
            await refreshBranches();
          }
        } catch {
          notifyPersonAdded();
          setForm(emptyForm);
          setError(t('addUser.linkParentFailed', { name: form.firstName.trim(), parent: displayName(child) }));
          setSubmitting(false);
          return;
        }
      }

      notifyPersonAdded();
      setForm(emptyForm);
      closePopup();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('addUser.couldNotAdd'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return(
    <>
      <div className={styles.overlay} onClick={closePopup}></div>
      <div className={styles.popup} id='addUserPopup'>
        <h1>
          {parentUid !== null
            ? t('addUser.addOffspringTitle')
            : childUid !== null
              ? t('addUser.addParentTitle')
              : t('addUser.addPersonTitle')}
        </h1>
        <p className={styles.hint}>
          {parentUid !== null
            ? t('addUser.offspringHint', {
                name: displayName(parent) || '…',
                spouseNote: parent?.spouseUid?.length ? t('addUser.andSpouse') : '',
              })
            : childUid !== null
              ? t('addUser.parentHint', { name: displayName(child) || '…' })
              : t('addUser.registerHint')}
        </p>
        {!user ? (
          <p>{t('addUser.loginRequired')}</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="firstName">{t('addUser.firstName')}</label>
                <input id="firstName" type="text" value={form.firstName} onChange={updateField('firstName')} required />
              </div>
              <div className={styles.field}>
                <label htmlFor="lastName">{t('addUser.lastName')}</label>
                <input id="lastName" type="text" value={form.lastName} onChange={updateField('lastName')} />
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="maidenName">{t('addUser.maidenName')}</label>
              <input id="maidenName" type="text" value={form.maidenName} onChange={updateField('maidenName')} />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="dateOfBirth">{t('addUser.born')}</label>
                <input id="dateOfBirth" type="date" value={form.dateOfBirth} onChange={updateField('dateOfBirth')} />
              </div>
              <div className={styles.field}>
                <label htmlFor="dateOfDeath">{t('addUser.died')}</label>
                <input id="dateOfDeath" type="date" value={form.dateOfDeath} onChange={updateField('dateOfDeath')} />
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="residency">{t('addUser.residency')}</label>
              <input id="residency" type="text" value={form.residency} onChange={updateField('residency')} />
            </div>
            <div className={styles.field}>
              <label htmlFor="note">{t('addUser.note')}</label>
              <input id="note" type="text" value={form.note} onChange={updateField('note')} />
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.actions}>
              <button type="button" className={styles.ghost} onClick={closePopup}>{t('addUser.cancel')}</button>
              <button type="submit" className={styles.submit} disabled={submitting}>
                {submitting
                  ? t('addUser.adding')
                  : parentUid !== null
                    ? t('addUser.addOffspring')
                    : childUid !== null
                      ? t('addUser.addParent')
                      : t('addUser.addPerson')}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}
export default AddUser
