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
}
export interface PersonNode {
  name: string;
  attributes: Person;
  children?: PersonNode[];
}
// export const DatabaseFlat: Person[] = [
//   // ─── Generation 1: Common Ancestor ─────────────────────────────
//   {
//     uid: 1,
//     firstName: "William",
//     lastName: "Harrington",
//     maidenName: "",
//     gender: Gender.Male,
//     dateOfBirth: new Date("1930-01-15"),
//     dateOfDeath: new Date("2005-06-20"),
//     residency: "London, UK",
//     note: "Family patriarch",
//     parentUid: [999,999],
//     spouseUid: [2],
//     offspringUid: [3, 4, 5],
//     profilePic: "william.jpg",
//     libarary: ["will.pdf"]
//   },
//   {
//     uid: 2,
//     firstName: "Margaret",
//     lastName: "Harrington",
//     maidenName: "Clark",
//     gender: Gender.Female,
//     dateOfBirth: new Date("1933-04-10"),
//     dateOfDeath: new Date("2010-02-12"),
//     residency: "London, UK",
//     note: "Family matriarch",
//     parentUid: [999,999],
//     spouseUid: [1],
//     offspringUid: [3, 4, 5],
//     profilePic: "margaret.jpg",
//     libarary: ["margaret.pdf"]
//   },

//   // ─── Generation 2 ──────────────────────────────────────────────
//   {
//     uid: 3,
//     firstName: "Edward",
//     lastName: "Harrington",
//     maidenName: "",
//     gender: Gender.Male,
//     dateOfBirth: new Date("1955-03-02"),
//     dateOfDeath: new Date("2020-09-01"),
//     residency: "Manchester, UK",
//     note: "Eldest son",
//     parentUid: [1, 2],
//     spouseUid: [6],
//     offspringUid: [7, 8],
//     profilePic: "edward.jpg",
//     libarary: ["edward.pdf"]
//   },
//   {
//     uid: 4,
//     firstName: "Helen",
//     lastName: "Turner",
//     maidenName: "Harrington",
//     gender: Gender.Female,
//     dateOfBirth: new Date("1958-07-18"),
//     dateOfDeath: new Date("2022-01-05"),
//     residency: "Bristol, UK",
//     note: "Middle child",
//     parentUid: [1, 2],
//     spouseUid: [9],
//     offspringUid: [10, 11],
//     profilePic: "helen.jpg",
//     libarary: ["helen.pdf"]
//   },
//   {
//     uid: 5,
//     firstName: "Robert",
//     lastName: "Harrington",
//     maidenName: "",
//     gender: Gender.Male,
//     dateOfBirth: new Date("1962-11-30"),
//     dateOfDeath: new Date("2023-05-14"),
//     residency: "Leeds, UK",
//     note: "Youngest son",
//     parentUid: [1, 2],
//     spouseUid: [12],
//     offspringUid: [13, 14],
//     profilePic: "robert.jpg",
//     libarary: ["robert.pdf"]
//   },

//   // ─── Generation 2 Spouses ──────────────────────────────────────
//   {
//     uid: 6,
//     firstName: "Susan",
//     lastName: "Harrington",
//     maidenName: "Miller",
//     gender: Gender.Female,
//     dateOfBirth: new Date("1957-05-21"),
//     dateOfDeath: new Date("2018-08-10"),
//     residency: "Manchester, UK",
//     note: "Edward's wife",
//     parentUid: [999],
//     spouseUid: [3],
//     offspringUid: [7, 8],
//     profilePic: "susan.jpg",
//     libarary: ["susan.pdf"]
//   },
//   {
//     uid: 9,
//     firstName: "David",
//     lastName: "Turner",
//     maidenName: "",
//     gender: Gender.Male,
//     dateOfBirth: new Date("1956-09-09"),
//     dateOfDeath: new Date("2019-03-01"),
//     residency: "Bristol, UK",
//     note: "Helen's husband",
//     parentUid: [999],
//     spouseUid: [4],
//     offspringUid: [10, 11],
//     profilePic: "david.jpg",
//     libarary: ["david.pdf"]
//   },
//   {
//     uid: 12,
//     firstName: "Linda",
//     lastName: "Harrington",
//     maidenName: "Evans",
//     gender: Gender.Female,
//     dateOfBirth: new Date("1965-12-12"),
//     dateOfDeath: new Date("2021-07-07"),
//     residency: "Leeds, UK",
//     note: "Robert's wife",
//     parentUid: [999],
//     spouseUid: [5],
//     offspringUid: [13, 14],
//     profilePic: "linda.jpg",
//     libarary: ["linda.pdf"]
//   },

//   // ─── Generation 3 ──────────────────────────────────────────────
//   {
//     uid: 7,
//     firstName: "James",
//     lastName: "Harrington",
//     maidenName: "",
//     gender: Gender.Male,
//     dateOfBirth: new Date("1980-06-06"),
//     dateOfDeath: new Date("2070-01-01"),
//     residency: "London, UK",
//     note: "Grandson",
//     parentUid: [3, 6],
//     spouseUid: [15],
//     offspringUid: [16, 17],
//     profilePic: "james.jpg",
//     libarary: ["james.pdf"]
//   },
//   {
//     uid: 8,
//     firstName: "Emily",
//     lastName: "Harrington",
//     maidenName: "",
//     gender: Gender.Female,
//     dateOfBirth: new Date("1983-02-14"),
//     dateOfDeath: new Date("2075-01-01"),
//     residency: "Oxford, UK",
//     note: "Granddaughter",
//     parentUid: [3, 6],
//     spouseUid: [18],
//     offspringUid: [19],
//     profilePic: "emily.jpg",
//     libarary: ["emily.pdf"]
//   },
//   {
//     uid: 10,
//     firstName: "Oliver",
//     lastName: "Turner",
//     maidenName: "",
//     gender: Gender.Male,
//     dateOfBirth: new Date("1985-10-10"),
//     dateOfDeath: new Date("2075-01-01"),
//     residency: "Bath, UK",
//     note: "Grandson",
//     parentUid: [4, 9],
//     spouseUid: [20],
//     offspringUid: [21],
//     profilePic: "oliver.jpg",
//     libarary: ["oliver.pdf"]
//   },
//   {
//     uid: 11,
//     firstName: "Sophie",
//     lastName: "Turner",
//     maidenName: "",
//     gender: Gender.Female,
//     dateOfBirth: new Date("1988-12-01"),
//     dateOfDeath: new Date("2080-01-01"),
//     residency: "Bath, UK",
//     note: "Granddaughter",
//     parentUid: [4, 9],
//     spouseUid: [],
//     offspringUid: [],
//     profilePic: "sophie.jpg",
//     libarary: ["sophie.pdf"]
//   },
//   {
//     uid: 13,
//     firstName: "Thomas",
//     lastName: "Harrington",
//     maidenName: "",
//     gender: Gender.Male,
//     dateOfBirth: new Date("1990-03-03"),
//     dateOfDeath: new Date("2080-01-01"),
//     residency: "York, UK",
//     note: "Grandson",
//     parentUid: [5, 12],
//     spouseUid: [22],
//     offspringUid: [23],
//     profilePic: "thomas.jpg",
//     libarary: ["thomas.pdf"]
//   },
//   {
//     uid: 14,
//     firstName: "Lucy",
//     lastName: "Harrington",
//     maidenName: "",
//     gender: Gender.Female,
//     dateOfBirth: new Date("1993-07-07"),
//     dateOfDeath: new Date("2085-01-01"),
//     residency: "York, UK",
//     note: "Granddaughter",
//     parentUid: [5, 12],
//     spouseUid: [],
//     offspringUid: [],
//     profilePic: "lucy.jpg",
//     libarary: ["lucy.pdf"]
//   },

//   // ─── Generation 3 Spouses ──────────────────────────────────────
//   {
//     uid: 15,
//     firstName: "Rachel",
//     lastName: "Harrington",
//     maidenName: "Moore",
//     gender: Gender.Female,
//     dateOfBirth: new Date("1982-04-04"),
//     dateOfDeath: new Date("2070-01-01"),
//     residency: "London, UK",
//     note: "James' wife",
//     parentUid: [999],
//     spouseUid: [7],
//     offspringUid: [16, 17],
//     profilePic: "rachel.jpg",
//     libarary: ["rachel.pdf"]
//   },
//   {
//     uid: 18,
//     firstName: "Daniel",
//     lastName: "Wright",
//     maidenName: "",
//     gender: Gender.Male,
//     dateOfBirth: new Date("1981-01-01"),
//     dateOfDeath: new Date("2070-01-01"),
//     residency: "Oxford, UK",
//     note: "Emily's husband",
//     parentUid: [999],
//     spouseUid: [8],
//     offspringUid: [19],
//     profilePic: "daniel.jpg",
//     libarary: ["daniel.pdf"]
//   },
//   {
//     uid: 20,
//     firstName: "Natalie",
//     lastName: "Turner",
//     maidenName: "Reed",
//     gender: Gender.Female,
//     dateOfBirth: new Date("1987-05-05"),
//     dateOfDeath: new Date("2075-01-01"),
//     residency: "Bath, UK",
//     note: "Oliver's wife",
//     parentUid: [999],
//     spouseUid: [10],
//     offspringUid: [21],
//     profilePic: "natalie.jpg",
//     libarary: ["natalie.pdf"]
//   },
//   {
//     uid: 22,
//     firstName: "Claire",
//     lastName: "Harrington",
//     maidenName: "Young",
//     gender: Gender.Female,
//     dateOfBirth: new Date("1991-06-06"),
//     dateOfDeath: new Date("2080-01-01"),
//     residency: "York, UK",
//     note: "Thomas' wife",
//     parentUid: [999],
//     spouseUid: [13],
//     offspringUid: [23],
//     profilePic: "claire.jpg",
//     libarary: ["claire.pdf"]
//   },

//   // ─── Generation 4: Great-Grandchildren ─────────────────────────
//   {
//     uid: 16,
//     firstName: "Noah",
//     lastName: "Harrington",
//     maidenName: "",
//     gender: Gender.Male,
//     dateOfBirth: new Date("2010-01-01"),
//     dateOfDeath: new Date("2100-01-01"),
//     residency: "London, UK",
//     note: "Great-grandchild",
//     parentUid: [7, 15],
//     spouseUid: [],
//     offspringUid: [],
//     profilePic: "noah.jpg",
//     libarary: ["noah.pdf"]
//   },
//   {
//     uid: 17,
//     firstName: "Ella",
//     lastName: "Harrington",
//     maidenName: "",
//     gender: Gender.Female,
//     dateOfBirth: new Date("2013-03-03"),
//     dateOfDeath: new Date("2100-01-01"),
//     residency: "London, UK",
//     note: "Great-grandchild",
//     parentUid: [7, 15],
//     spouseUid: [],
//     offspringUid: [],
//     profilePic: "ella.jpg",
//     libarary: ["ella.pdf"]
//   },
//   {
//     uid: 19,
//     firstName: "Mia",
//     lastName: "Wright",
//     maidenName: "",
//     gender: Gender.Female,
//     dateOfBirth: new Date("2012-09-09"),
//     dateOfDeath: new Date("2100-01-01"),
//     residency: "Oxford, UK",
//     note: "Great-grandchild",
//     parentUid: [8, 18],
//     spouseUid: [],
//     offspringUid: [],
//     profilePic: "mia.jpg",
//     libarary: ["mia.pdf"]
//   },
//   {
//     uid: 21,
//     firstName: "Leo",
//     lastName: "Turner",
//     maidenName: "",
//     gender: Gender.Male,
//     dateOfBirth: new Date("2015-11-11"),
//     dateOfDeath: new Date("2100-01-01"),
//     residency: "Bath, UK",
//     note: "Great-grandchild",
//     parentUid: [10, 20],
//     spouseUid: [],
//     offspringUid: [],
//     profilePic: "leo.jpg",
//     libarary: ["leo.pdf"]
//   },
//   {
//     uid: 23,
//     firstName: "Isla",
//     lastName: "Harrington",
//     maidenName: "",
//     gender: Gender.Female,
//     dateOfBirth: new Date("2018-08-08"),
//     dateOfDeath: new Date("2100-01-01"),
//     residency: "York, UK",
//     note: "Great-grandchild",
//     parentUid: [13, 22],
//     spouseUid: [],
//     offspringUid: [],
//     profilePic: "isla.jpg",
//     libarary: ["isla.pdf"]
//   },
//   {
//     uid: 999,
//     firstName: "unknown",
//     lastName: "unknown",
//     maidenName: "",
//     gender: Gender.Male,
//     dateOfBirth: new Date("1930-01-15"),
//     dateOfDeath: new Date("2005-06-20"),
//     residency: "unknown",
//     note: "unknown",
//     parentUid: [],
//     spouseUid: [998],
//     offspringUid: [],
//     profilePic: "unknown.jpg",
//     libarary: ["unknown.pdf"]
//   }
// ]
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
  console.log('PEOPLEBYID: ',  peopleById)
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
export const DatabaseOld = {
  name: "CEO",
  attributes: {
    uid: 1,
    firstName: "Elizabeth",
    lastName: "Hawkins",
    department: "Executive"
  },
  children: [
    {
      name: "Manager",
      attributes: {
        uid: 2,
        firstName: "Michael",
        lastName: "Turner",
        department: "Production"
      },
      children: [
        {
          name: "Foreman",
          attributes: {
            uid: 3,
            firstName: "Sarah",
            lastName: "Klein",
            department: "Fabrication"
          },
          children: [
            {
              name: "Worker",
              attributes: {
                uid: 4,
                firstName: "Daniel",
                lastName: "Ortiz",
                department: "Fabrication"
              }
            },
            {
              name: "Worker",
              attributes: {
                uid: 5,
                firstName: "Alicia",
                lastName: "Brown",
                department: "Fabrication"
              }
            },
            {
              name: "Worker",
              attributes: {
                uid: 6,
                firstName: "Marcus",
                lastName: "Lee",
                department: "Fabrication"
              }
            }
          ]
        },
        {
          name: "Foreman",
          attributes: {
            uid: 7,
            firstName: "Robert",
            lastName: "Peterson",
            department: "Assembly"
          },
          children: [
            {
              name: "Worker",
              attributes: {
                uid: 8,
                firstName: "Nina",
                lastName: "Volkov",
                department: "Assembly"
              }
            },
            {
              name: "Worker",
              attributes: {
                uid: 9,
                firstName: "James",
                lastName: "O'Connor",
                department: "Assembly"
              }
            }
          ]
        }
      ]
    },
    {
      name: "Manager",
      attributes: {
        uid: 10,
        firstName: "Laura",
        lastName: "Chen",
        department: "Logistics"
      },
      children: [
        {
          name: "Foreman",
          attributes: {
            uid: 11,
            firstName: "Victor",
            lastName: "Ramirez",
            department: "Shipping"
          },
          children: [
            {
              name: "Worker",
              attributes: {
                uid: 12,
                firstName: "Emily",
                lastName: "Santos",
                department: "Shipping"
              }
            },
            {
              name: "Worker",
              attributes: {
                uid: 13,
                firstName: "Tom",
                lastName: "Henderson",
                department: "Shipping"
              }
            }
          ]
        }
      ]
    }
  ]

};

console.log('DATABASE3: ',  DatabaseOld)
console.log('DATABASE2: ',  Database2)