import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './modules/PersonPickerModal.module.css'
import placeholderPic from '../assets/placeholder.jpeg'
import { resolveAssetUrl } from '../api/client.ts'
import { useLocale } from '../i18n/LocaleContext.tsx'
import type { Person } from '../data/mockDatabase.tsx'

function displayName(p: Person): string {
  return `${p.firstName} ${p.lastName ?? ''}`.trim();
}

function formatDate(iso?: string): string {
  if (!iso) return '?';
  return String(iso).slice(0, 10);
}

interface PersonPickerModalProps {
  title: string;
  // Already filtered down to valid candidates (e.g. excludes the person
  // themselves, and ideally anyone already linked in that same role) —
  // this component only adds search-as-you-type on top of that list.
  people: Person[];
  onSelect: (uid: number) => void;
  onClose: () => void;
}

function PersonPickerModal({ title, people, onSelect, onClose }: PersonPickerModalProps) {
  const { t } = useLocale();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => {
      const haystack = `${p.firstName} ${p.lastName ?? ''} ${p.maidenName ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [people, query]);

  return (
    <>
      <div className={styles.overlay} onClick={onClose}></div>
      <div className={styles.popup} role="dialog" aria-label={title}>
        <h1>{title}</h1>
        <input
          ref={inputRef}
          type="text"
          className={styles.search}
          placeholder={t('personPicker.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className={styles.list}>
          {filtered.length === 0 && <li className={styles.empty}>{t('personPicker.noMatches')}</li>}
          {filtered.map((p) => (
            <li key={p.uid}>
              <button type="button" className={styles.row} onClick={() => onSelect(p.uid)}>
                <img
                  src={p.profilePic ? resolveAssetUrl(p.profilePic) : placeholderPic}
                  alt=""
                  className={styles.rowPhoto}
                />
                <span className={styles.rowText}>
                  <span className={styles.rowName}>{displayName(p)}</span>
                  <span className={styles.rowMeta}>
                    {formatDate(p.dateOfBirth as unknown as string)} – {formatDate(p.dateOfDeath as unknown as string)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className={styles.actions}>
          <button type="button" className={styles.ghost} onClick={onClose}>{t('personPicker.cancel')}</button>
        </div>
      </div>
    </>
  );
}

export default PersonPickerModal
