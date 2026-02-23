import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { AuthUser } from '../types';
import { safeGetJson } from '../utils/storage';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_STORAGE_KEY = 'kakeibo_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // 起動時にローカルストレージから復元
  useEffect(() => {
    const user = safeGetJson<AuthUser | null>(AUTH_STORAGE_KEY, null);
    if (user) {
      setState({ user, isLoading: false, isAuthenticated: true });
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (email: string, _password: string) => {
    // TODO: Replace with Cognito authentication
    // const session = await Auth.signIn(email, password);
    const user: AuthUser = {
      userId: 'demo-user',
      email,
      name: email.split('@')[0],
      familyId: 'demo-family',
      role: 'primary',
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem('kakeibo_token', 'demo-token');
    setState({ user, isLoading: false, isAuthenticated: true });
  }, []);

  const signup = useCallback(async (email: string, _password: string, name: string) => {
    // TODO: Replace with Cognito sign up
    const user: AuthUser = {
      userId: 'demo-user',
      email,
      name,
      familyId: 'demo-family',
      role: 'primary',
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem('kakeibo_token', 'demo-token');
    setState({ user, isLoading: false, isAuthenticated: true });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem('kakeibo_token');
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
