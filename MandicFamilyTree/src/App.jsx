import Header from './Modules/Header/Header.jsx'
import Footer from './Modules/Footer/Footer.jsx'
import Person from './Modules/Person/Person.jsx'
import Button from './Modules/Button/Button.jsx'
function App() {
 

  return(
    <>
      <Header></Header>
      <Person name='Dejan' bio='Lorem ipsum dolor sit amet consectetur adipisicing elit.'></Person>
      <Person></Person>
      <Footer></Footer>
    </>
  );
}

export default App
