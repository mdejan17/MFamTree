
import Header from '../components/Header.tsx'
import Footer from '../components/Footer.tsx'
import Tree, { type RawNodeDatum } from 'react-d3-tree';
import '../components/modules/Tree.css';
import 'treeflex/dist/css/treeflex.css'
import AddUser from '../components/AddUser.tsx'
import style from './modules/Home.module.css'
import {useEffect, useRef, useState} from 'react'
import { useLocation } from 'react-router-dom'
import {CustomNode} from '../components/PersonCard.tsx';
import SwitchTreeViewButton from '../components/SwitchTreeViewButton.tsx';
import stylesButton from '../components/modules/Button.module.css'
import ContextualPopover from '../components/ContextualPopover.tsx';
import { fetchTree } from '../api/people.ts'
import type { PersonNode } from '../data/mockDatabase.tsx'
import { onPersonAdded } from '../events.ts'
import { TreeNodePositionProvider, useTreeNodePositions } from '../ui/TreeNodePositionContext.tsx'
import { useLocale } from '../i18n/LocaleContext.tsx'
import { useBranch } from '../ui/BranchContext.tsx'

// How closely "View in Tree" zooms in on the target person. react-d3-tree's
// own node-click centering (see the `dimensions` prop below) keeps whatever
// zoom level the tree was already at — fine for a quick re-center, but a
// deliberate "jump to this person" should actually bring them up close,
// since the tree's default zoom (~0.05, see getZoom()) renders everyone as
// barely-visible specks. Comfortably under scaleExtent's max of 1.
const FOCUS_ZOOM = 0.6;
// Where on screen a "View in Tree" jump places the target person —
// fractions of the viewport width/height, not dead center (0.5, 0.5),
// so the card sits a bit up and to the left instead of the exact middle.
const FOCUS_ANCHOR = { x: 0.42, y: 0.38 };

interface NodePosition {
  x: number;
  y: number;
}

// Computes a translate/zoom that centers the *whole* tree in the viewport
// and scales it to fill as much of the screen as it can (within
// scaleExtent) — used whenever the rendered layout could have changed
// shape (new data, an orientation flip, an expand/collapse-all), so the
// view isn't stuck with a zoom level tuned for some other tree's size.
// Node x/y are in react-d3-tree's own pre-orientation-swap layout space
// (sibling axis = x, depth axis = y) — see the "View in Tree" jump math
// below for the same axis swap applied to a single node instead of a
// whole bounding box.
function computeFitView(
  positions: Map<number, NodePosition>,
  orientation: 'horizontal' | 'vertical',
  nodeSize: { x: number; y: number },
  scaleExtent: { min: number; max: number },
  dimensions: { width: number; height: number }
): { translate: { x: number; y: number }; zoom: number } | null {
  if (positions.size === 0) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const { x, y } of positions.values()) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const horizontal = orientation === 'horizontal';
  const screenMinX = horizontal ? minY : minX;
  const screenMaxX = horizontal ? maxY : maxX;
  const screenMinY = horizontal ? minX : minY;
  const screenMaxY = horizontal ? maxX : maxY;
  // Half a layout cell of padding on every edge — node x/y are cell
  // centers, so without this the outermost cards would be clipped right
  // at their midpoint instead of sitting fully on screen.
  const padX = (horizontal ? nodeSize.y : nodeSize.x) / 2;
  const padY = (horizontal ? nodeSize.x : nodeSize.y) / 2;

  const treeWidth = Math.max(1, screenMaxX - screenMinX + padX * 2);
  const treeHeight = Math.max(1, screenMaxY - screenMinY + padY * 2);
  const centerX = (screenMinX + screenMaxX) / 2;
  const centerY = (screenMinY + screenMaxY) / 2;

  // A little breathing room instead of cards touching the viewport edge.
  const FILL_MARGIN = 0.88;
  const fitZoom = Math.min(dimensions.width / treeWidth, dimensions.height / treeHeight) * FILL_MARGIN;
  const zoom = Math.min(scaleExtent.max, Math.max(scaleExtent.min, fitZoom));

  return {
    zoom,
    translate: {
      x: -centerX * zoom + dimensions.width / 2,
      y: -centerY * zoom + dimensions.height / 2,
    },
  };
}

function HomeInner() {

  //Func and const for Tree management
  const [orientation, setOrientation,] = useState<'horizontal' | 'vertical'>('vertical');
  const [pathFn, setPathFn,] = useState<'diagonal' | 'step'>('step');
  const [resetKey, setResetKey] = useState(0);
  const [currentDepth, setDepth] = useState< 10| 0 > ( 10 );
  const [viewMode, setViewMode] = useState<'card' | 'text'>('card');

  const { t } = useLocale();
  const { activeBranch, loading: branchesLoading } = useBranch();
  // null only once branches have actually loaded and the active one is
  // still empty (a brand-new branch with no one added yet) — never falls
  // back to some other branch's root, which would silently show its tree
  // instead (see loadTree below).
  const rootId = activeBranch?.rootPersonId ?? null;
  const [treeData, setTreeData] = useState<PersonNode | null>(null);
  const [loading, setLoading] = useState(true);
  // Booleans rather than pre-rendered strings, so switching languages
  // mid-session updates any already-visible message instead of leaving it
  // stuck in whichever language it was first shown in.
  const [error, setError] = useState(false);

  // "View in Tree" from the profile page navigates here with the target
  // person's uid in router state, then this jumps the view to them once
  // their position has been reported via TreeNodePositionContext.
  const location = useLocation();
  const focusUid = (location.state as { focusUid?: number } | null)?.focusUid;
  const nodePositions = useTreeNodePositions();
  const triedFocusRef = useRef(false);
  const [focusNotice, setFocusNotice] = useState(false);
  // Overrides the tree's normal translate/zoom while a "View in Tree" jump
  // is active. Deliberately plain React state (not an imperative DOM/ref
  // call) — react-d3-tree derives what it actually renders from these two
  // props on every render (see calculateD3Geometry in its source), so
  // anything that bypasses that and pokes the DOM directly just gets
  // overwritten the next time anything causes a re-render.
  const [focusView, setFocusView] = useState<{ translate: { x: number; y: number }; zoom: number } | null>(null);

  function loadTree() {
    let cancelled = false;
    // Branches haven't resolved yet — wait rather than guessing, since
    // guessing is exactly what caused this to show the wrong branch's tree.
    if (branchesLoading) {
      setLoading(true);
      return () => {
        cancelled = true;
      };
    }
    // The active branch is real but genuinely has no root person yet (a
    // brand-new, empty branch) — nothing to fetch; the empty-state message
    // below covers it.
    if (rootId === null) {
      setTreeData(null);
      setError(false);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }
    setLoading(true);
    fetchTree(rootId)
      .then((data) => {
        if (!cancelled) setTreeData(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }

  // loadTree sets `loading`/`treeData`/`error` as it fetches — that's the
  // whole point of this effect (fetch on mount, when the tree is reloaded,
  // and when switching to a different branch changes the root to fetch).
  useEffect(loadTree, [rootId, branchesLoading]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadTree closes over rootId/branchesLoading freshly each render; only re-subscribing on their change (not every render) avoids tearing down/re-adding the onPersonAdded listener needlessly
  useEffect(() => onPersonAdded(loadTree), [rootId, branchesLoading]);

  // Runs once the tree (re)loads, when a "View in Tree" jump was requested.
  // Node positions are reported by CustomNode as each one mounts, which can
  // take a little longer than one render (react-d3-tree mounts nodes
  // through react-transition-group, and a collapsed branch never mounts
  // its nodes at all — which is why this also forces full expansion
  // first), so this polls for a bit instead of assuming a single effect
  // pass is enough. Only run once per visit to this page — if someone
  // pans away from a successful jump, a later background refresh of
  // treeData shouldn't yank the view back.
  useEffect(() => {
    if (!treeData || focusUid === undefined || triedFocusRef.current) return;
    triedFocusRef.current = true;

    // Reacting to a one-off navigation request (router state), not state
    // derivable at render time.
    setViewMode('card');
    setDepth(10); // a collapsed branch never mounts its nodes, so never reports a position
    setResetKey((k) => k + 1);

    let attempts = 0;
    const MAX_ATTEMPTS = 40; // ~4s at 100ms — generous for a tree remount + layout
    const timer = setInterval(() => {
      attempts += 1;
      const position = nodePositions?.get(focusUid);
      if (position) {
        clearInterval(timer);
        const dimensions = { width: window.innerWidth, height: window.innerHeight };
        // Same math react-d3-tree's own centerNode uses internally — swap
        // x/y for horizontal trees, since the tree itself is laid out with
        // depth along one axis and siblings along the other depending on
        // orientation.
        const translate = orientation === 'horizontal'
          ? { x: -position.y * FOCUS_ZOOM + dimensions.width * FOCUS_ANCHOR.x, y: -position.x * FOCUS_ZOOM + dimensions.height * FOCUS_ANCHOR.y }
          : { x: -position.x * FOCUS_ZOOM + dimensions.width * FOCUS_ANCHOR.x, y: -position.y * FOCUS_ZOOM + dimensions.height * FOCUS_ANCHOR.y };
        setFocusView({ translate, zoom: FOCUS_ZOOM });
        // Belt-and-braces: also puts a highlight ring on the node itself,
        // so the right person is unmistakable even if this math is ever
        // off for some tree shape this wasn't tested against.
        nodePositions?.setFocusedUid(focusUid);
      } else if (attempts >= MAX_ATTEMPTS) {
        clearInterval(timer);
        setFocusNotice(true);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [treeData, focusUid, nodePositions, orientation]);

  const handleSetDepth = () => {
    setDepth(getDepth())
    setResetKey(prev => prev + 1);
  };
  const defaultTranslate = orientation === 'horizontal'
    ? { x: window.innerWidth / 10, y: window.innerHeight / 1.57  }
    : { x: window.innerWidth / 1.6, y: window.innerHeight / 20  };
  // Enables react-d3-tree's own built-in "center this node" behavior on
  // manual node clicks — without `dimensions`, it has no idea how big the
  // viewport is and silently skips centering entirely.
  const dimensions = { width: window.innerWidth, height: window.innerHeight };

  const getDepth = () => {
    return ((currentDepth === 0) ? 10 : 0)};
  const getNodeSize = () => {
    return ((orientation === 'vertical') ? { x: 550, y: 1500  } : { x: 2800, y: 380  })};
  const getScaleExtent = () => {
    return ((orientation === 'vertical') ? { min: 0.05, max: 1 } : { min: 0.05, max: 1 })};
  const getZoom = () => {
    return ((orientation === 'vertical') ? 0.061 : 0.05 )};

  // Overrides translate/zoom (below focusView's own override — a "View in
  // Tree" jump still wins) so the tree is always centered and filling the
  // screen, no matter how many people it has. Polls briefly for positions
  // to stabilize rather than assuming one effect pass is enough — same
  // reasoning as the "View in Tree" jump above: a tree remount mounts
  // nodes asynchronously via react-transition-group.
  const [autoFitView, setAutoFitView] = useState<{ translate: { x: number; y: number }; zoom: number } | null>(null);
  useEffect(() => {
    if (!treeData) {
      setAutoFitView(null);
      return;
    }
    // Clears whatever fit was computed for the *previous* layout right
    // away, so there's no brief flash of the wrong framing while this one
    // polls for fresh positions — the `??` chain below falls back to the
    // static default in the meantime.
    setAutoFitView(null);

    let cancelled = false;
    let lastSize = -1;
    let stableTicks = 0;
    const STABLE_TICKS_NEEDED = 3; // ~300ms with no new positions registering
    let attempts = 0;
    const MAX_ATTEMPTS = 40; // ~4s at 100ms — generous for a tree remount + layout

    const timer = setInterval(() => {
      attempts += 1;
      const all = nodePositions?.getAll();
      const size = all?.size ?? 0;
      stableTicks = size > 0 && size === lastSize ? stableTicks + 1 : 0;
      lastSize = size;

      if ((size > 0 && stableTicks >= STABLE_TICKS_NEEDED) || attempts >= MAX_ATTEMPTS) {
        clearInterval(timer);
        if (cancelled || !all || all.size === 0) return;
        const fit = computeFitView(all, orientation, getNodeSize(), getScaleExtent(), dimensions);
        if (fit) setAutoFitView(fit);
      }
    }, 100);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dimensions/getNodeSize/getScaleExtent are plain values re-derived each render purely from orientation (already a dep) and the current window size; listing them would only resubscribe redundantly, never change behavior
  }, [treeData, orientation, resetKey, currentDepth, nodePositions]);

  return(
    <>
      <div className={style.rootDiv}  >
        <Header></Header>
        <AddUser></AddUser>
        <ContextualPopover></ContextualPopover>
        <div className={style.stageArea}>
          {loading && <p className={style.statusMessage}>{t('home.loadingTree')}</p>}
          {error && <p className={style.statusMessage}>{t('home.loadError')}</p>}
          {!loading && !error && !treeData && rootId === null && (
            <p className={style.statusMessage}>{t('home.emptyBranch')}</p>
          )}
          {!loading && !error && treeData && (
            <>
              <div className={style.hierachyTree} style={{ display: viewMode === 'card' ? 'block' : 'none' }}>
                <Tree
                  key={resetKey}
                  data={treeData as unknown as RawNodeDatum}
                  translate={focusView?.translate ?? autoFitView?.translate ?? defaultTranslate}
                  dimensions={dimensions}
                  zoom={focusView?.zoom ?? autoFitView?.zoom ?? getZoom()}
                  orientation={orientation}
                  nodeSize={getNodeSize()}
                  scaleExtent={getScaleExtent()}
                  initialDepth={currentDepth}
                  pathFunc={pathFn}
                  zoomable
                  renderCustomNodeElement={(rd3tProps) => <CustomNode {...rd3tProps} />}
                  rootNodeClassName="node__root"
                  branchNodeClassName="node__branch"
                  leafNodeClassName="node__leaf"
                  collapsible={true}
                  enableLegacyTransitions={true}
                  transitionDuration={1000}
                />
              </div>
              <div className={style.hierachyTree} style={{ display: viewMode === 'text' ? 'block' : 'none' }}>
                <Tree
                  key={resetKey}
                  data={treeData as unknown as RawNodeDatum}
                  translate={focusView?.translate ?? autoFitView?.translate ?? defaultTranslate}
                  dimensions={dimensions}
                  zoom={focusView?.zoom ?? autoFitView?.zoom ?? getZoom()}
                  orientation={orientation}
                  nodeSize={getNodeSize()}
                  scaleExtent={getScaleExtent()}
                  initialDepth={currentDepth}
                  pathFunc={pathFn}
                  zoomable
                  rootNodeClassName="node__root"
                  branchNodeClassName="node__branch"
                  leafNodeClassName="node__leaf"
                  enableLegacyTransitions={true}
                  transitionDuration={1000}
                />
              </div>
            </>
          )}
          <div className={style.overlayControls}>
            <div className={style.controls}>
              <SwitchTreeViewButton
                viewMode={viewMode}
                onToggle={() => setViewMode((prev) => (prev === 'card' ? 'text' : 'card'))}
              />
              <button
                  onClick={() => setOrientation(prev => prev === 'vertical' ? 'horizontal' : 'vertical')}
                  className={stylesButton.btn}>
                   {t('home.horizontalVertical')}
              </button>
              <button
                  onClick={() => handleSetDepth()}
                  className={stylesButton.btn}>
                    {t('home.expandCollapseAll')}
              </button>
              <button
                  onClick={() => setPathFn(prev => prev === 'diagonal' ? 'step': 'diagonal')}
                  className={stylesButton.btn}>
                    {t('home.changePathStyle')}
              </button>
            </div>
            {focusNotice && (
              <div className={style.focusNotice}>
                <span>{t('home.focusNotFound')}</span>
                <button type="button" onClick={() => setFocusNotice(false)} aria-label={t('home.dismiss')}>×</button>
              </div>
            )}
          </div>
        </div>
        <Footer></Footer>

      </div>
    </>
  );
}

// TreeNodePositionProvider wraps HomeInner (rather than living inside it) so
// the provider instance — and the position map it owns — survives even
// across a `key`-forced remount of the <Tree> elements themselves.
function Home() {
  return (
    <TreeNodePositionProvider>
      <HomeInner />
    </TreeNodePositionProvider>
  );
}

export default Home
