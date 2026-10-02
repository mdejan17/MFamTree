/* eslint-disable react-refresh/only-export-components -- this is a plain data/types module, not a component file */
import { DatabaseBigFlat } from "./bigDatabase";

export enum Gender{
  "Male",
  "Female",
}
export interface Person{
  uid: number;
  firstName: string;
  lastName: string;
  maidenName?: string;
  gender: string;
  dateOfBirth?: Date;
  dateOfDeath?: Date;
  residency?: string;
  note?: string;
  parentUid: number[];
  spouseUid?: number[];
  offspringUid: number[];
  profilePic?: string;
  libarary?: string[];
  branchId?: number;
}
export interface PersonNode {
  name: string;
  attributes: Person;
  children?: PersonNode[];
}

function formatPerson(p: Person): Person {
  return {
    ...p,
    dateOfBirth: p.dateOfBirth?.toISOString() as unknown as Date,
    dateOfDeath: p.dateOfDeath?.toISOString() as unknown as Date,
  };
}

function buildPersonNode(person: Person): PersonNode {
  const personFormated = formatPerson(person);
  const peopleById = Object.fromEntries(DatabaseBigFlat.map(p => [p.uid, p]));
  if (personFormated.offspringUid.length > 0) {
    return {
      name: personFormated.firstName + ' ' + personFormated.lastName,
      attributes: personFormated,
      children: personFormated.offspringUid
        .map(uid => peopleById[uid])
        .filter(Boolean) // ignore missing children
        .map(child => buildPersonNode(child)),
    };
  }
  return {
    name: personFormated.firstName + ' ' + personFormated.lastName,
    attributes: personFormated,
  };
}

export const Database2 = buildPersonNode(DatabaseBigFlat[0])
