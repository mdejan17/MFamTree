import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Person } from '../data/mockDatabase.tsx'

// How long the mouse has to stay on one person before the hover panel
// "pins" open — see setHovered below. Exported so the Toolbar's dwell-bar
// animation can use the exact same duration instead of a second, easily
// drifting copy of the same number.
export const PIN_DELAY_MS = 2000;

interface HoveredPersonContextValue {
  hovered: Person | null;
  // The hovered node's on-screen bounding box at the moment it was hovered
  // (see CustomNode's onMouseOver) — only the Contextual Popover (tree view)
  // uses this, to anchor itself next to the node; Toolbar/SideBar ignore it.
  hoveredRect: DOMRect | null;
  setHovered: (person: Person | null, rect?: DOMRect | null) => void;
  // True once the current (or most recent) hover has been pinned open by
  // dwelling PIN_DELAY_MS on a person. While true, the Toolbar panel should
  // stay visible even after the mouse leaves every node.
  pinned: boolean;
  // The person to show while pinned and nothing is currently hovered —
  // kept separate from `hovered` (which goes back to null the instant the
  // mouse leaves a node) so the panel doesn't go blank the moment it pins.
  pinnedPerson: Person | null;
  // hoveredRect captured at the moment pinning happened, so an anchored
  // popover has somewhere to stay put once the mouse leaves.
  pinnedRect: DOMRect | null;
  unpin: () => void;
}

const HoveredPersonContext = createContext<HoveredPersonContextValue | undefined>(undefined);

export function HoveredPersonProvider({ children }: { children: ReactNode }) {
  const [hovered, setHoveredState] = useState<Person | null>(null);
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
  const [pinned, setPinned] = useState(false);
  const [pinnedPerson, setPinnedPerson] = useState<Person | null>(null);
  const [pinnedRect, setPinnedRect] = useState<DOMRect | null>(null);
  const pinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setHovered = useCallback((person: Person | null, rect: DOMRect | null = null) => {
    setHoveredState(person);
    setHoveredRect(rect);
    if (pinTimer.current) {
      clearTimeout(pinTimer.current);
      pinTimer.current = null;
    }
    // Leaving a node before the dwell completes shouldn't start a pin — but
    // if something was already pinned, it stays pinned (and keeps showing
    // pinnedPerson) until explicitly closed via unpin().
    if (person) {
      pinTimer.current = setTimeout(() => {
        setPinned(true);
        setPinnedPerson(person);
        setPinnedRect(rect);
      }, PIN_DELAY_MS);
    }
  }, []);

  const unpin = useCallback(() => {
    if (pinTimer.current) {
      clearTimeout(pinTimer.current);
      pinTimer.current = null;
    }
    setPinned(false);
    setPinnedPerson(null);
    setPinnedRect(null);
  }, []);

  return (
    <HoveredPersonContext.Provider value={{ hovered, hoveredRect, setHovered, pinned, pinnedPerson, pinnedRect, unpin }}>
      {children}
    </HoveredPersonContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is tightly coupled to HoveredPersonProvider above
export function useHoveredPerson(): HoveredPersonContextValue {
  const ctx = useContext(HoveredPersonContext);
  if (!ctx) {
    throw new Error('useHoveredPerson must be used within a HoveredPersonProvider');
  }
  return ctx;
}
