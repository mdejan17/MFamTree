import { useEffect } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from './auth/AuthContext.tsx'
import RequireAuth from './auth/RequireAuth.tsx'
import { AddUserPopupProvider } from './ui/AddUserPopupContext.tsx'
import { BranchProvider } from './ui/BranchContext.tsx'
import { HoveredPersonProvider } from './ui/HoveredPersonContext.tsx'
import { LocaleProvider } from './i18n/LocaleContext.tsx'
import BranchProfile from './dom/BranchProfile.tsx'
import Home from './dom/Home.tsx'
import Login from './dom/Login.tsx'
import Overview from './dom/Overview.tsx'
import PersonProfile from './dom/PersonProfile.tsx'
import TreeFocus from "./dom/TreeFocus.tsx"

function App() {
  useEffect(() => {
    document.body.style.zoom = "100%";
  }, []);
  return(
    <LocaleProvider>
    <AuthProvider>
      <BranchProvider>
      <AddUserPopupProvider>
      <HoveredPersonProvider>
        <Router>
          <Routes>

            <Route path="/" element={ <RequireAuth><Home/></RequireAuth> }/>
            <Route path="/login" element={ <Login/> }/>
            <Route path="/overview" element={ <RequireAuth><Overview/></RequireAuth> }/>
            <Route path="/profile/:id" element={ <RequireAuth><PersonProfile/></RequireAuth> }/>
            <Route path="/branch/:id" element={ <RequireAuth><BranchProfile/></RequireAuth> }/>
            <Route path="/focus" element={ <RequireAuth><TreeFocus/></RequireAuth> }/>
            <Route path="/focus/:id" element={ <RequireAuth><TreeFocus/></RequireAuth> }/>
            <Route path="*" element={ <Navigate to="/" replace/> }/>

          </Routes>
        </Router>
      </HoveredPersonProvider>
      </AddUserPopupProvider>
      </BranchProvider>
    </AuthProvider>
    </LocaleProvider>
  )

}

export default App