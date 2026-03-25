import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User, LoginResult, LoginResponse } from '../api/client';
import {
  getMe,
  login as apiLogin,
  completeLoginWithEmailOtp,
  register as apiRegister,
  logout as apiLogout,
} from '../api/client';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
  institutionName?: string;
  institutionCountry?: string;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<LoginResult>;
  completeEmailOtpLogin: (emailOtpToken: string, code: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null });

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setState({ user: null, loading: false, error: null });
      return;
    }
    try {
      const { user } = await getMe();
      setState({ user, loading: false, error: null });
    } catch {
      setState({ user: null, loading: false, error: null });
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    const onLogout = () => setState({ user: null, loading: false, error: null });
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const result = await apiLogin(email, password);
      if ('requiresEmailOtp' in result && result.requiresEmailOtp) {
        setState((s) => ({ ...s, loading: false }));
        return result;
      }
      await loadUser();
      return result as LoginResponse;
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : 'Login failed',
      }));
      throw e;
    }
  }, [loadUser]);

  const completeEmailOtpLoginCb = useCallback(async (emailOtpToken: string, code: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await completeLoginWithEmailOtp(emailOtpToken, code);
      await loadUser();
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : 'Verification failed',
      }));
      throw e;
    }
  }, [loadUser]);

  const register = useCallback(async (input: RegisterInput) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await apiRegister(input);
      await loadUser();
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : 'Registration failed',
      }));
      throw e;
    }
  }, [loadUser]);

  const logout = useCallback(() => {
    apiLogout();
    setState({ user: null, loading: false, error: null });
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    completeEmailOtpLogin: completeEmailOtpLoginCb,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
