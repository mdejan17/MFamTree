let hello: number = 100;
let myString: string = 'String'
let largeNumber: BigInt = BigInt('2222222222222323232232323232323232323232323');
const isActive: boolean = false;
const uniqueKey: symbol = Symbol('description');
const emptyValue: null = null;
let uninitializedValue: undefined;

const person = {
    name: 'Bob',
    age: 30
}

const numbers = [1, 2, 3];
const names = ['Bob1','Bob2','Bob3','Bob4',];

enum Mode {
    DARK,
    LIGHT,
    SYSTEM, 
}

const theme:Mode = Mode.LIGHT;

if(theme === Mode.LIGHT){
    console.log("LIGHT")
}


//Interfaces
interface Human {
    alive: string;
}

interface User extends Human{
    id: string;
    name: string;
    age?: number; //optional value
}

//const user:User = {
//    id: '1',
//    name: 'Bob',
//    alive: 'yes',
//}

interface User {
    height: number;
}

const user2:User = {
    id: '1',
    name: 'Bob',
    alive: 'yes',
    height: 180,
}

//Typing
type Vehicle = {
    engine: string;
    year: number;
}

type Car = Vehicle &{
    brand: string;
}

const car: Car = {
    engine: 'v2',
    brand: 'toyota',
    year: 2020,
}

//Literal types
type Direction = 'North'| 'South';

let direction:Direction = 'North'

direction = 'South'

//Intersection types
type A = {a: string}
type B = {b: number}

type C = A & B;

const value:C = {
    a: 'a',
    b: 2,
}


//Casting 
const someValue: any = 'this is a strying';
const strLength: number = (someValue as String).length


