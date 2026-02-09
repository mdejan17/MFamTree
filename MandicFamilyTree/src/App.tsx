import { HashRouter as Router, Routes, Route } from "react-router-dom"
import Home from './dom/Home.tsx'
import Login from './dom/Login.tsx'
import Overview from './dom/Overview.tsx'
import TreeFocus from "./dom/TreeFocus.tsx"

function App() {

  return(
    <Router>
      <Routes>
        
        <Route path="/" element={ <Home/> }/>
        <Route path="/login" element={ <Login/> }/>
        <Route path="/overview" element={ <Overview/> }/>
        {/* <Route path="/profile" element={ <PersonProfile/>÷ }/> */}
        <Route path="/focus" element={ <TreeFocus/> }/>
        
      </Routes>
    </Router>
  )

}

export default App