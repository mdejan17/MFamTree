import { apiRequest, ApiRequestError } from './client.ts'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

export interface Branch {
  id: number;
  name: string;
  rootPersonId: number | null;
  photoUrl?: string;
  createdAt: string;
  peopleCount: number;
}

export function fetchBranches(): Promise<Branch[]> {
  return apiRequest<Branch[]>('/branches')
}

export function createBranch(name: string, token: string): Promise<Branch> {
  return apiRequest<Branch>('/branches', { method: 'POST', body: { name }, token })
}

export function renameBranch(id: number, name: string, token: string): Promise<Branch> {
  return apiRequest<Branch>(`/branches/${id}`, { method: 'PATCH', body: { name }, token })
}

// Re-roots the branch onto a different (existing, already-in-this-branch)
// person — used by "Add Parent" in the tree view after creating a new
// person above the current root.
export function setBranchRoot(id: number, rootPersonId: number, token: string): Promise<Branch> {
  return apiRequest<Branch>(`/branches/${id}/root`, { method: 'PATCH', body: { rootPersonId }, token })
}

// Returns how many people were unassigned (not deleted) by removing this
// branch — see server/src/models/branches.ts#deleteBranch.
export function deleteBranch(id: number, token: string): Promise<{ unassignedCount: number }> {
  return apiRequest<{ unassignedCount: number }>(`/branches/${id}`, { method: 'DELETE', token })
}

// The irreversible sibling of deleteBranch above: soft-deletes every person
// in the branch (not just unassigns them) in addition to removing the
// branch row — see server/src/models/branches.ts#purgeBranch.
export function purgeBranch(id: number, token: string): Promise<{ deletedCount: number }> {
  return apiRequest<{ deletedCount: number }>(`/branches/${id}/purge`, { method: 'DELETE', token })
}

// Multipart, like api/media.ts's uploadMedia — bypasses apiRequest since
// that only ever sends JSON bodies.
export async function uploadBranchPhoto(id: number, file: File, token: string): Promise<Branch> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/branches/${id}/photo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => undefined) : undefined;
  if (!res.ok) {
    const message = (data && (data as { error?: string }).error) || res.statusText;
    throw new ApiRequestError(res.status, message, data);
  }
  return data as Branch;
}
