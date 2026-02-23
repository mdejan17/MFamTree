
import Header from '../components/Header.tsx'
import Footer from '../components/Footer.tsx'
import Tree from 'react-d3-tree';
import '../components/modules/Tree.css';
import {Database2} from '../data/mockDatabase.tsx'
import 'treeflex/dist/css/treeflex.css'
import AddUser from '../components/AddUser.tsx'
import style from './modules/Home.module.css'
import {useState} from 'react'
import {CustomNode} from '../components/PersonCard.tsx';
import SwitchTreeViewButton from '../components/SwitchTreeViewButton.tsx';
import stylesButton from '../components/modules/Button.module.css'
import SideBar from '../components/SideBar.tsx';
import Toolbar from '../components/Toolbar.tsx';
import Crest from '../components/Crest.tsx';
function Home() {

  //Func and const for Tree management
  const [orientation, setOrientation,] = useState<'horizontal' | 'vertical'>('horizontal');
  const [pathFn, setPathFn,] = useState<'diagonal' | 'step'>('diagonal');
  const [resetKey, setResetKey] = useState(0);
  const [curentDepth, setDepth] = useState< 10| 0 > ( 10 );
  
  const handleSetDepth = () => {
    setDepth(getDepth())
    setResetKey(prev => prev + 1);
  };
  const translate = orientation === 'horizontal'
    ? { x: window.innerWidth / 10, y: window.innerHeight / 1.57  }  
    : { x: window.innerWidth / 1.6, y: window.innerHeight / 20  };

  const getDepth = () => {
    return ((curentDepth === 0) ? 10 : 0)};
  const getNodeSize = () => {
    return ((orientation === 'vertical') ? { x: 550, y: 1500  } : { x: 2800, y: 380  })};
  const getScaleExtent = () => {
    return ((orientation === 'vertical') ? { min: 0.05, max: 1 } : { min: 0.05, max: 1 })};
  const getZoom = () => {
    return ((orientation === 'vertical') ? 0.061 : 0.05 )};

  return(
    <>
      <div className={style.rootDiv}  >
        <Header></Header>
        <AddUser></AddUser>
        <Toolbar></Toolbar>
        <SideBar></SideBar>
        <Crest></Crest>
        <SwitchTreeViewButton></SwitchTreeViewButton>
        <button  // MOVE TO COMPONENET
            onClick={() => setOrientation(prev => prev === 'vertical' ? 'horizontal' : 'vertical')}
            className={stylesButton.setVorHTree}>
             Horizontal/Vertical
        </button>
        <button  //MOVE TO COMPONENT
            onClick={() => handleSetDepth()}
            className={stylesButton.setDepthTree}>
              Expand/Colase All
        </button>
        <button  //MOVE TO COMPONENT
            onClick={() => setPathFn(prev => prev === 'diagonal' ? 'step': 'diagonal')}
            className={stylesButton.setPathFnTree}>
              Change Path Function
        </button>
        <div className={style.hierachyTree} id={style.cardViewTree}>
          <Tree
            key={resetKey}
            data={Database2 as any}
            translate={translate}
            zoom={getZoom()}
            orientation={orientation}
            nodeSize={getNodeSize()}
            scaleExtent={getScaleExtent()}
            initialDepth={curentDepth}
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
        <div className={style.hierachyTree} id={style.textViewTree}>
          <Tree
            key={resetKey}
            data={Database2 as any}
            translate={translate}
            zoom={getZoom()} 
            orientation={orientation}
            nodeSize={getNodeSize()}
            scaleExtent={getScaleExtent()}
            initialDepth={curentDepth}
            pathFunc={pathFn}
            zoomable
            rootNodeClassName="node__root"
            branchNodeClassName="node__branch"
            leafNodeClassName="node__leaf"
            enableLegacyTransitions={true}
            transitionDuration={1000} 
          />
        </div>
        <Footer></Footer>

      </div>
    </>
  );
}
export default Home








// const renderRectSvgNode = ({ nodeDatum, toggleNode }:any) => (
//   <g>
//     <rect width="20" height="20" x="-10" onClick={toggleNode} />
//     <text fill="black" strokeWidth="1" x="20">
//       {nodeDatum.name}
//     </text>
//     {nodeDatum.attributes?.department && (
//       <text fill="black" x="20" dy="20" strokeWidth="1">
//         Department: {nodeDatum.attributes?.department}
//       </text>
//     )}
//   </g>
// );




  //<UserGreating isLoggedIn={true} username='bato'></UserGreating>
//<PersonCard id='1' name='Bob' bio='Lorem ipsum dolor sit amet, amun ficus amur makab sit cumbus.'></PersonCard>
//<PersonCard id='2' name='Sarah' bio='Lorem ipsum dolor sit amet, amun ficus amur makab sit cumbus.'></PersonCard>
//<PersonCard id='3' name='John' bio='Lorem ipsum dolor sit amet, amun ficus amur makab sit cumbus.'></PersonCard>
//<PersonCard id='4' name='Muhamed' bio='Lorem ipsum dolor sit amet, amun ficus amur makab sit cumbus.'></PersonCard>

//<PersonCard uid={1} firstName='Bob' note='Lorem ipsum dolor sit amet, amun ficus amur makab sit cumbus.'></PersonCard>
//<PersonCard uid={2} firstName='Sarah' note='Lorem ipsum dolor sit amet, amun ficus amur makab sit cumbus.'></PersonCard>
//<PersonCard uid={3} firstName='John' note='Lorem ipsum dolor sit amet, amun ficus amur makab sit cumbus.'></PersonCard>
//<PersonCard uid={4} firstName='Muhamed' note='Lorem ipsum dolor sit amet, amun ficus amur makab sit cumbus.'></PersonCard>


//<Footer></Footer>
//</div>
//