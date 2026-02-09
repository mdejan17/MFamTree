function List() {
    
    const fruits = [{id: 1, name: 'apple', calories: 95},
                    {id: 2, name: 'bannana', calories: 45},
                    {id: 3, name: 'kiwi', calories: 66}];

    const listItems = fruits.map(fruit => <li key={fruit.id}>{fruit.name}</li>)
    return ( <ul>{listItems}</ul>);
}
export default List