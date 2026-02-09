
import Header from '../components/Header.tsx'
import Footer from '../components/Footer.tsx'
import Tree from 'react-d3-tree';
import '../components/modules/Tree.css';
import {Database2, type Person, type PersonNode} from '../data/mockDatabase.tsx'
import 'treeflex/dist/css/treeflex.css'
import AddUser from '../components/AddUser.tsx'
import style from './modules/Home.module.css'
import React, {useState} from 'react'
import { PersonCardSVG, PersonCard , CustomNode} from '../components/PersonCard.tsx';
import SwitchTreeViewButton from '../components/SwitchTreeViewButton.tsx';

function Home() {
  const containerWidth = window.innerWidth;
  const containerHeight = window.innerHeight;

    // Center tree inline
    const translate = { x: containerWidth / 4, y: containerHeight / 1.53 };
    const renderNode = ({ nodeDatum }: { nodeDatum: PersonNode }) => {
      return <PersonCardSVG person={nodeDatum.attributes} />;
    };
  return(
    <>
    <div className={style.rootDiv}  >
      <Header></Header>
      <AddUser></AddUser>
      <SwitchTreeViewButton></SwitchTreeViewButton>
        
        <div className={style.hierachyTree} id={style.cardViewTree}><Tree
          data={Database2}
          translate={translate}
          zoom={0.061} 
          orientation="horizontal" // or "vertical"
          nodeSize={{ x: 1500, y: 320 }}
          scaleExtent={{ min: 0.05, max: 1 }}
          // pathFunc="elbow"
          zoomable
          renderCustomNodeElement={(rd3tProps) => <CustomNode {...rd3tProps} />}
          rootNodeClassName="node__root"
          branchNodeClassName="node__branch"
          leafNodeClassName="node__leaf"
          collapsible={true}
          enableLegacyTransitions={true}
          transitionDuration={1000} 
        /></div>
        <div className={style.hierachyTree} id={style.textViewTree}><Tree
          data={Database2}
          translate={translate}
          zoom={0.061} 
          orientation="horizontal" // or "vertical"
          nodeSize={{ x: 1500, y: 320 }}
          scaleExtent={{ min: 0.05, max: 2 }}
          // pathFunc="elbow"
          zoomable
          rootNodeClassName="node__root"
          branchNodeClassName="node__branch"
          leafNodeClassName="node__leaf"
          enableLegacyTransitions={true}
          transitionDuration={1000} 
        /></div>
      </div>
      <Footer></Footer>
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