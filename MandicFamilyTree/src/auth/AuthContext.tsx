import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchMe, login as apiLogin, signup as apiSignup } from '../api/auth.ts'
import type { AuthUser } from '../api/auth.ts'

const STORAGE_KEY = 'familytree.auth.token'

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      // Synchronizing React state with the external token (localStorage):
      // when there's no token there's nothing to fetch, so we just settle
      // the "no session" state immediately instead of staying in `loading`.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(null);
      setLoading(false);
      return;
    }
    fetchMe(token)
      .then(({ user }) => {
        if (!cancelled) setUser(user);
      })
      .catch(() => {
        if (!cancelled) {
          setToken(null);
          setUser(null);
          localStorage.removeItem(STORAGE_KEY);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      async login(email, password) {
        const result = await apiLogin(email, password);
        localStorage.setItem(STORAGE_KEY, result.token);
        setToken(result.token);
        setUser(result.user);
      },
      async signup(email, password, displayName) {
        const result = await apiSignup(email, password, displayName);
        localStorage.setItem(STORAGE_KEY, result.token);
        setToken(result.token);
        setUser(result.user);
      },
      logout() {
        localStorage.removeItem(STORAGE_KEY);
        setToken(null);
        setUser(null);
      },
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is tightly coupled to AuthProvider above
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
