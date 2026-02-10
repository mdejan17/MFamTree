import PersonCard from './PersonCard'
import type { Person } from '../data/mockDatabase.tsx'
import type { JSX } from 'react'
import {DatabaseBigFlat} from '../data/bigDatabase.tsx'

function FamTree() {
    
    console.log("Starting building FamTree");
    const refPersonMock = DatabaseBigFlat[2];
    console.log(refPersonMock)

    function buildTree(personRef: Person, Database:Person[]): JSX.Element{
        console.log("Called Function buildTree");
        const parentM = Database.find((p: Person) => p.uid === personRef.parentUid[0])
        const parentF = Database.find((p: Person) => p.uid === personRef.parentUid[1])

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
                                <PersonCard person={parentM}/>
                                <PersonCard person={parentF}/>
                            </div>
                            <ul>
                                <li key={personRef.uid} className='tf-dashed-children'>
                                    <div className='tf-nc'>
                                        <PersonCard person={personRef}/>
                                        {
                                            personRef.spouseUid?.map((spouseId: number) => {
                                                const spouse = Database.find((p: Person) => p.uid === spouseId)

                                                if (spouse) {
                                                    console.log(`Spouse printed`, spouse)
                                                    return (<PersonCard person={spouse}/>)
                                                }

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
                                                            <PersonCard person={child}/>
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