import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext.tsx'

// Wrap any route that a logged-out visitor shouldn't be able to see. While
// AuthProvider is still checking a stored token against the server, render
// nothing rather than flashing the real page or bouncing to /login and back.
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default RequireAuth
