import PersonCard from './PersonCard'
import type { Person } from '../data/mockDatabase.tsx'
import type { JSX } from 'react'
//import {DatabaseFlat} from '../data/mockDatabase.tsx'
import {DatabaseBigFlat} from '../data/bigDatabase.tsx'

function FamTree() {
    
    console.log("Starting building FamTree");
    const refPersonMock = DatabaseBigFlat[2];
    console.log(refPersonMock)

    function buildTree(personRef: Person, Database:Person[]): JSX.Element{
        console.log("Called Function buildTree");
        const parentM = Database.find((p: Person) => p.uid === personRef.parentUid[0])
        const parentF = Database.find((p: Person) => p.uid === personRef.parentUid[1])
        // console.log(`First map loop, Person:`, person)
        if ( parentM == null){
            console.log('ParentM not found!', parentM)
            return <></>;
        }
        if ( parentF == null){
            console.log('ParentF not found!', parentM)
            return <></>;
        }
        else{
            console.log(`Parents found. Parents `, parentM, parentF);
            return(
                <>
                    <div className='tf-tree'>
                        <ul>
                        <li key={parentM.uid} className='tf-dashed-children'>
                            <div className='tf-nc '>
                                <PersonCard
                                uid={parentM.uid}
                                firstName={parentM.firstName}
                                lastName={parentM.lastName}
                                maidenName={parentM.maidenName}
                                gender={parentM.gender}
                                dateOfBirth={parentM.dateOfBirth}
                                dateOfDeath={parentM.dateOfDeath}
                                residency={parentM.residency}
                                note={parentM.note}
                                parentUid={parentM.parentUid}
                                spouseUid={parentM.spouseUid}
                                offspringUid={parentM.offspringUid}
                                profilePic={parentM.profilePic}
                                libarary={parentM.libarary}
                                />
                                <PersonCard
                                uid={parentF.uid}
                                firstName={parentF.firstName}
                                lastName={parentF.lastName}
                                maidenName={parentF.maidenName}
                                gender={parentF.gender}
                                dateOfBirth={parentF.dateOfBirth}
                                dateOfDeath={parentF.dateOfDeath}
                                residency={parentF.residency}
                                note={parentF.note}
                                parentUid={parentF.parentUid}
                                spouseUid={parentF.spouseUid}
                                offspringUid={parentF.offspringUid}
                                profilePic={parentF.profilePic}
                                libarary={parentF.libarary}
                                />
                            </div>
                            <ul>
                                <li key={personRef.uid} className='tf-dashed-children'>
                                    <div className='tf-nc'>
                                        <PersonCard //PERSON
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
                                        {
                                            personRef.spouseUid?.map((spouseId: number) => {
                                                const spouse = Database.find((p: Person) => p.uid === spouseId)

                                                if (!spouse) {
                                                    console.log('Spouse not exist');
                                                    return null
                                                }
                                                console.log(`Spouse printed`, spouse)
                                                return (
                                                        <PersonCard
                                                        uid={spouse.uid}
                                                        firstName={spouse.firstName}
                                                        lastName={spouse.lastName}
                                                        maidenName={spouse.maidenName}
                                                        gender={spouse.gender}
                                                        dateOfBirth={spouse.dateOfBirth}
                                                        dateOfDeath={spouse.dateOfDeath}
                                                        residency={spouse.residency}
                                                        note={spouse.note}
                                                        parentUid={spouse.parentUid}
                                                        spouseUid={spouse.spouseUid}
                                                        offspringUid={spouse.offspringUid}
                                                        profilePic={spouse.profilePic}
                                                        libarary={spouse.libarary}
                                                        />
                                                )
                                            })
                                        }
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
                    </div>
                </>
            )
        }
    }

    return(buildTree(refPersonMock, DatabaseBigFlat))
}
export default FamTree