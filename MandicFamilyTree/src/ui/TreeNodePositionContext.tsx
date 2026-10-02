import { createContext, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

// Lets the tree's custom node renderer (PersonCard.tsx's `CustomNode`)
// report where react-d3-tree laid each person out, keyed by our own
// person uid — not react-d3-tree's internal node id. Home.tsx reads this
// back to jump the view to a specific person (see the "View in Tree"
// button on the profile page). Positions are kept in a plain ref (written
// on every render, read on demand) since nothing should re-render just
// because a position changed. `focusedUid` is real state, though — it
// drives a visible highlight ring on the target node (see CustomNode),
// which has to be reactive to actually show up.
interface NodePosition {
  x: number;
  y: number;
}

interface TreeNodePositionApi {
  register: (uid: number, position: NodePosition) => void;
  // Called when a node unmounts (collapsed away, or removed because the
  // tree/branch switched under it) so its last-known position doesn't
  // linger forever — see the cleanup in PersonCard.tsx's CustomNode.
  // Without this, Home.tsx's "fit the whole tree to the screen" fit would
  // keep factoring in people who are no longer actually on screen.
  unregister: (uid: number) => void;
  get: (uid: number) => NodePosition | undefined;
  // A snapshot of every currently-registered position, for "fit the whole
  // tree to the screen" math rather than looking up one person at a time.
  getAll: () => Map<number, NodePosition>;
  focusedUid: number | null;
  setFocusedUid: (uid: number | null) => void;
}

const TreeNodePositionContext = createContext<TreeNodePositionApi | null>(null);

export function TreeNodePositionProvider({ children }: { children: ReactNode }) {
  const positions = useRef(new Map<number, NodePosition>());
  const [focusedUid, setFocusedUid] = useState<number | null>(null);
  // register/unregister/get/getAll are stable across renders (empty deps)
  // so consumers reading them from a context value don't see them change
  // identity on every render — the ref they close over is itself stable,
  // only its contents mutate. The object as a whole is still recreated
  // when `focusedUid` changes, since that part genuinely needs to be
  // reactive.
  const { register, unregister, get, getAll } = useMemo(
    () => ({
      register: (uid: number, position: NodePosition) => {
        positions.current.set(uid, position);
      },
      unregister: (uid: number) => {
        positions.current.delete(uid);
      },
      get: (uid: number) => positions.current.get(uid),
      getAll: () => positions.current,
    }),
    []
  );
  const api = useMemo<TreeNodePositionApi>(
    () => ({ register, unregister, get, getAll, focusedUid, setFocusedUid }),
    [register, unregister, get, getAll, focusedUid]
  );
  return (
    <TreeNodePositionContext.Provider value={api}>
      {children}
    </TreeNodePositionContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is tightly coupled to TreeNodePositionProvider above
export function useTreeNodePositions(): TreeNodePositionApi | null {
  return useContext(TreeNodePositionContext);
}
