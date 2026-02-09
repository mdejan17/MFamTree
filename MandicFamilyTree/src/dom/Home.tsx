
import Header from '../components/Header.tsx'
import Footer from '../components/Footer.tsx'
import PersonCard from '../components/PersonCard.tsx'
import Button from '../components/Button.tsx'
import List from '../components/List.tsx'
import UserGreating from '../components/UserGreating.tsx'
import {Gender} from '../data/mockDatabase.tsx'
import {Database} from '../data/mockDatabase.tsx'
import Tree from 'react-d3-tree';
import './components/modules/Tree.css';
import {Database2} from '../data/mockDatabase.tsx'
import React from 'react'
import 'treeflex/dist/css/treeflex.css'
import AddUser from '../components/AddUser.tsx'
import FamTree from '../components/FamTree.tsx'


function Home() {

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

  return(
    <>
    <div className='rootDiv'  >
      <Header></Header>
      <AddUser></AddUser>
      <div className='Tree'>
        {Database.map((person) => (
          <PersonCard
          uid={person.uid}
          firstName={person.firstName}
          lastName={person.lastName}
          maidenName={person.maidenName}
          gender={person.gender}
          dateOfBirth={person.dateOfBirth}
          dateOfDeath={person.dateOfDeath}
          residency={person.residency}
          note={person.note}
          parentUid={person.parentUid}
          spouseUid={person.spouseUid}
          offspringUid={person.offspringUid}
          profilePic={person.profilePic}
          libarary={person.libarary}
          />
        ))}
      </div>
      <div id="treeWrapper" style={{ width: '100vh', height: '20vw'}}>
        <Tree data={Database2}
          rootNodeClassName="node__root"
          branchNodeClassName="node__branch"
          leafNodeClassName="node__leaf"
          />
      </div>
      <FamTree></FamTree>
      <Footer></Footer>
      </div>
    </>
  );
}
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

export default Home