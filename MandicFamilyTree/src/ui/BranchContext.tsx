import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { createBranch as apiCreateBranch, deleteBranch as apiDeleteBranch, purgeBranch as apiPurgeBranch, fetchBranches } from '../api/branches.ts'
import type { Branch } from '../api/branches.ts'
import { onPersonAdded } from '../events.ts'

const STORAGE_KEY = 'familytree.activeBranchId';

function readStoredBranchId(): number | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? Number(stored) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function storeBranchId(id: number | null) {
  try {
    if (id === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, String(id));
  } catch {
    // Ignore — the choice just won't persist across reloads.
  }
}

interface BranchContextValue {
  branches: Branch[];
  loading: boolean;
  error: boolean;
  // The branch every page should scope its data to. Null only while
  // branches are still loading, or if every branch has been deleted.
  activeBranch: Branch | null;
  selectBranch: (id: number) => void;
  // Both resolve once the branches list has been refetched, so callers can
  // rely on `branches`/`activeBranch` already reflecting the change.
  createBranch: (name: string, token: string) => Promise<void>;
  deleteBranch: (id: number, token: string) => Promise<{ unassignedCount: number }>;
  // Irreversible: soft-deletes every person in the branch too, not just
  // unassigns them — see api/branches.ts#purgeBranch.
  purgeBranch: (id: number, token: string) => Promise<{ deletedCount: number }>;
  // For callers that changed a branch through some other API call (a
  // rename, a photo upload on BranchProfile) and just need this context's
  // `branches`/`activeBranch` to pick up the change afterward.
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextValue | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<number | null>(readStoredBranchId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Returns a promise so create/delete below can await the list actually
  // being fresh (e.g. before resolving a confirm dialog), while the mount
  // effect below just fires it and ignores the return value.
  const refresh = useCallback(async (): Promise<void> => {
    try {
      const data = await fetchBranches();
      setBranches(data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Whenever a person is created anywhere in the app, re-pull the branches
  // list — peopleCount changes, and critically so can rootPersonId: a
  // brand-new branch's root is only set server-side once its first person
  // exists (see setBranchRootIfUnset), so without this, adding that first
  // person to a fresh branch would leave `activeBranch.rootPersonId` stuck
  // at null in every already-mounted component (Home's tree view included)
  // until something else happened to refetch branches — which is exactly
  // the "branch has people but the tree says there's no one yet" bug.
  useEffect(() => onPersonAdded(() => void refresh()), [refresh]);

  // Keeps the active branch valid as the list loads/changes: falls back to
  // the first available branch if nothing's stored yet, or if the
  // previously-active one was deleted out from under it.
  useEffect(() => {
    if (branches.length === 0) return;
    const stillExists = branches.some((b) => b.id === activeBranchId);
    if (!stillExists) {
      setActiveBranchId(branches[0].id);
    }
  }, [branches, activeBranchId]);

  function selectBranch(id: number) {
    setActiveBranchId(id);
    storeBranchId(id);
  }

  const value = useMemo<BranchContextValue>(
    () => ({
      branches,
      loading,
      error,
      activeBranch: branches.find((b) => b.id === activeBranchId) ?? null,
      selectBranch,
      async createBranch(name, token) {
        const created = await apiCreateBranch(name, token);
        await refresh();
        selectBranch(created.id);
      },
      async deleteBranch(id, token) {
        const result = await apiDeleteBranch(id, token);
        await refresh();
        return result;
      },
      async purgeBranch(id, token) {
        const result = await apiPurgeBranch(id, token);
        await refresh();
        return result;
      },
      refreshBranches: refresh,
    }),
    [branches, loading, error, activeBranchId, refresh]
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is tightly coupled to BranchProvider above
export function useBranch(): BranchContextValue {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return ctx;
}
