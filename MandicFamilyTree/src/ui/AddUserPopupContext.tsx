import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface AddUserPopupContextValue {
  isOpen: boolean;
  // Set when the popup was opened via "Add Offspring" on a specific
  // person (e.g. from the hover panel) — AddUser.tsx uses this to link
  // the new person as a child of this person (and their spouse(s)) once
  // created, instead of leaving them floating with no relationships.
  parentUid: number | null;
  // Set when the popup was opened via "Add Parent" on the branch's root —
  // AddUser.tsx uses this to link the new person as a parent of this
  // person once created, then re-root the active branch onto them (see
  // ContextualPopover.tsx, which only ever passes the current root here).
  childUid: number | null;
  open: (parentUid?: number, childUid?: number) => void;
  close: () => void;
}

const AddUserPopupContext = createContext<AddUserPopupContextValue | undefined>(undefined);

export function AddUserPopupProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [parentUid, setParentUid] = useState<number | null>(null);
  const [childUid, setChildUid] = useState<number | null>(null);
  return (
    <AddUserPopupContext.Provider
      value={{
        isOpen,
        parentUid,
        childUid,
        open: (uid?: number, forChildUid?: number) => {
          setParentUid(uid ?? null);
          setChildUid(forChildUid ?? null);
          setIsOpen(true);
        },
        close: () => {
          setIsOpen(false);
          setParentUid(null);
          setChildUid(null);
        },
      }}
    >
      {children}
    </AddUserPopupContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is tightly coupled to AddUserPopupProvider above
export function useAddUserPopup(): AddUserPopupContextValue {
  const ctx = useContext(AddUserPopupContext);
  if (!ctx) {
    throw new Error('useAddUserPopup must be used within an AddUserPopupProvider');
  }
  return ctx;
}
