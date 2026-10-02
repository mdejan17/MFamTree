import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import styles from './modules/BranchSwitcher.module.css'
import { useAuth } from '../auth/AuthContext.tsx'
import { useBranch } from '../ui/BranchContext.tsx'
import { useLocale } from '../i18n/LocaleContext.tsx'
import { ApiRequestError } from '../api/client.ts'

// Click-toggled (not hover, like the user menu) — it has to stay open
// while typing a new branch name or confirming a delete, both of which
// involve moving the mouse off the trigger button.
function BranchSwitcher() {
  const { user, token } = useAuth();
  const { t } = useLocale();
  const { branches, loading, activeBranch, selectBranch, createBranch, deleteBranch } = useBranch();
  const isAdmin = user?.role === 'admin';

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  function close() {
    setOpen(false);
    setCreating(false);
    setNewName('');
    setError(null);
    setPendingDeleteId(null);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!token || !newName.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createBranch(newName.trim(), token);
      setCreating(false);
      setNewName('');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('branch.createFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete(id: number) {
    if (!token) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteBranch(id, token);
      setPendingDeleteId(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('branch.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return null;

  return (
    <div className={styles.switcher} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.triggerLabel}>{activeBranch ? activeBranch.name : t('branch.none')}</span>
        <span className={styles.chevron} aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className={styles.dropdown} role="listbox">
          {branches.length === 0 && <p className={styles.empty}>{t('branch.none')}</p>}
          {branches.map((branch) => {
            const isActive = branch.id === activeBranch?.id;
            const isPendingDelete = pendingDeleteId === branch.id;
            return (
              <div
                key={branch.id}
                className={isActive ? `${styles.row} ${styles.rowActive}` : styles.row}
              >
                {isPendingDelete ? (
                  <div className={styles.confirmRow}>
                    <span className={styles.confirmText}>
                      {t('branch.deleteConfirm', { name: branch.name, count: branch.peopleCount })}
                    </span>
                    <div className={styles.confirmActions}>
                      <button
                        type="button"
                        className={styles.confirmCancel}
                        onClick={() => setPendingDeleteId(null)}
                        disabled={deleting}
                      >
                        {t('branch.cancel')}
                      </button>
                      <button
                        type="button"
                        className={styles.confirmDelete}
                        onClick={() => handleConfirmDelete(branch.id)}
                        disabled={deleting}
                      >
                        {deleting ? t('branch.deleting') : t('branch.deleteAction')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className={styles.rowSelect}
                      onClick={() => {
                        selectBranch(branch.id);
                        close();
                      }}
                      role="option"
                      aria-selected={isActive}
                    >
                      <span className={styles.rowName}>{branch.name}</span>
                      <span className={styles.rowCount}>{t('branch.peopleCount', { count: branch.peopleCount })}</span>
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        className={styles.rowDelete}
                        onClick={() => setPendingDeleteId(branch.id)}
                        aria-label={t('branch.deleteAria', { name: branch.name })}
                        title={t('branch.deleteAria', { name: branch.name })}
                      >
                        ×
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {isAdmin && (
            <div className={styles.createSection}>
              {creating ? (
                <form className={styles.createForm} onSubmit={handleCreate}>
                  <input
                    type="text"
                    className={styles.createInput}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={t('branch.namePlaceholder')}
                    autoFocus
                  />
                  <div className={styles.createActions}>
                    <button
                      type="button"
                      className={styles.confirmCancel}
                      onClick={() => {
                        setCreating(false);
                        setNewName('');
                        setError(null);
                      }}
                    >
                      {t('branch.cancel')}
                    </button>
                    <button type="submit" className={styles.createSubmit} disabled={submitting || !newName.trim()}>
                      {submitting ? t('branch.creating') : t('branch.create')}
                    </button>
                  </div>
                </form>
              ) : (
                <button type="button" className={styles.newBranchBtn} onClick={() => setCreating(true)}>
                  {t('branch.newBranch')}
                </button>
              )}
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}
    </div>
  );
}

export default BranchSwitcher
