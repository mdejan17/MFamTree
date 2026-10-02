const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

export interface MediaItem {
  id: number;
  person_id: number;
  file_url: string;
  kind: 'photo' | 'document';
  caption: string | null;
  uploaded_by: number | null;
  created_at: string;
}

export async function uploadMedia(
  personId: number,
  file: File,
  kind: 'photo' | 'document',
  token: string,
  caption?: string
): Promise<MediaItem> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('kind', kind);
  if (caption) formData.append('caption', caption);

  const res = await fetch(`${API_URL}/people/${personId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await res.json().catch(() => undefined);
  if (!res.ok) {
    throw new Error((data && data.error) || 'Upload failed');
  }
  return data as MediaItem;
}

export function fetchMediaForPerson(personId: number): Promise<MediaItem[]> {
  return fetch(`${API_URL}/people/${personId}/media`).then((res) => {
    if (!res.ok) throw new Error('Could not load media');
    return res.json();
  });
}
