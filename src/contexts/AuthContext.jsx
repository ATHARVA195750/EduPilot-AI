import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      if (!supabase) {
        if (isMounted) {
          setAuthError('Supabase client is not configured.');
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (isMounted) {
          setSession(data.session);
          setUser(data.session?.user ?? null);
          setAuthError(null);
        }
      } catch (error) {
        console.error('Supabase session load error:', error.message);
        if (isMounted) {
          setAuthError(error.message);
          setUser(null);
          setSession(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSession();

    if (!supabase) {
      return () => { isMounted = false; };
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (isMounted) {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setAuthError(null);
      }
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const login = async ({ email, password }) => {
    setAuthError(null);
    if (!supabase) {
      const err = new Error('Supabase configuration missing.');
      setAuthError(err.message);
      return { data: null, error: err };
    }

    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      if (res.error) {
        setAuthError(res.error.message);
      } else {
        setSession(res.data.session);
        setUser(res.data.user);
      }
      return res;
    } catch (err) {
      setAuthError(err.message || 'Login failed due to a network error.');
      return { data: null, error: err };
    }
  };

  const register = async ({ email, password }) => {
    setAuthError(null);
    if (!supabase) {
      const err = new Error('Supabase configuration missing.');
      setAuthError(err.message);
      return { data: null, error: err };
    }

    try {
      const res = await supabase.auth.signUp({ email, password });
      if (res.error) {
        setAuthError(res.error.message);
      } else {
        setSession(res.data.session);
        setUser(res.data.user);
      }
      return res;
    } catch (err) {
      setAuthError(err.message || 'Registration failed due to a network error.');
      return { data: null, error: err };
    }
  };

  const logout = async () => {
    setUser(null);
    setSession(null);
    setAuthError(null);
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('SignOut error:', e.message);
      }
    }
  };

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      authError,
      login,
      register,
      logout,
      signOut: logout,
      isAuthenticated: Boolean(user),
    }),
    [user, session, loading, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
