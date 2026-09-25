import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDefaultRoute, ROUTES } from '@/lib/routes';
import { apiFetch, setStoredAuthToken, getStoredAuthToken } from '@/lib/api-client';
import { trackLogin, trackSignupCompleted } from '@/lib/telemetry-client';
import { normalizeReferralCode } from '@/utils/referralCode';
import { validateReferralCode } from '@/lib/account';
import { EXISTING_ACCOUNT_MESSAGE, normalizeEmail } from '@/lib/auth-flow';
import type { RegistrationOutcome } from '@/lib/auth-flow';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt?: string;
  isAdmin: boolean;
  adminRole: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  adminRole: string | null;
  defaultRoute: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, name: string, password: string, referralCode?: string) => Promise<RegistrationOutcome>;
  loading: boolean;
  initializing: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEV_MOCK_USER: User = {
  id: '000000000000000000000001',
  name: 'Local Preview User',
  email: 'local@vixy.app',
  isAdmin: false,
  adminRole: null,
};

async function readJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Request failed (${response.status})`);
  }
  return data;
}

async function requestAuth(action: string, body: Record<string, unknown>) {
  const response = await apiFetch('/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...body }),
  });
  return readJson(response) as Promise<{ token: string; user: User }>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isLocalPreview = import.meta.env.DEV && import.meta.env.VITE_LOCAL_PREVIEW === 'true';
  const [user, setUser] = useState<User | null>(isLocalPreview ? DEV_MOCK_USER : null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(!isLocalPreview);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const hydrateUserFromToken = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      setUser(isLocalPreview ? DEV_MOCK_USER : null);
      setInitializing(false);
      return null;
    }

    try {
      const response = await apiFetch('/auth', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readJson(response) as { user: User };
      setUser(data.user);
      setInitializing(false);
      return data.user;
    } catch {
      setStoredAuthToken(null);
      setUser(isLocalPreview ? DEV_MOCK_USER : null);
      setInitializing(false);
      return null;
    }
  }, [isLocalPreview]);

  useEffect(() => {
    void hydrateUserFromToken();
  }, [hydrateUserFromToken]);

  const clearError = useCallback(() => setError(null), []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await requestAuth('login', { email: normalizeEmail(email), password });
      setStoredAuthToken(data.token);
      setUser(data.user);
      navigate(getDefaultRoute(data.user.isAdmin), { replace: true });
      trackLogin();
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, name: string, password: string, referralCode?: string): Promise<RegistrationOutcome> => {
    setLoading(true);
    setError(null);
    try {
      if (name.trim().length < 2) throw new Error('Name must be at least 2 characters');
      const normalizedReferralCode = normalizeReferralCode(referralCode || '');
      if (normalizedReferralCode) {
        const referralIsValid = await validateReferralCode(normalizedReferralCode);
        if (!referralIsValid) throw new Error('This referral code is invalid.');
      }

      const data = await requestAuth('register', {
        email: normalizeEmail(email),
        name: name.trim(),
        password,
        referralCode: normalizedReferralCode || undefined,
      });
      setStoredAuthToken(data.token);
      setUser(data.user);
      navigate(getDefaultRoute(data.user.isAdmin), { replace: true });
      trackSignupCompleted();
      return 'signed_in';
    } catch (err: any) {
      const message = /already exists|already registered/i.test(err.message || '')
        ? EXISTING_ACCOUNT_MESSAGE
        : err.message || 'Registration failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      setStoredAuthToken(null);
      await apiFetch('/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      }).catch(() => {});
    } finally {
      setUser(null);
      setError(null);
      navigate(ROUTES.PUBLIC.LOGIN, { replace: true });
      setLoading(false);
    }
  }, [navigate]);

  const isAdmin = Boolean(user?.isAdmin);
  const adminRole = user?.adminRole ?? null;
  const defaultRoute = getDefaultRoute(isAdmin);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isAdmin,
      adminRole,
      defaultRoute,
      login,
      logout,
      register,
      loading,
      initializing,
      error,
      clearError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
