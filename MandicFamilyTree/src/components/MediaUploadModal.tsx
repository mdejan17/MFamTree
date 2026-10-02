import { useEffect, useRef, useState } from 'react'
import type { DragEvent, FormEvent } from 'react'
import { useLocale } from '../i18n/LocaleContext.tsx'
import styles from './modules/MediaUploadModal.module.css'

interface MediaUploadModalProps {
  uploadKind: 'photo' | 'document';
  onKindChange: (kind: 'photo' | 'document') => void;
  caption: string;
  onCaptionChange: (value: string) => void;
  uploading: boolean;
  error: string | null;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

// Mirrors PersonPickerModal's overlay/popup shell, with a drag-or-click
// dropzone in place of a plain <input type="file"> — the file input itself
// still exists (name="file"), just visually hidden, so the existing
// form-submit upload handler in PersonProfile doesn't need to change: a
// drop assigns the dropped FileList onto that same input via DataTransfer,
// and a click on the zone proxies to it.
function MediaUploadModal({ uploadKind, onKindChange, caption, onCaptionChange, uploading, error, onSubmit, onClose }: MediaUploadModalProps) {
  const { t } = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !fileInputRef.current) return;
    fileInputRef.current.files = e.dataTransfer.files;
    setFileName(file.name);
  }

  return (
    <>
      <div className={styles.overlay} onClick={onClose}></div>
      <div className={styles.popup} role="dialog" aria-label={t('personProfile.addMedia')}>
        <h1>{t('personProfile.addMedia')}</h1>
        <form onSubmit={onSubmit}>
          <select
            value={uploadKind}
            onChange={(e) => onKindChange(e.target.value as 'photo' | 'document')}
            className={styles.select}
          >
            <option value="photo">{t('personProfile.photo')}</option>
            <option value="document">{t('personProfile.document')}</option>
          </select>

          <div
            className={dragOver ? `${styles.dropzone} ${styles.dropzoneActive}` : styles.dropzone}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <span className={styles.dropzonePlus}>+</span>
            <span className={styles.dropzoneText}>{fileName || t('personProfile.dragOrChoose')}</span>
            <input
              ref={fileInputRef}
              type="file"
              name="file"
              className={styles.hiddenInput}
              accept={uploadKind === 'photo' ? 'image/png,image/jpeg,image/webp,image/gif' : 'application/pdf'}
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
              required
            />
          </div>

          <input
            type="text"
            className={styles.caption}
            placeholder={t('personProfile.captionPlaceholder')}
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
          />

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.ghost} onClick={onClose}>{t('personProfile.cancel')}</button>
            <button type="submit" className={styles.submit} disabled={uploading}>
              {uploading ? t('personProfile.uploading') : t('personProfile.upload')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default MediaUploadModal
