import PersonCard from './PersonCard'
import type { Person } from '../data/mockDatabase.tsx'
import type { JSX } from 'react'
import {Database} from '../data/mockDatabase.tsx'

function FamTree() {
    
    console.log("Starting building FamTree");
    const refPersonMock = Database[0];
    console.log(refPersonMock)

    //find theref person

    // function buildOffspring(personRef: Person, Database:Person[]): JSX.Element{

    //     return(
    //         <>
    //             {
    //                 personRef.offspringUid.map((kidId:number) =>{
    //                     Database.map((child:Person) => {
    //                         if (child.uid == kidId) {
    //                             <li>
    //                             <PersonCard
    //                             uid={child.uid}
    //                             firstName={child.firstName}
    //                             note={child.note}
    //                             profilePic={child.profilePic}
    //                             />
    //                             </li>
    //                         }
    //                     })
    //                 })
    //             }
    //         </>
    //     )
    
    // }

    function buildTree(personRef: Person, Database:Person[]): JSX.Element{
        console.log("Called Function buildTree");
        return(
            <>
                <div className='tf-tree'>
                    {
                        Database.map((person:Person) => {
                            console.log(`First map loop, Person: ${person}`)
                            if (person.uid === personRef.parentUid[0]) {
                                console.log(`Parent found. Parent `, person);
                                return (
                                    <>
                                        <ul>
                                        <li key={person.uid} className='tf-dashed-children'>
                                            <div className='tf-nc'>
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
                                            </div>
                                            <ul>
                                                <li key={personRef.uid} className='tf-dashed-children'>
                                                    <div className='tf-nc'>
                                                        <PersonCard
                                                        uid={personRef.uid}
                                                        firstName={personRef.firstName}
                                                        lastName={personRef.lastName}
                                                        maidenName={personRef.maidenName}
                                                        gender={personRef.gender}
                                                        dateOfBirth={personRef.dateOfBirth}
                                                        dateOfDeath={personRef.dateOfDeath}
                                                        residency={personRef.residency}
                                                        note={personRef.note}
                                                        parentUid={personRef.parentUid}
                                                        spouseUid={personRef.spouseUid}
                                                        offspringUid={personRef.offspringUid}
                                                        profilePic={personRef.profilePic}
                                                        libarary={personRef.libarary}
                                                        />
                                                    </div>
                                                    <ul>
                                                        {  
                                                            personRef.offspringUid.map((kidId: number) => {
                                                                const child = Database.find((p: Person) => p.uid === kidId)

                                                                if (!child) {
                                                                    console.log('Inner child does not exist');
                                                                    return null
                                                                }
                                                                console.log(`Inner kid printed`, child)
                                                                return (
                                                                    <li key={child.uid}  className='tf-dashed-children'>
                                                                        <div className='tf-nc'>
                                                                            <PersonCard
                                                                            uid={child.uid}
                                                                            firstName={child.firstName}
                                                                            lastName={child.lastName}
                                                                            maidenName={child.maidenName}
                                                                            gender={child.gender}
                                                                            dateOfBirth={child.dateOfBirth}
                                                                            dateOfDeath={child.dateOfDeath}
                                                                            residency={child.residency}
                                                                            note={child.note}
                                                                            parentUid={child.parentUid}
                                                                            spouseUid={child.spouseUid}
                                                                            offspringUid={child.offspringUid}
                                                                            profilePic={child.profilePic}
                                                                            libarary={child.libarary}
                                                                            />
                                                                        </div>
                                                                    </li>
                                                                )
                                                            })
                                                        }
                                                    </ul>
                                                </li>
                                            </ul>
                                        </li>
                                        </ul>
                                    </>
                                )
                            }
                        })
                    }
                </div>
            </>
        )
    }


    return(buildTree(refPersonMock, Database))
}


// Database.map((personActive:Person) => 
//    {
//        if (personActive.uid == personRef.uid) {
//            <>
//            <PersonCard
//                uid={personActive.uid}
//                firstName={personActive.firstName}
//                note={personActive.note}
//                profilePic={personActive.profilePic}
//            />
//            <ul>
//            {buildTree(Database)}
//            </ul>
//        </>
//        }
//    }


export default FamTree