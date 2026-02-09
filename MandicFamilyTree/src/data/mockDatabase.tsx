
export enum Gender{
    Male,
    Female,
  }
export interface Person{
    uid: number;
    firstName: string;
    lastName: string;
    maidenName?: string;
    gender: Gender;
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

export const Database: Person[] = [
  {
    uid: 1,
    firstName: "John",
    lastName: "Anderson",
    maidenName: "",
    gender: Gender.Male,
    dateOfBirth: new Date("1975-04-12"),
    dateOfDeath: new Date("2045-09-01"),
    residency: "New York, USA",
    note: "Family patriarch and avid chess player.",
    parentUid: [10],
    spouseUid: [2],
    offspringUid: [3, 4],
    profilePic: "john_anderson.jpg",
    libarary: ["Birth Certificate", "Marriage License"]
  },
  {
    uid: 2,
    firstName: "Mary",
    lastName: "Anderson",
    maidenName: "Collins",
    gender: Gender.Female,
    dateOfBirth: new Date("1978-11-03"),
    dateOfDeath: new Date("2050-06-18"),
    residency: "New York, USA",
    note: "Loves gardening and watercolor painting.",
    parentUid: [13, 14],
    spouseUid: [1],
    offspringUid: [3, 4],
    profilePic: "mary_anderson.jpg",
    libarary: ["Passport", "Art Portfolio"]
  },
  {
    uid: 3,
    firstName: "Emily",
    lastName: "Anderson",
    maidenName: "",
    gender: Gender.Female,
    dateOfBirth: new Date("2001-02-21"),
    dateOfDeath: new Date("2090-01-01"),
    residency: "Boston, USA",
    note: "Studying biomedical engineering.",
    parentUid: [1, 2],
    spouseUid: [],
    offspringUid: [],
    profilePic: "emily_anderson.jpg",
    libarary: ["University Transcript"]
  },
  {
    uid: 4,
    firstName: "Lucas",
    lastName: "Anderson",
    maidenName: "",
    gender: Gender.Male,
    dateOfBirth: new Date("2004-07-09"),
    dateOfDeath: new Date("2085-05-12"),
    residency: "Chicago, USA",
    note: "Semi-professional cyclist.",
    parentUid: [1, 2],
    spouseUid: [],
    offspringUid: [],
    profilePic: "lucas_anderson.jpg",
    libarary: ["Race Medals", "Training Logs"]
  },
  {
    uid: 5,
    firstName: "Anna",
    lastName: "Müller",
    maidenName: "Schmidt",
    gender: Gender.Female,
    dateOfBirth: new Date("1969-01-30"),
    dateOfDeath: new Date("2040-10-10"),
    residency: "Munich, Germany",
    note: "Historian specializing in medieval Europe.",
    parentUid: [15, 16],
    spouseUid: [6],
    offspringUid: [7],
    profilePic: "anna_mueller.jpg",
    libarary: ["Doctoral Thesis", "Published Papers"]
  },
  {
    uid: 6,
    firstName: "Karl",
    lastName: "Müller",
    maidenName: "",
    gender: Gender.Male,
    dateOfBirth: new Date("1965-08-14"),
    dateOfDeath: new Date("2038-03-22"),
    residency: "Munich, Germany",
    note: "Mechanical engineer with a passion for vintage cars.",
    parentUid: [17, 18],
    spouseUid: [5],
    offspringUid: [7],
    profilePic: "karl_mueller.jpg",
    libarary: ["Engineering Certifications"]
  },
  {
    uid: 7,
    firstName: "Sophie",
    lastName: "Müller",
    maidenName: "",
    gender: Gender.Female,
    dateOfBirth: new Date("1998-12-05"),
    dateOfDeath: new Date("2080-07-07"),
    residency: "Berlin, Germany",
    note: "Freelance graphic designer.",
    parentUid: [5, 6],
    spouseUid: [],
    offspringUid: [],
    profilePic: "sophie_mueller.jpg",
    libarary: ["Design Portfolio"]
  },
  {
    uid: 8,
    firstName: "David",
    lastName: "Nguyen",
    maidenName: "",
    gender: Gender.Male,
    dateOfBirth: new Date("1988-06-17"),
    dateOfDeath: new Date("2065-11-11"),
    residency: "San Jose, USA",
    note: "Software architect and open-source contributor.",
    parentUid: [19, 20],
    spouseUid: [9],
    offspringUid: [10],
    profilePic: "david_nguyen.jpg",
    libarary: ["GitHub Archive"]
  },
  {
    uid: 9,
    firstName: "Linh",
    lastName: "Nguyen",
    maidenName: "Tran",
    gender: Gender.Female,
    dateOfBirth: new Date("1990-09-02"),
    dateOfDeath: new Date("2070-04-30"),
    residency: "San Jose, USA",
    note: "UX researcher with a background in psychology.",
    parentUid: [21, 22],
    spouseUid: [8],
    offspringUid: [10],
    profilePic: "linh_nguyen.jpg",
    libarary: ["Research Notes"]
  },
  {
    uid: 10,
    firstName: "Ethan",
    lastName: "Nguyen",
    maidenName: "",
    gender: Gender.Male,
    dateOfBirth: new Date("2018-03-15"),
    dateOfDeath: new Date("2100-12-31"),
    residency: "San Jose, USA",
    note: "Enjoys building LEGO cities.",
    parentUid: [8, 9],
    spouseUid: [],
    offspringUid: [],
    profilePic: "ethan_nguyen.jpg",
    libarary: ["School Records", "Artwork"]
  }
];


export const Database2 = {
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