function param(a: number, b:number): string{
    return 'Result=' + (a + b);
}

function optionalParam(a: number, b?:number): string{
    if(!b) return ''; // handler
    return 'Result=' + (a + b);
}

function defaultParam(a: number, b:number = 1): string{
    return 'Result=' + (a + b);
}

// Call signatures
interface MathOperations {
    (x:number,y:number): number;
}

const add: MathOperations = (a, b) => a+b;
const substract: MathOperations = (a, b) => a-b;

//Higher order functions
function higherOrder(func: MathOperations) {
    return func(10,20);
}

//void function
function returnVoid(){
    console.log('Something');
    return;
}

const returnVoidArrow: () => void = () =>{
    console.log('Something');
}

//unknown 
function anyFunc(a:any){
    a.name;
}
function unknownFunc(a: unknown){
//    a.name;
//    a + 10;
}

function neverFunc():never {
    throw new Error("Error");
}

//Untyped function
function functionGlobalType(func: Function){
    return func(1,2);
}

//Rest parameters
function restParam(n: number, ...m:number[]){
    return 'do something'
}
const a = restParam(1,2,3,4,5,6,7)