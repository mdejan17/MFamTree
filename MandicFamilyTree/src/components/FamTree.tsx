import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, PointerEvent as ReactPointerEvent, SetStateAction } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Person } from '../data/mockDatabase.tsx'
import { fetchPeople } from '../api/people.ts'
import { onPersonAdded } from '../events.ts'
import { useLocale } from '../i18n/LocaleContext.tsx'
import { useHoveredPerson } from '../ui/HoveredPersonContext.tsx'
import { useBranch } from '../ui/BranchContext.tsx'
import { needsReview } from '../utils/review.ts'
import { yearsRange } from '../utils/personDates.ts'
import PersonAvatar from './PersonAvatar.tsx'
import styles from './modules/FamTree.module.css'

// This is deliberately a "family group" view (one person, their parents,
// spouse(s) and children) rather than a full recursive tree — react-d3-tree
// on the Home page ("/") already covers that, with its own orthogonal
// dashed-connector look. This page draws the family as a small constellation
// instead — glowing nodes on a dark field, connected by curved lines — so it
// reads as a distinct, close-up view rather than a smaller copy of the tree.
//
// Sentinel "unknown" people (uid 999 / 998 in the seed data) are rendered
// like any other person on purpose: they're real placeholder rows the data
// model uses to represent "we don't know who this ancestor was", not a bug
// to special-case around. The *dashed, unlit* node below is reserved for the
// genuinely empty case — zero parents on record at all.
//
// Fallback focus when there's no :id in the route AND the active branch
// (see useBranch below) has no root person of its own yet.
const DEFAULT_FOCUS_UID = 1;

// Layout lives in a 0–100 (x) by 0–100 (y) percentage space shared by both
// the absolutely-positioned HTML nodes and the SVG connector overlay
// (viewBox "0 0 100 100", non-uniform scale) — so a coordinate means the
// same thing in both places regardless of how big the stage actually
// renders, with no unit conversion to keep in sync.
const PARENTS_Y = 20;
const FOCUS_Y = 46;
const CHILDREN_Y = 80;
// A spouse sits slightly left-and-down from the default couple spacing (see
// clusterPositions) rather than dead level with the focus person — a small
// stagger instead of a rigid side-by-side pair.
const SPOUSE_Y_OFFSET = 2;
// The starfield sits behind the pannable canvas and trails its pan by this
// fraction instead of moving 1:1 with it — a classic parallax cue (distant
// things appear to move less than near ones), so panning reads as moving
// *through* a 3D scene rather than just sliding a flat image sideways.
const STAR_PARALLAX = 0.35;

// Wheel/button zoom range for the constellation view. Zoom scales the whole
// stage; dragging (see DRAG_THRESHOLD below) moves individual bubbles
// relative to each other instead of panning the camera.
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.2;
// A drag shorter than this (px) is treated as a click instead — otherwise
// the tiniest hand tremor while clicking a node would be read as a drag and
// swallow the click.
const DRAG_THRESHOLD = 4;
// How long the "spring back to normal position" animation runs after
// releasing a dragged bubble. Driven with requestAnimationFrame (see
// startSnapBack below) rather than a CSS transition, because the connector
// line's SVG path `d` isn't reliably CSS-transitionable — tweening the
// same nodeOverrides state every frame keeps the bubble and its line moving
// in lockstep instead of the line just jumping straight to its end point.
const SNAP_BACK_MS = 1500;
// Dragging the focus person or a spouse moves the other half of the couple
// by the exact same amount (they're a unit) and leans the children fan
// toward the same side by this fraction of it — enough to visibly "balance"
// toward wherever the couple ends up without fully tagging along.
const BALANCE_FACTOR = 0.35;

// A small fixed starfield — purely decorative, so it doesn't need to be
// derived from data; just needs to not look like a grid. Coordinates are
// percentages of the starfield layer, which is deliberately sized larger
// than its container (see .starfield) and extends past 0–100 on every side
// — since the layer now trails the pan at a damped rate rather than
// sitting still (see STAR_PARALLAX), the margin band of stars below is what
// slides into view instead of empty space once it's dragged.
const STARS = [
    [8, 14], [18, 70], [27, 8], [34, 90], [46, 12], [58, 24], [66, 84],
    [74, 6], [83, 58], [91, 16], [12, 46], [90, 88], [5, 92], [96, 42],
    [22, 36], [39, 62], [61, 38], [78, 30], [14, 60], [86, 72], [50, 94], [44, 4],
    // Margin band — outside the visible 0–100 area on every side.
    [-15, 20], [-28, 55], [-10, 85], [-35, 10], [-20, 94], [-30, 68],
    [115, 25], [128, 60], [110, 5], [122, 88], [135, 40], [112, 70],
    [20, -18], [55, -28], [85, -12], [35, -32], [68, -20], [8, -25],
    [15, 118], [48, 128], [78, 115], [30, 132], [62, 120], [92, 125],
    [-22, -24], [118, -20], [-18, 118], [122, 122],
];

function fanX(count: number, spread: number): number[] {
    if (count <= 0) return [];
    if (count === 1) return [50];
    const start = 50 - spread / 2;
    const step = spread / (count - 1);
    return Array.from({ length: count }, (_, i) => start + step * i);
}

// Focus person + spouse(s) as one cluster, focus always included. Real data
// is effectively always 0 or 1 spouses, but the model allows more.
//
// The 46/53 (and the "7" spread below) were tuned by eye at the stage's
// nominal 980px reference width, to read as a tightly overlapping couple.
// Stored as plain percentages, they'd drift apart in actual pixels on a
// wider stage (.stage no longer caps its width — see FamTree.module.css —
// so the real render width varies a lot). `scale` converts them to the
// percentage that reproduces the SAME absolute pixel closeness at
// whatever the stage's actual current width is — CLOSENESS further tightens
// that down below the plain 980px-equivalent gap, since even that still
// read as too far apart (most actual screens render this stage well under
// 980px, which is what the original 46/53 numbers were really tuned against).
const CLOSENESS = 0.55;
function clusterPositions(spouseCount: number, stageWidth: number): { focusX: number; spouseXs: number[] } {
    if (spouseCount === 0) return { focusX: 50, spouseXs: [] };
    const scale = (NOMINAL_RECT_W / stageWidth) * CLOSENESS;
    if (spouseCount === 1) return { focusX: 50 + (46 - 50) * scale, spouseXs: [50 + (53 - 50) * scale] };
    const total = spouseCount + 1;
    // A tight, constant step between adjacent members — close enough to
    // overlap, same as the single-spouse case above — rather than fanning
    // out wider the more spouses there are, which left visible gaps between
    // them instead of reading as one cluster.
    const xs = fanX(total, 7 * (total - 1) * scale);
    const mid = Math.floor(total / 2);
    return { focusX: xs[mid], spouseXs: xs.filter((_, i) => i !== mid) };
}

function parentXs(count: number): number[] {
    if (count === 0) return [];
    if (count === 1) return [50];
    if (count === 2) return [36, 64];
    return fanX(count, Math.min(76, 20 * (count - 1)));
}

function childXs(count: number): number[] {
    if (count === 0) return [];
    return fanX(count, Math.min(90, 18 * (count - 1)));
}

function straightPath(x1: number, y1: number, x2: number, y2: number): string {
    return `M${x1},${y1} L${x2},${y2}`;
}

// A fixed, deterministic per-index wobble so parents/children don't line up
// in a rigid row — reads as a loose scatter of nearby stars (varying both
// how far out and how high/low each one sits) rather than a chart's ranks.
// Fixed (not random) so the layout doesn't jump around on every re-render.
const Y_JITTER = [0, 9, -7, 5, -9, 4, -6, 8, -4, 6];
const X_JITTER = [0, -3, 3, -4, 2, -2, 4, -3, 2, -4];

function clampPct(x: number): number {
    return Math.min(96, Math.max(4, x));
}

function scatter(xs: number[], baseY: number): { x: number; y: number }[] {
    if (xs.length <= 1) return xs.map((x) => ({ x, y: baseY }));
    return xs.map((x, i) => ({
        x: clampPct(x + X_JITTER[i % X_JITTER.length]),
        y: baseY + Y_JITTER[i % Y_JITTER.length],
    }));
}

type Role = 'parent' | 'focus' | 'spouse' | 'child';

interface VisNode {
    uid: number;
    person: Person;
    x: number;
    y: number;
    role: Role;
}

type NodeOverrides = Record<number, { x: number; y: number }>;

// Each circle's rendered radius in px (half of .sizeLg/.sizeMdLg/.sizeMd in
// FamTree.module.css) at zoom=1 — used only for drag-time collision
// avoidance below, to keep a dragged bubble from visually burying another
// one. Collision math happens in on-screen pixel space (see pctToPx, which
// converts through the stage's actual, post-zoom rendered size), so every
// use of this scales it by the current zoom level first — otherwise, at any
// zoom other than 1, these radii and the positions being compared against
// them are in mismatched units (one scales with zoom, the other doesn't),
// and bubbles end up allowed to sit closer together than they look (zoomed
// in) or kept farther apart than necessary (zoomed out).
const CIRCLE_RADIUS_PX: Record<Role, number> = { focus: 52, spouse: 30, parent: 24, child: 24 };
// Minimum extra breathing room enforced between two circles' edges — big
// enough that bubbles start easing apart well before they'd actually touch,
// rather than only reacting once they're already overlapping. Also a
// zoom=1 value; scaled by zoom alongside the radii above.
const COLLISION_GAP_PX = 75;
// How many times resolveAgainstMovers re-checks all movers against a node's
// updated position in one call. A single sweep only visits each mover once,
// so clearing mover A can walk a node straight back into mover B (or partway
// back into A) when they're close together — like the two focus bubbles,
// which intentionally overlap each other. Repeating the sweep lets the node
// keep walking outward each pass until it's fully clear of all of them,
// rather than settling wedged in the gap between two close, large movers.
const COLLISION_PASSES = 8;

interface MoverPx { xPx: number; yPx: number; r: number; }

// Resolves one circle (xPx,yPx,r) against a list of other circles it must
// stay clear of. Within a pass, movers are resolved one at a time (not
// summed) — summing push vectors from two movers sitting close together
// would often cancel out to roughly nothing, since they'd be pulling in
// close to opposite directions, leaving the node wedged between them
// instead of clear of both. Across passes (see COLLISION_PASSES), the whole
// sweep repeats so a push that re-enters another mover's zone gets caught
// and resolved too, instead of stopping after one partial correction.
function resolveAgainstMovers(xPx: number, yPx: number, r: number, movers: MoverPx[], gapPx: number): { xPx: number; yPx: number; moved: boolean } {
    let curX = xPx;
    let curY = yPx;
    let moved = false;
    for (let pass = 0; pass < COLLISION_PASSES; pass++) {
        let passMoved = false;
        movers.forEach((m) => {
            const dx = curX - m.xPx;
            const dy = curY - m.yPx;
            const dist = Math.hypot(dx, dy);
            const minDist = r + m.r + gapPx;
            if (dist < minDist) {
                const overlap = minDist - dist;
                const nx = dist > 0.0001 ? dx / dist : 1;
                const ny = dist > 0.0001 ? dy / dist : 0;
                curX += nx * overlap;
                curY += ny * overlap;
                passMoved = true;
            }
        });
        if (passMoved) moved = true;
        else break;
    }
    return { xPx: curX, yPx: curY, moved };
}

interface CollisionNode { uid: number; xPx: number; yPx: number; r: number; pinned: boolean; }

// One relaxation pass over every node pair: pushes any two overlapping
// circles apart, split evenly between them unless one is pinned (a dragged
// or otherwise fixed bubble absorbs none of the correction — the other one
// gets all of it). Repeated for COLLISION_PASSES rounds so a correction that
// creates a *new* overlap with a third circle gets caught and resolved too —
// without this, pushing bubble A clear of bubble B could just shove A
// straight into bubble C, since a single pass only ever looks at the pair
// that's actually overlapping *right now*, not what that push just created.
function relaxCollisions(nodes: CollisionNode[], gapPx: number) {
    for (let pass = 0; pass < COLLISION_PASSES; pass++) {
        let moved = false;
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i];
                const b = nodes[j];
                if (a.pinned && b.pinned) continue;
                const dx = a.xPx - b.xPx;
                const dy = a.yPx - b.yPx;
                const dist = Math.hypot(dx, dy);
                const minDist = a.r + b.r + gapPx;
                if (dist >= minDist) continue;
                const overlap = minDist - dist;
                const nx = dist > 0.0001 ? dx / dist : 1;
                const ny = dist > 0.0001 ? dy / dist : 0;
                if (a.pinned) {
                    b.xPx -= nx * overlap;
                    b.yPx -= ny * overlap;
                } else if (b.pinned) {
                    a.xPx += nx * overlap;
                    a.yPx += ny * overlap;
                } else {
                    a.xPx += nx * (overlap / 2);
                    a.yPx += ny * (overlap / 2);
                    b.xPx -= nx * (overlap / 2);
                    b.yPx -= ny * (overlap / 2);
                }
                moved = true;
            }
        }
        if (!moved) break;
    }
}

// Collapses a rigidly-linked cluster (the dragged bubble + its spouse, which
// intentionally overlap each other — see .circleSpouse) into a single
// enclosing circle, so other bubbles treat it as one obstacle instead of
// two. Resolving against the two separately let a node land in the
// sliver where both circles' push directions point along the same line
// through their centers (the gap between the couple) — alternately pushing
// away from one and then the other just walks it back and forth along that
// line instead of clearing the cluster. A single combined circle has only
// one center to push away from, so that gap can't exist.
function mergeIntoBoundingMover(entries: MoverPx[]): MoverPx | null {
    if (entries.length === 0) return null;
    if (entries.length === 1) return entries[0];
    let cx = 0;
    let cy = 0;
    entries.forEach((e) => { cx += e.xPx; cy += e.yPx; });
    cx /= entries.length;
    cy /= entries.length;
    let r = 0;
    entries.forEach((e) => {
        r = Math.max(r, Math.hypot(e.xPx - cx, e.yPx - cy) + e.r);
    });
    return { xPx: cx, yPx: cy, r };
}

function pctToPx(pct: { x: number; y: number }, rectW: number, rectH: number): { xPx: number; yPx: number } {
    return { xPx: (pct.x / 100) * rectW, yPx: (pct.y / 100) * rectH };
}

function pxToPct(xPx: number, yPx: number, rectW: number, rectH: number): { x: number; y: number } {
    return { x: clampPct((xPx / rectW) * 100), y: clampPct((yPx / rectH) * 100) };
}

// Shortens a connector line so it stops just outside a bubble's edge
// instead of being drawn straight into its center — moves the `to` end
// back toward `from` by `pullbackPx` actual stage pixels. Deliberately not
// a plain percentage trim: linkLayer's viewBox maps x/y onto the stage
// anisotropically (see its comment in FamTree.module.css), so the same
// percentage shrink would pull back by a different real distance
// depending on direction and stage size. No clamping to the 4-96 "stay on
// stage" band here (unlike pxToPct) — a line endpoint right at a bubble's
// edge should stay exactly there even if that's outside that band.
function pullBackPct(
    from: { x: number; y: number }, to: { x: number; y: number },
    pullbackPx: number, rectW: number, rectH: number,
): { x: number; y: number } {
    const fromPx = pctToPx(from, rectW, rectH);
    const toPx = pctToPx(to, rectW, rectH);
    const dx = toPx.xPx - fromPx.xPx;
    const dy = toPx.yPx - fromPx.yPx;
    const dist = Math.hypot(dx, dy);
    if (dist <= pullbackPx) return to;
    const t = (dist - pullbackPx) / dist;
    return {
        x: ((fromPx.xPx + dx * t) / rectW) * 100,
        y: ((fromPx.yPx + dy * t) / rectH) * 100,
    };
}

// Extra breathing room beyond a bubble's own radius before a connector
// line's endpoint, so lines visibly stop short outside the bubble instead
// of just grazing its edge.
const LINE_GAP_PX = 10;

// A parent/child link's path, pulled back at both ends: near the focus
// couple (approximated by the focus bubble's own radius — close enough,
// since it's the bigger of the couple and sits nearest the spine point)
// and near the parent/child bubble itself.
function coupleLinkPath(
    otherX: number, otherY: number, otherRole: 'parent' | 'child',
    spineX: number, spineY: number,
    stageWidth: number, stageHeight: number,
): string {
    const couple = { x: spineX, y: spineY };
    const other = { x: otherX, y: otherY };
    const coupleEdge = pullBackPct(other, couple, CIRCLE_RADIUS_PX.focus + LINE_GAP_PX, stageWidth, stageHeight);
    const otherEdge = pullBackPct(couple, other, CIRCLE_RADIUS_PX[otherRole] + LINE_GAP_PX, stageWidth, stageHeight);
    return straightPath(coupleEdge.x, coupleEdge.y, otherEdge.x, otherEdge.y);
}

// Nudges every bubble NOT in `movers` out of the way of whichever mover(s)
// are overlapping it this frame — and out of each *other's* way too, not
// just the movers' — mutating `next` in place and recording each one's
// original spot in drag.pushed the first time it's touched, so
// handleNodePointerUp knows to spring it back too, the same as a
// deliberately dragged one. Passive-vs-passive matters here: without it, two
// passive bubbles sitting close together would each dodge the mover
// independently, and one's dodge could land it squarely on top of the
// other, since nothing checked them against each other.
function applyCollisions(
    next: NodeOverrides,
    excludeUids: Set<number>,
    movers: MoverPx[],
    drag: { rectW: number; rectH: number; pushed: Map<number, { baseX: number; baseY: number }> },
    basePositionByUid: Map<number, { x: number; y: number }>,
    roleByUid: Map<number, Role>,
    zoom: number,
) {
    const nodes: CollisionNode[] = movers.map((m) => ({ uid: -1, xPx: m.xPx, yPx: m.yPx, r: m.r, pinned: true }));
    const passives: { uid: number; basePos: { x: number; y: number }; startXPx: number; startYPx: number; node: CollisionNode }[] = [];
    basePositionByUid.forEach((basePos, uid) => {
        if (excludeUids.has(uid)) return;
        const role = roleByUid.get(uid);
        if (!role) return;
        const { xPx, yPx } = pctToPx(next[uid] ?? basePos, drag.rectW, drag.rectH);
        const node: CollisionNode = { uid, xPx, yPx, r: CIRCLE_RADIUS_PX[role] * zoom, pinned: false };
        nodes.push(node);
        passives.push({ uid, basePos, startXPx: xPx, startYPx: yPx, node });
    });
    relaxCollisions(nodes, COLLISION_GAP_PX * zoom);
    passives.forEach(({ uid, basePos, startXPx, startYPx, node }) => {
        if (Math.hypot(node.xPx - startXPx, node.yPx - startYPx) < 0.01) return;
        next[uid] = pxToPct(node.xPx, node.yPx, drag.rectW, drag.rectH);
        if (!drag.pushed.has(uid)) {
            drag.pushed.set(uid, { baseX: basePos.x, baseY: basePos.y });
        }
    });
}

// The default (no-drag) layout itself can land two bubbles close enough to
// overlap — a parent's jitter reaching toward the focus couple, or several
// children's fan bringing two of them nearer than their radii allow — well
// before anyone drags anything. Resolved once per render, in a nominal,
// zoom-independent pixel space (matching .stage's CSS max-width/min-height)
// since this isn't tied to the live drag's actual rendered size. The focus
// couple is pinned (as one merged obstacle, see mergeIntoBoundingMover) —
// its own position is never adjusted to make room for anyone else — while
// every parent and child relaxes around it and around each other.
const NOMINAL_RECT_W = 980;
const NOMINAL_RECT_H = 560;

function resolveStaticOverlaps(
    anchors: { x: number; y: number; role: Role }[],
    movable: { uid: number; x: number; y: number; role: Role }[],
): Map<number, { x: number; y: number }> {
    const anchorCircles: MoverPx[] = anchors.map((a) => ({
        xPx: (a.x / 100) * NOMINAL_RECT_W,
        yPx: (a.y / 100) * NOMINAL_RECT_H,
        r: CIRCLE_RADIUS_PX[a.role],
    }));
    const mergedAnchor = mergeIntoBoundingMover(anchorCircles);
    const nodes: CollisionNode[] = mergedAnchor ? [{ uid: -1, ...mergedAnchor, pinned: true }] : [];
    movable.forEach((m) => {
        nodes.push({
            uid: m.uid,
            xPx: (m.x / 100) * NOMINAL_RECT_W,
            yPx: (m.y / 100) * NOMINAL_RECT_H,
            r: CIRCLE_RADIUS_PX[m.role],
            pinned: false,
        });
    });
    relaxCollisions(nodes, COLLISION_GAP_PX);
    const result = new Map<number, { x: number; y: number }>();
    nodes.forEach((n) => {
        if (n.uid < 0) return;
        result.set(n.uid, { x: clampPct((n.xPx / NOMINAL_RECT_W) * 100), y: clampPct((n.yPx / NOMINAL_RECT_H) * 100) });
    });
    return result;
}

// Kept at module scope (not nested in FamTree, even though it's only ever
// called from one of that component's event handlers) — a component-body
// function that calls performance.now()/requestAnimationFrame gets flagged
// as "could run during render" by the react-compiler-purity lint rule,
// since it can't prove from the call graph alone that it never does here.
//
// Tweens overrides[uid] from its just-released position back to its
// computed one over SNAP_BACK_MS, ease-out. Every frame it writes through
// the same nodeOverrides state the drag itself used, so whatever reads
// that (the bubble's left/top *and* its connector line's SVG path
// endpoint) moves together — a CSS transition on the node alone can't do
// that second part, since SVG path `d` isn't reliably animatable that way.
function startSnapBack(
    uid: number,
    fromX: number, fromY: number, toX: number, toY: number,
    snapAnimRef: { current: Map<number, number> },
    setNodeOverrides: Dispatch<SetStateAction<NodeOverrides>>,
    setDrivenUids: Dispatch<SetStateAction<Set<number>>>,
) {
    const start = performance.now();
    function step(now: number) {
        const t = Math.min(1, (now - start) / SNAP_BACK_MS);
        const eased = 1 - Math.pow(1 - t, 3);
        if (t >= 1) {
            snapAnimRef.current.delete(uid);
            setNodeOverrides((prev) => {
                if (!(uid in prev)) return prev;
                const next = { ...prev };
                delete next[uid];
                return next;
            });
            setDrivenUids((prev) => {
                if (!prev.has(uid)) return prev;
                const next = new Set(prev);
                next.delete(uid);
                return next;
            });
            return;
        }
        setNodeOverrides((prev) => ({
            ...prev,
            [uid]: { x: fromX + (toX - fromX) * eased, y: fromY + (toY - fromY) * eased },
        }));
        snapAnimRef.current.set(uid, requestAnimationFrame(step));
    }
    snapAnimRef.current.set(uid, requestAnimationFrame(step));
}

function FamTree() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { activeBranch, loading: branchesLoading } = useBranch();
    // Only falls back to DEFAULT_FOCUS_UID while branches are still
    // resolving (so there's nothing else to go on yet) — an active branch
    // that's genuinely empty gets `null` instead of quietly borrowing some
    // other branch's root, which used to leak that branch's tree in here.
    const focusUid = id
        ? Number(id)
        : branchesLoading
            ? DEFAULT_FOCUS_UID
            : activeBranch?.rootPersonId ?? null;
    const { t } = useLocale();
    const { setHovered } = useHoveredPerson();

    const [people, setPeople] = useState<Person[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    // The DOM nodes for people who persist across a focus change (e.g. the
    // old focus becoming a parent, the clicked child becoming the new focus)
    // are kept as the *same* React element below — keyed by uid in one
    // unified list rather than three separate per-role lists — so a plain
    // CSS transition on left/top/size carries them smoothly from their old
    // spot to their new one instead of snapping. These two remember who was
    // on screen just before the most recent change, so brand-new arrivals (a
    // newly-revealed child's own children) can be told apart and given an
    // entrance animation instead of a slide. State (not a ref) on purpose —
    // reading a ref during render to compare against is unsound; this uses
    // React's documented "adjust state while rendering" pattern instead,
    // which bails out and re-renders once rather than committing a stale
    // frame.
    const [lastUidKey, setLastUidKey] = useState('');
    const [prevUidSet, setPrevUidSet] = useState<Set<number>>(new Set());

    // Manual repositioning: dragging a bubble nudges it relative to the
    // others (rather than panning the whole view) for as long as it's held
    // — released, it springs back to its computed spot (see
    // handleNodePointerUp). Keyed by uid, holding an absolute override
    // position (in the same 0–100 % space as the layout math above) that
    // takes over from the computed scatter position while present.
    const [nodeOverrides, setNodeOverrides] = useState<NodeOverrides>({});
    // Bubbles (if any) that currently have their position driven
    // imperatively — either by the pointer mid-drag, or by the snap-back
    // tween afterward. More than one at once when a couple drag carries the
    // other spouse and the children fan along (see handleNodePointerDown).
    // Separate from nodeOverrides below so this only updates a handful of
    // times per gesture rather than on every pointermove/animation frame.
    // Used purely to suspend each node's left/top CSS transition for as
    // long as something else (the pointer, then the tween) is setting its
    // position every frame — otherwise the two would fight each other.
    const [drivenUids, setDrivenUids] = useState<Set<number>>(new Set());
    const stageRef = useRef<HTMLDivElement | null>(null);
    // The stage's actual rendered width/height — .stage no longer caps its
    // width (see FamTree.module.css), so these vary with the viewport. Width
    // is fed into clusterPositions so the focus couple's tuned-by-eye
    // closeness stays pixel-stable instead of drifting apart on a wider
    // screen; both are fed into the connector-line endpoint pull-back below,
    // for the same reason — a line's percentage coordinates map onto the
    // stage anisotropically (see linkLayer in FamTree.module.css), so
    // shortening a line by a consistent actual pixel amount needs the real
    // width/height, not just the raw percentages.
    const [stageWidth, setStageWidth] = useState(NOMINAL_RECT_W);
    const [stageHeight, setStageHeight] = useState(NOMINAL_RECT_H);
    useEffect(() => {
        const el = stageRef.current;
        if (!el) return;
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                setStageWidth(entry.contentRect.width);
                setStageHeight(entry.contentRect.height);
            }
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
    // Imperative drag bookkeeping lives in a ref (read only from event
    // handlers, never during render) rather than state — a drag updates
    // dozens of times a second and doesn't need to trigger its own
    // re-render beyond the `nodeOverrides` state it writes.
    const nodeDragRef = useRef<{
        uid: number; startX: number; startY: number; baseX: number; baseY: number; rectW: number; rectH: number; moved: boolean;
        // The rest of the couple (if this is the focus or a spouse) — moved
        // by the exact same delta so they stay together. Each entry's own
        // base position, captured at drag start.
        linked: { uid: number; baseX: number; baseY: number }[];
        // The children, leaned by BALANCE_FACTOR of the same delta so the
        // fan visually balances toward wherever the couple ends up.
        balanced: { uid: number; baseX: number; baseY: number }[];
        // Bubbles collision-pushed out of the way mid-drag (see
        // applyCollisions) — discovered dynamically frame by frame, unlike
        // linked/balanced above which are fixed at drag start.
        pushed: Map<number, { baseX: number; baseY: number }>;
    } | null>(null);
    // In-flight snap-back animation frame ids, keyed by uid, so a fresh drag
    // started on a bubble that's still mid-snap-back cancels that tween
    // instead of fighting it.
    const snapAnimRef = useRef<Map<number, number>>(new Map());

    const [zoom, setZoom] = useState(1);
    // Whole-view pan — separate from nodeOverrides above: this moves the
    // camera, nodeOverrides moves a bubble relative to the others. A drag
    // starting on empty stage background pans; a drag starting on a bubble
    // (which stops the pointerdown from bubbling here, see
    // handleNodePointerDown) repositions that bubble instead.
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const viewDragRef = useRef<{ startX: number; startY: number; panX: number; panY: number; moved: boolean } | null>(null);

    // Each new focus starts from the same centered, unzoomed view with no
    // manual repositioning carried over, rather than inheriting wherever
    // the previous person's view/bubbles happened to be panned/dragged to.
    // Reset during render (the same "adjust state while rendering" pattern
    // as lastUidKey/prevUidSet above), not in an effect — setting state
    // synchronously inside an effect body just to react to a prop change
    // causes an extra committed render instead of folding into this one.
    const [lastFocusUidForView, setLastFocusUidForView] = useState(focusUid);
    if (focusUid !== lastFocusUidForView) {
        setLastFocusUidForView(focusUid);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setNodeOverrides({});
    }

    // Cancels any still-running snap-back tweens from the person being left
    // behind — plain ref/rAF cleanup (no setState), so unlike the state
    // reset above this belongs in an effect rather than during render.
    useEffect(() => {
        const inFlight = snapAnimRef.current;
        return () => {
            inFlight.forEach((frameId) => cancelAnimationFrame(frameId));
            inFlight.clear();
        };
    }, [focusUid]);

    // A callback ref (not useEffect) so the listener attaches the moment
    // .viewport actually mounts — including the first time, right after the
    // loading/error branches (which don't render it at all) give way to the
    // real view. A plain useEffect with an empty dep array ran once right
    // after the *first* commit, which was still the loading branch, so the
    // wheel listener never got attached at all once data arrived.
    // Also attached natively rather than via JSX onWheel because React
    // marks onWheel passive by default, which silently no-ops
    // preventDefault — and without it, the wheel would zoom the
    // constellation *and* scroll the page underneath it at the same time.
    const setViewportRef = useCallback((el: HTMLDivElement | null) => {
        if (!el) return;
        function handleWheelNative(e: WheelEvent) {
            e.preventDefault();
            const factor = Math.exp(-e.deltaY * 0.001);
            setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)));
        }
        el.addEventListener('wheel', handleWheelNative, { passive: false });
        return () => el.removeEventListener('wheel', handleWheelNative);
    }, []);

    function handleViewportPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
        viewDragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y, moved: false };
        e.currentTarget.setPointerCapture(e.pointerId);
    }

    function handleViewportPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
        const drag = viewDragRef.current;
        if (!drag || e.buttons === 0) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (!drag.moved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
            drag.moved = true;
        }
        if (drag.moved) {
            setPan({ x: drag.panX + dx, y: drag.panY + dy });
        }
    }

    function handleViewportPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
        viewDragRef.current = null;
    }

    // Looks up each uid's base (pre-drag) position, dropping any that
    // aren't on screen right now.
    function toPositions(uids: number[]): { uid: number; baseX: number; baseY: number }[] {
        return uids
            .map((u) => {
                const pos = basePositionByUid.get(u);
                return pos ? { uid: u, baseX: pos.x, baseY: pos.y } : null;
            })
            .filter((v): v is { uid: number; baseX: number; baseY: number } => v !== null);
    }

    function handleNodePointerDown(e: ReactPointerEvent<HTMLButtonElement>, uid: number, baseX: number, baseY: number, role: Role) {
        const rect = stageRef.current?.getBoundingClientRect();
        if (!rect) return;

        // Dragging either half of the focus couple carries the other half
        // along (they stay close together) and leans *both* neighboring
        // generations — the children below and the parents above — toward
        // the same side (see BALANCE_FACTOR). The relationship only
        // cascades outward from the focus couple: parents aren't linked to
        // each other and don't push the couple below around — each parent,
        // like each child, moves independently when dragged directly.
        let linked: { uid: number; baseX: number; baseY: number }[] = [];
        let balanced: { uid: number; baseX: number; baseY: number }[] = [];
        if (role === 'focus' || role === 'spouse') {
            const coupleUids = [
                ...(focusPerson ? [focusPerson.uid] : []),
                ...spouses.map((s) => s.uid),
            ].filter((u) => u !== uid);
            linked = toPositions(coupleUids);
            balanced = toPositions([
                ...children.map((c) => c.uid),
                ...parents.map((p) => p.uid),
            ]);
        }

        // Grabbing a bubble mid-snap-back takes over from the tween rather
        // than fighting it for control of nodeOverrides — for this node and
        // anything it's about to carry along with it.
        [uid, ...linked.map((l) => l.uid), ...balanced.map((b) => b.uid)].forEach((u) => {
            const inFlight = snapAnimRef.current.get(u);
            if (inFlight !== undefined) {
                cancelAnimationFrame(inFlight);
                snapAnimRef.current.delete(u);
            }
        });

        nodeDragRef.current = {
            uid, startX: e.clientX, startY: e.clientY, baseX, baseY, rectW: rect.width, rectH: rect.height, moved: false, linked, balanced,
            pushed: new Map(),
        };
        setDrivenUids(new Set([uid, ...linked.map((l) => l.uid), ...balanced.map((b) => b.uid)]));
        e.currentTarget.setPointerCapture(e.pointerId);
        // Otherwise a drag that starts on a bubble would also kick off the
        // click a moment later regardless of this handler's own logic.
        e.stopPropagation();
    }

    function handleNodePointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
        const drag = nodeDragRef.current;
        if (!drag) return;
        // Pointer capture redirects this event to the dragged button
        // instead of whatever's under the pointer, but capture doesn't
        // stop normal DOM bubbling — without this, the move would also
        // reach .viewport's own pan handler and pan the whole camera at
        // the same time as this bubble is being dragged.
        e.stopPropagation();
        // Once the button's released, capture lets go and plain
        // hover-triggered pointermoves start reaching whichever node the
        // mouse happens to pass over next — without this check, those
        // would read the still-set-from-last-drag nodeDragRef and keep
        // nudging the *previous* bubble as if the drag never ended.
        if (e.buttons === 0) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (!drag.moved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
            drag.moved = true;
        }
        if (!drag.moved) return;
        const dxPct = (dx / drag.rectW) * 100;
        const dyPct = (dy / drag.rectH) * 100;
        const nextX = clampPct(drag.baseX + dxPct);
        const nextY = clampPct(drag.baseY + dyPct);
        // Rigid movers (the dragged bubble + anything linked to it, e.g. its
        // spouse) move in exact lockstep and are allowed to overlap each
        // other — that's the couple's intentional look (see .circleSpouse).
        const rigidPos = new Map<number, { x: number; y: number }>();
        rigidPos.set(drag.uid, { x: nextX, y: nextY });
        drag.linked.forEach((l) => {
            rigidPos.set(l.uid, { x: clampPct(l.baseX + dxPct), y: clampPct(l.baseY + dyPct) });
        });
        const rigidUids = new Set(rigidPos.keys());
        // Collision math happens in on-screen (post-zoom) pixel space (see
        // pctToPx below), so CIRCLE_RADIUS_PX/COLLISION_GAP_PX — both defined
        // at zoom=1 — need scaling by the current zoom to match; otherwise
        // bubbles end up allowed closer together than they look whenever the
        // view isn't at the default zoom.
        const gapPx = COLLISION_GAP_PX * zoom;
        const rigidCircles: MoverPx[] = [];
        rigidPos.forEach((pos, u) => {
            const role = roleByUid.get(u);
            if (!role) return;
            const { xPx, yPx } = pctToPx(pos, drag.rectW, drag.rectH);
            rigidCircles.push({ xPx, yPx, r: CIRCLE_RADIUS_PX[role] * zoom });
        });
        // Treated as one obstacle (see mergeIntoBoundingMover) so nothing can
        // end up wedged in the seam between the two focus bubbles.
        const rigidMover = mergeIntoBoundingMover(rigidCircles);
        const rigidMovers: MoverPx[] = rigidMover ? [rigidMover] : [];

        // The focus couple must never come apart, even when dragging some
        // unrelated parent or child near it — but it also shouldn't just
        // block that drag solid; it should give way, together, the same as
        // any other bystander would.
        const coupleUids = [
            ...(focusPerson ? [focusPerson.uid] : []),
            ...spouses.map((s) => s.uid),
        ];
        // True while the couple itself is what's being dragged (or carried
        // along via `linked`) — it's already represented by rigidMovers at
        // its live dragged position in that case, so the block below (which
        // only applies when something *else* is being dragged near it) is
        // skipped entirely.
        const coupleIsRigid = coupleUids.length > 0 && coupleUids.every((u) => rigidUids.has(u));

        setNodeOverrides((prev) => {
            const next = { ...prev };
            rigidPos.forEach((pos, u) => { next[u] = pos; });

            const allMovers = [...rigidMovers];

            if (!coupleIsRigid && coupleUids.length > 0) {
                // Collapsed into one merged circle (see mergeIntoBoundingMover)
                // and resolved as a single object against whatever IS being
                // dragged — so if it needs to move at all, both members move
                // by the *exact same* amount, which is what keeps them
                // together instead of one getting left behind.
                const coupleCircles: MoverPx[] = [];
                coupleUids.forEach((u) => {
                    const role = roleByUid.get(u);
                    const pos = next[u] ?? basePositionByUid.get(u);
                    if (!role || !pos) return;
                    const { xPx, yPx } = pctToPx(pos, drag.rectW, drag.rectH);
                    coupleCircles.push({ xPx, yPx, r: CIRCLE_RADIUS_PX[role] * zoom });
                });
                let cx = 0;
                let cy = 0;
                coupleCircles.forEach((c) => { cx += c.xPx; cy += c.yPx; });
                cx /= coupleCircles.length;
                cy /= coupleCircles.length;
                let cr = 0;
                coupleCircles.forEach((c) => { cr = Math.max(cr, Math.hypot(c.xPx - cx, c.yPx - cy) + c.r); });
                const resolved = resolveAgainstMovers(cx, cy, cr, rigidMovers, gapPx);
                if (resolved.moved) {
                    const deltaXPx = resolved.xPx - cx;
                    const deltaYPx = resolved.yPx - cy;
                    coupleUids.forEach((u) => {
                        const pos = next[u] ?? basePositionByUid.get(u);
                        if (!pos) return;
                        const { xPx, yPx } = pctToPx(pos, drag.rectW, drag.rectH);
                        next[u] = pxToPct(xPx + deltaXPx, yPx + deltaYPx, drag.rectW, drag.rectH);
                        if (!drag.pushed.has(u)) {
                            const basePos = basePositionByUid.get(u);
                            if (basePos) drag.pushed.set(u, { baseX: basePos.x, baseY: basePos.y });
                        }
                    });
                }
                // Either way, the couple (at its possibly just-shifted spot)
                // is still an obstacle for everyone else this frame.
                allMovers.push({ xPx: resolved.xPx, yPx: resolved.yPx, r: cr });
            }

            // Balanced bubbles (children/parents leaning the other way, see
            // BALANCE_FACTOR) only move a damped fraction of the drag, so
            // they're not rigidly tied to it — the couple, moving the full
            // distance, can otherwise run straight into one of them. Resolve
            // each one's damped target against the rigid movers first, then
            // fold its resolved spot into the moving cluster so everything
            // else treats it the same as a rigid mover too.
            drag.balanced.forEach((b) => {
                const role = roleByUid.get(b.uid);
                if (!role) return;
                const targetPct = {
                    x: clampPct(b.baseX + dxPct * BALANCE_FACTOR),
                    y: clampPct(b.baseY + dyPct * BALANCE_FACTOR),
                };
                const { xPx, yPx } = pctToPx(targetPct, drag.rectW, drag.rectH);
                const resolved = resolveAgainstMovers(xPx, yPx, CIRCLE_RADIUS_PX[role] * zoom, rigidMovers, gapPx);
                next[b.uid] = pxToPct(resolved.xPx, resolved.yPx, drag.rectW, drag.rectH);
                allMovers.push({ xPx: resolved.xPx, yPx: resolved.yPx, r: CIRCLE_RADIUS_PX[role] * zoom });
            });

            // The couple is excluded here too — never a push target, same as
            // the dragged cluster — so it can only ever move by being
            // dragged (or carried along as `linked`), never nudged aside by
            // someone else's drag.
            const movingUids = new Set([...rigidUids, ...drag.balanced.map((b) => b.uid), ...coupleUids]);
            // Anything else on screen that's now in the way gets nudged
            // aside rather than buried under the dragged cluster.
            applyCollisions(next, movingUids, allMovers, drag, basePositionByUid, roleByUid, zoom);
            return next;
        });
        // Freshly-pushed bubbles need their CSS transition suspended too
        // (see the .dragging class) for as long as they're being nudged
        // every frame, same as the ones actually being dragged.
        setDrivenUids(new Set([
            ...rigidUids,
            ...drag.balanced.map((b) => b.uid),
            ...drag.pushed.keys(),
        ]));
    }

    function handleNodePointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
        // Same reason as in handleNodePointerMove — this would otherwise
        // also reach .viewport's pointerup handler.
        e.stopPropagation();
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
        const finishedDrag = nodeDragRef.current;
        if (finishedDrag?.moved) {
            // Each affected uid stays in drivenUids (see startSnapBack) —
            // the tween keeps driving its position every frame, so its CSS
            // transition needs to stay suspended until that finishes, not
            // just until the pointer lets go.
            const affected = [
                { uid: finishedDrag.uid, baseX: finishedDrag.baseX, baseY: finishedDrag.baseY },
                ...finishedDrag.linked,
                ...finishedDrag.balanced,
                ...Array.from(finishedDrag.pushed.entries()).map(([uid, pos]) => ({ uid, baseX: pos.baseX, baseY: pos.baseY })),
            ];
            affected.forEach(({ uid, baseX, baseY }) => {
                const current = nodeOverrides[uid] ?? { x: baseX, y: baseY };
                const base = basePositionByUid.get(uid) ?? { x: baseX, y: baseY };
                startSnapBack(uid, current.x, current.y, base.x, base.y, snapAnimRef, setNodeOverrides, setDrivenUids);
            });
        } else {
            setDrivenUids(new Set());
        }
        // Not cleared immediately — the node's onClick (see below) needs to
        // read .moved right after this to tell a real click from the tail
        // end of a drag, and that click (if any) hasn't fired yet. Cleared
        // on the next tick instead, once the click/non-click has resolved,
        // so a later hover can't misread it (the e.buttons guard above
        // already prevents the actual symptom; this just avoids leaving a
        // stale, finished drag sitting in the ref indefinitely).
        setTimeout(() => {
            if (nodeDragRef.current === finishedDrag) nodeDragRef.current = null;
        }, 0);
    }

    function zoomBy(factor: number) {
        setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)));
    }

    function resetView() {
        setZoom(1);
        setPan({ x: 0, y: 0 });
        snapAnimRef.current.forEach((frameId) => cancelAnimationFrame(frameId));
        snapAnimRef.current.clear();
        setNodeOverrides({});
        setDrivenUids(new Set());
    }

    const load = useCallback(() => {
        let cancelled = false;
        fetchPeople(activeBranch?.id)
            .then((data) => {
                if (!cancelled) setPeople(data);
            })
            .catch(() => {
                if (!cancelled) setError(t('famTree.loadError'));
            });
        return () => {
            cancelled = true;
        };
    }, [t, activeBranch?.id]);

    useEffect(load, [load]);
    useEffect(() => onPersonAdded(load), [load]);

    function recenter(uid: number) {
        navigate(`/focus/${uid}`);
    }

    const peopleById = people ? new Map(people.map((p) => [p.uid, p])) : null;
    const focusPerson = (focusUid !== null ? peopleById?.get(focusUid) : undefined) ?? null;

    const parents = focusPerson
        ? focusPerson.parentUid.map((pid) => peopleById!.get(pid)).filter((p): p is Person => Boolean(p))
        : [];
    const spouses = focusPerson
        ? (focusPerson.spouseUid ?? []).map((sid) => peopleById!.get(sid)).filter((p): p is Person => Boolean(p))
        : [];
    const children = focusPerson
        ? focusPerson.offspringUid.map((cid) => peopleById!.get(cid)).filter((p): p is Person => Boolean(p))
        : [];

    const { focusX, spouseXs } = clusterPositions(spouses.length, stageWidth);
    const pPos = scatter(parentXs(parents.length), PARENTS_Y);
    const cPos = scatter(childXs(children.length), CHILDREN_Y);

    // Parents and children get nudged clear of the focus couple and of each
    // other (see resolveStaticOverlaps) before anything is rendered or
    // dragged — their raw scatter position above is just a starting point,
    // not guaranteed collision-free on its own (a parent's jitter can reach
    // toward the couple, or two children can fan out closer than their
    // radii allow).
    const resolvedMovable = resolveStaticOverlaps(
        [
            ...(focusPerson ? [{ x: focusX, y: FOCUS_Y, role: 'focus' as const }] : []),
            ...spouseXs.map((x) => ({ x, y: FOCUS_Y + SPOUSE_Y_OFFSET, role: 'spouse' as const })),
        ],
        [
            ...parents.map((p, i) => ({ uid: p.uid, x: pPos[i].x, y: pPos[i].y, role: 'parent' as const })),
            ...children.map((c, i) => ({ uid: c.uid, x: cPos[i].x, y: cPos[i].y, role: 'child' as const })),
        ],
    );

    // The computed (pre-drag) position for every uid currently on screen —
    // what startSnapBack above tweens a released bubble back toward.
    const basePositionByUid = new Map<number, { x: number; y: number }>();
    if (focusPerson) basePositionByUid.set(focusPerson.uid, { x: focusX, y: FOCUS_Y });
    spouses.forEach((s, i) => basePositionByUid.set(s.uid, { x: spouseXs[i], y: FOCUS_Y + SPOUSE_Y_OFFSET }));
    parents.forEach((p, i) => basePositionByUid.set(p.uid, resolvedMovable.get(p.uid) ?? pPos[i]));
    children.forEach((c, i) => basePositionByUid.set(c.uid, resolvedMovable.get(c.uid) ?? cPos[i]));

    // Each uid's role — used only to look up its circle size for
    // applyCollisions' overlap check.
    const roleByUid = new Map<number, Role>();
    if (focusPerson) roleByUid.set(focusPerson.uid, 'focus');
    spouses.forEach((s) => roleByUid.set(s.uid, 'spouse'));
    parents.forEach((p) => roleByUid.set(p.uid, 'parent'));
    children.forEach((c) => roleByUid.set(c.uid, 'child'));

    // The resolved base position for that uid, overridden by wherever the
    // user has manually dragged it to.
    function eff(uid: number): { x: number; y: number } {
        return nodeOverrides[uid] ?? basePositionByUid.get(uid) ?? { x: 50, y: 50 };
    }

    const focusEff = focusPerson ? eff(focusPerson.uid) : { x: focusX, y: FOCUS_Y };
    const spouseEff = spouses.map((s) => eff(s.uid));
    const parentEff = parents.map((p) => eff(p.uid));
    const childEff = children.map((c) => eff(c.uid));

    // One shared anchor point for both the upward (parents) and downward
    // (children) links — the couple's mid-point when there's a spouse, or
    // the focus person alone otherwise — so the whole thing reads as one
    // continuous spine instead of two links drifting to different x's. Uses
    // the *effective* (post-drag) position so the lines follow a manually
    // repositioned focus/spouse bubble.
    const spineX = spouseEff.length > 0 ? (focusEff.x + spouseEff[0].x) / 2 : focusEff.x;
    const spineY = spouseEff.length > 0 ? (focusEff.y + spouseEff[0].y) / 2 : focusEff.y;

    // The focus bubble's decorative "orbit ring" (see visNodes.map below)
    // keeps a FIXED tilt (ORBIT_ANGLE_DEG, the direction already approved —
    // see "tilt it to the other direction" in the history) rather than a
    // computed angle: solving for the angle that hits the spouse's exact
    // center, for a couple sitting close together (see CLOSENESS above),
    // forces a steep, degenerate-looking tilt instead of a gentle orbit.
    // Solving for the SIZE instead, at that fixed angle, has no such
    // failure mode and still guarantees an exact fit: in the ellipse's own
    // (unrotated) frame the spouse sits at local point (xLocal, yLocal) —
    // found by un-rotating the real focus-to-spouse offset by the fixed
    // tilt — and for a point to sit exactly on an ellipse of ratio
    // ry = rx * ORBIT_FLATNESS, rx must equal
    // sqrt(xLocal^2 + (yLocal / ORBIT_FLATNESS)^2).
    const ORBIT_ANGLE_DEG = 24;
    const ORBIT_FLATNESS = 0.4; // ry / rx — same Saturn's-rings look as before
    let orbitRx = 95;
    let orbitRy = orbitRx * ORBIT_FLATNESS;
    let orbitAngleDeg = ORBIT_ANGLE_DEG;
    if (spouseEff.length > 0) {
        const focusPx = pctToPx(focusEff, stageWidth, stageHeight);
        const spousePx = pctToPx(spouseEff[0], stageWidth, stageHeight);
        const dxPx = spousePx.xPx - focusPx.xPx;
        const dyPx = spousePx.yPx - focusPx.yPx;
        const d = Math.hypot(dxPx, dyPx);
        const phi = Math.atan2(dyPx, dxPx);
        const thetaRad = (ORBIT_ANGLE_DEG * Math.PI) / 180;
        const psi = phi - thetaRad;
        const xLocal = d * Math.cos(psi);
        const yLocal = d * Math.sin(psi);

        // Scaled up beyond the exact-fit size — the user asked for a bigger
        // diameter outright rather than more exact-fit math; angle/shape
        // ratio stay the same, just larger, so it still reads as pointing
        // the right way, just as a bigger ring.
        const ORBIT_DIAMETER_SCALE = 1.6;
        orbitRx = Math.max(60, Math.hypot(xLocal, yLocal / ORBIT_FLATNESS)) * ORBIT_DIAMETER_SCALE;
        orbitRy = orbitRx * ORBIT_FLATNESS;
        orbitAngleDeg = ORBIT_ANGLE_DEG;
    }

    const visNodes: VisNode[] = focusPerson
        ? [
              ...parents.map((p, i) => ({ uid: p.uid, person: p, x: parentEff[i].x, y: parentEff[i].y, role: 'parent' as const })),
              { uid: focusPerson.uid, person: focusPerson, x: focusEff.x, y: focusEff.y, role: 'focus' as const },
              ...spouses.map((s, i) => ({ uid: s.uid, person: s, x: spouseEff[i].x, y: spouseEff[i].y, role: 'spouse' as const })),
              ...children.map((c, i) => ({ uid: c.uid, person: c, x: childEff[i].x, y: childEff[i].y, role: 'child' as const })),
          ]
        : [];

    // A stable, order-independent fingerprint of who's currently on screen.
    // When it differs from last render's, this is a real transition — stash
    // the outgoing set (for "is this node new?" below) and adopt the new
    // fingerprint as the baseline for next time.
    const currentUidKey = visNodes.map((n) => n.uid).sort((a, b) => a - b).join(',');
    const hasPriorFrame = lastUidKey.length > 0;
    if (currentUidKey !== lastUidKey) {
        setPrevUidSet(new Set(lastUidKey ? lastUidKey.split(',').map(Number) : []));
        setLastUidKey(currentUidKey);
    }

    if (error) {
        return (
            <div className={styles.focusWrap}>
                <p className={styles.statusMessage}>{error}</p>
            </div>
        );
    }
    if (!people) {
        return (
            <div className={styles.focusWrap}>
                <p className={styles.statusMessage}>{t('famTree.loading')}</p>
            </div>
        );
    }
    if (!focusPerson) {
        return (
            <div className={styles.focusWrap}>
                <p className={styles.statusMessage}>
                    {focusUid === null ? t('famTree.emptyBranch') : t('famTree.personNotFound')}
                </p>
            </div>
        );
    }

    return (
        <div className={styles.focusWrap}>
            <div
                className={styles.viewport}
                ref={setViewportRef}
                onPointerDown={handleViewportPointerDown}
                onPointerMove={handleViewportPointerMove}
                onPointerUp={handleViewportPointerUp}
                onPointerCancel={handleViewportPointerUp}
            >
            <div
                className={styles.starfield}
                style={{ transform: `translate(${pan.x * STAR_PARALLAX}px, ${pan.y * STAR_PARALLAX}px)` }}
            >
                {STARS.map(([sx, sy], i) => (
                    <div key={i} className={styles.star} style={{ left: `${sx}%`, top: `${sy}%` }} />
                ))}
            </div>
            <div className={styles.canvas} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
            <div className={styles.stage} ref={stageRef}>
                <svg className={styles.linkLayer} viewBox="0 0 100 100" preserveAspectRatio="none">
                    {spouseEff.map((sp, i) => {
                        const focusPt = { x: focusEff.x, y: focusEff.y };
                        const spousePt = { x: sp.x, y: sp.y };
                        const focusEdge = pullBackPct(spousePt, focusPt, CIRCLE_RADIUS_PX.focus + LINE_GAP_PX, stageWidth, stageHeight);
                        const spouseEdge = pullBackPct(focusPt, spousePt, CIRCLE_RADIUS_PX.spouse + LINE_GAP_PX, stageWidth, stageHeight);
                        return (
                            <path
                                key={`bond-${focusPerson.uid}-${i}`}
                                className={styles.bond}
                                d={straightPath(focusEdge.x, focusEdge.y, spouseEdge.x, spouseEdge.y)}
                            />
                        );
                    })}
                    {parents.length === 0 ? (
                        <path
                            key={`no-parents-${focusPerson.uid}`}
                            className={`${styles.link} ${styles.linkDim}`}
                            d={coupleLinkPath(spineX, PARENTS_Y, 'parent', spineX, spineY, stageWidth, stageHeight)}
                        />
                    ) : (
                        parents.map((p, i) => (
                            <path
                                key={`link-parent-${focusPerson.uid}-${p.uid}`}
                                className={styles.link}
                                style={{ animationDelay: `${i * 70}ms` }}
                                d={coupleLinkPath(parentEff[i].x, parentEff[i].y, 'parent', spineX, spineY, stageWidth, stageHeight)}
                            />
                        ))
                    )}
                    {children.map((c, i) => (
                        <path
                            key={`link-child-${focusPerson.uid}-${c.uid}`}
                            className={styles.link}
                            style={{ animationDelay: `${120 + i * 70}ms` }}
                            d={coupleLinkPath(childEff[i].x, childEff[i].y, 'child', spineX, spineY, stageWidth, stageHeight)}
                        />
                    ))}
                </svg>

                {parents.length === 0 && (
                    <div className={styles.node} style={{ left: `${spineX}%`, top: `${PARENTS_Y}%` }}>
                        <div className={`${styles.circle} ${styles.sizeMd} ${styles.unlit}`}>?</div>
                        <div className={styles.placeholderLabel}>{t('famTree.noParentsOnRecord')}</div>
                    </div>
                )}

                {visNodes.map((n, i) => {
                    const isFocus = n.role === 'focus';
                    const sizeClass = isFocus ? styles.sizeLg : n.role === 'spouse' ? styles.sizeMdLg : styles.sizeMd;
                    const roleClass = isFocus ? styles.circleFocused : n.role === 'spouse' ? styles.circleSpouse : '';
                    const entering = hasPriorFrame && !prevUidSet.has(n.uid);
                    // Covers both phases of a drag gesture — held, and then
                    // tweening back via startSnapBack — since both drive
                    // this node's position every frame (this one, and/or
                    // the rest of a couple + children it's carrying along)
                    // and need its normal left/top transition suspended the
                    // whole time.
                    const isDriven = drivenUids.has(n.uid);
                    return (
                        <button
                            key={n.uid}
                            type="button"
                            className={`${styles.node}${entering ? ` ${styles.nodeEnter}` : ''}${isDriven ? ` ${styles.dragging}` : ''}`}
                            style={{
                                left: `${n.x}%`,
                                top: `${n.y}%`,
                                ...(entering ? { animationDelay: `${180 + i * 90}ms` } : {}),
                            }}
                            tabIndex={isFocus ? -1 : undefined}
                            onPointerDown={(e) => handleNodePointerDown(e, n.uid, n.x, n.y, n.role)}
                            onPointerMove={handleNodePointerMove}
                            onPointerUp={handleNodePointerUp}
                            onPointerCancel={handleNodePointerUp}
                            onClick={isFocus ? undefined : () => {
                                if (nodeDragRef.current?.uid === n.uid && nodeDragRef.current.moved) return;
                                recenter(n.uid);
                            }}
                            onMouseOver={(e) => setHovered(n.person, e.currentTarget.getBoundingClientRect())}
                            onMouseOut={() => setHovered(null)}
                        >
                            <span className={styles.avatarWrap}>
                                {isFocus && (
                                    <svg
                                        className={`${styles.orbitRing} ${styles.orbitRingBack}`}
                                        viewBox="0 0 240 240"
                                        style={{ transform: `translate(-50%, -50%) rotate(${orbitAngleDeg}deg)` }}
                                        aria-hidden="true"
                                    >
                                        <ellipse cx="120" cy="120" rx={orbitRx} ry={orbitRy} />
                                    </svg>
                                )}
                                <PersonAvatar person={n.person} className={`${styles.circle} ${sizeClass} ${roleClass}`} />
                                {needsReview(n.person) && <span className={styles.reviewDot} title={t('personCard.reviewTitle')} />}
                                {isFocus && (
                                    <svg
                                        className={`${styles.orbitRing} ${styles.orbitRingFront}`}
                                        viewBox="0 0 240 240"
                                        style={{ transform: `translate(-50%, -50%) rotate(${orbitAngleDeg}deg)` }}
                                        aria-hidden="true"
                                    >
                                        <ellipse cx="120" cy="120" rx={orbitRx} ry={orbitRy} />
                                    </svg>
                                )}
                            </span>
                            <span className={styles.label}>
                                <span className={styles.name}>{n.person.firstName}</span>
                                <span className={styles.years}>{yearsRange(n.person)}</span>
                            </span>
                        </button>
                    );
                })}
            </div>
            </div>
            </div>

            <div className={styles.zoomControls}>
                <button type="button" className={styles.zoomBtn} onClick={() => zoomBy(1.25)} title={t('famTree.zoomIn')} aria-label={t('famTree.zoomIn')}>+</button>
                <button type="button" className={styles.zoomBtn} onClick={() => zoomBy(1 / 1.25)} title={t('famTree.zoomOut')} aria-label={t('famTree.zoomOut')}>–</button>
                <button type="button" className={styles.zoomBtn} onClick={resetView} title={t('famTree.resetView')} aria-label={t('famTree.resetView')}>↺</button>
            </div>
        </div>
    )
}
export default FamTree
