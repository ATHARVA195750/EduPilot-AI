/**
 * AuthContext — FastAPI backend edition.
 *
 * Replaces Supabase Auth. Token is stored in sessionStorage via tokenStore
 * (cleared when the tab closes; never exposed in logs or console).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiPost, tokenStore } from '../lib/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);           // profile object from /auth/me
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authGeneration, setAuthGeneration] = useState(0);
  const authGenerationRef = useRef(0);
  const activeUserIdRef = useRef(null);

  const bumpGeneration = useCallback((nextUserId) => {
    if (activeUserIdRef.current !== nextUserId) {
      activeUserIdRef.current = nextUserId;
      authGenerationRef.current += 1;
      setAuthGeneration(authGenerationRef.current);
    }
  }, []);

  /** Restore user from existing token on mount */
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { apiGet } = await import('../lib/apiClient');
        const profile = await apiGet('/auth/me');
        if (!cancelled) {
          setUser(profile);
          bumpGeneration(profile.id);
        }
      } catch {
        // Token invalid / expired — clear it silently
        tokenStore.clear();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  /** Handle 401 broadcasts from the API client */
  useEffect(() => {
    const onUnauthorized = () => {
      tokenStore.clear();
      setUser(null);
      bumpGeneration(null);
    };
    window.addEventListener('edupilot:unauthorized', onUnauthorized);
    return () => window.removeEventListener('edupilot:unauthorized', onUnauthorized);
  }, [bumpGeneration]);

  /**
   * Unified login supporting Admin (email), Teacher (TCH-XX-XXXX), Student (STU-XX-XXXX).
   * roleType: 'admin' | 'teacher' | 'student'
   */
  const login = useCallback(async ({ identifier, password, roleType = 'admin' }) => {
    setAuthError(null);
    try {
      const data = await apiPost('/auth/login', { identifier, password, roleType }, false);
      tokenStore.set(data.access_token);
      const profile = data.user;
      setUser(profile);
      bumpGeneration(profile.id);
      return { data, error: null };
    } catch (err) {
      const msg = err.message || 'Login failed. Please check your credentials.';
      setAuthError(msg);
      return { data: null, error: new Error(msg) };
    }
  }, [bumpGeneration]);

  const logout = useCallback(async () => {
    tokenStore.clear();
    setUser(null);
    setAuthError(null);
    bumpGeneration(null);
    // Best-effort signout to backend (invalidate any server-side session)
    try {
      await apiPost('/auth/logout', {});
    } catch {
      // ignore — token already cleared locally
    }
    return { data: null, error: null };
  }, [bumpGeneration]);

  const value = useMemo(() => ({
    user,
    session: user ? { user } : null,       // Compat shim: legacy code checks session?.user
    authGeneration,
    loading,
    authError,
    login,
    logout,
    signOut: logout,
    isAuthenticated: Boolean(user),
    // Legacy compat: register via FastAPI register-admin
    register: async ({ email, password, ...rest }) => {
      setAuthError(null);
      try {
        const data = await apiPost('/auth/register-admin', { email, password, ...rest }, false);
        tokenStore.set(data.access_token);
        setUser(data.user);
        bumpGeneration(data.user.id);
        return { data, error: null };
      } catch (err) {
        const msg = err.message || 'Registration failed.';
        setAuthError(msg);
        return { data: null, error: new Error(msg) };
      }
    },
  }), [user, authGeneration, loading, authError, login, logout, bumpGeneration]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext must be used within AuthProvider');
  return context;
}
