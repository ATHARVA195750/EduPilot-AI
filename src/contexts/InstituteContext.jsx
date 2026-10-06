/**
 * InstituteContext — FastAPI backend edition.
 *
 * Loads profile and institute data from the FastAPI backend using the
 * authenticated user object provided by AuthContext.
 *
 * The Supabase import has been removed. All data fetching now goes through
 * the centralized apiClient.
 */
import { createContext, useContext, useLayoutEffect, useRef, useState } from 'react';
import { useAuthContext } from './AuthContext';
import { apiGet } from '../lib/apiClient';

const InstituteContext = createContext(null);

const VALID_ROLES = ['owner', 'admin', 'teacher', 'student'];

export function InstituteProvider({ children }) {
  const { user, loading: authLoading, authGeneration, logout } = useAuthContext();

  const [profile, setProfile] = useState(null);
  const [institute, setInstitute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [profileIdentity, setProfileIdentity] = useState(null);
  const requestRef = useRef(null);
  const currentIdentityRef = useRef(null);
  currentIdentityRef.current = {
    userId: user?.id ?? null,
    authGeneration,
    authLoading,
  };

  useLayoutEffect(() => {
    const request = {
      userId: user?.id ?? null,
      authGeneration,
      active: true,
    };
    requestRef.current = request;

    const isCurrent = () => {
      const ci = currentIdentityRef.current;
      return (
        request.active &&
        requestRef.current === request &&
        ci.userId === request.userId &&
        ci.authGeneration === request.authGeneration &&
        !ci.authLoading
      );
    };

    async function loadProfileAndInstitute() {
      if (authLoading) {
        setProfileIdentity(request);
        setProfile(null);
        setInstitute(null);
        setProfileError(null);
        setLoading(true);
        return;
      }

      if (!user) {
        setProfileIdentity(request);
        setProfile(null);
        setInstitute(null);
        setProfileError(null);
        setLoading(false);
        return;
      }

      setProfileIdentity(request);
      setProfile(null);
      setInstitute(null);
      setLoading(true);
      setProfileError(null);

      try {
        // user object from AuthContext.login already contains profile fields
        // (id, email, full_name, role, institute_id, branch_id, status).
        // We use it directly so no additional round-trip is needed in the
        // happy path. An explicit /auth/me call re-validates the token.
        let profileData = user;

        if (!profileData.role) {
          // Fallback: fetch fresh profile from /auth/me
          profileData = await apiGet('/auth/me');
        }

        if (!isCurrent()) return;

        if (!VALID_ROLES.includes(profileData.role)) {
          setProfile(profileData);
          setInstitute(null);
          setProfileError(`Invalid application role assigned (${profileData.role || 'none'}).`);
          return;
        }

        if (profileData.status && profileData.status.toLowerCase() !== 'active') {
          setProfile(null);
          setInstitute(null);
          setProfileError('Your account is inactive. Please contact your institute administrator.');
          await logout();
          return;
        }

        if (isCurrent()) setProfile(profileData);

        if (profileData.institute_id) {
          try {
            const instituteData = await apiGet(`/institutes/${profileData.institute_id}`);
            if (isCurrent()) setInstitute(instituteData || null);
          } catch (instErr) {
            console.warn('Could not load institute details:', instErr.message);
            if (isCurrent()) setInstitute(null);
          }
        } else {
          if (isCurrent()) setInstitute(null);
        }
      } catch (err) {
        console.error('Unexpected error loading institute context:', err);
        if (isCurrent()) {
          setProfile(null);
          setInstitute(null);
          setProfileError(err.message || 'An error occurred while loading profile.');
        }
      } finally {
        if (isCurrent()) setLoading(false);
      }
    }

    loadProfileAndInstitute();

    return () => {
      request.active = false;
    };
  }, [user?.id, authGeneration, authLoading, logout]);

  const profileIsCurrent =
    !authLoading &&
    profileIdentity?.userId === (user?.id ?? null) &&
    profileIdentity?.authGeneration === authGeneration;

  const value = {
    user,
    profile: profileIsCurrent ? profile : null,
    institute: profileIsCurrent ? institute : null,
    instituteId: profileIsCurrent ? profile?.institute_id || null : null,
    branchId: profileIsCurrent ? profile?.branch_id || null : null,
    role:
      profileIsCurrent && profile?.role && VALID_ROLES.includes(profile.role)
        ? profile.role
        : null,
    loading: authLoading || loading || !profileIsCurrent,
    profileError: profileIsCurrent ? profileError : null,
    isAuthenticated: Boolean(user),
  };

  return (
    <InstituteContext.Provider value={value}>{children}</InstituteContext.Provider>
  );
}

export function useInstitute() {
  const ctx = useContext(InstituteContext);
  return (
    ctx || {
      user: null,
      profile: null,
      institute: null,
      instituteId: null,
      branchId: null,
      role: null,
      loading: false,
      profileError: null,
      isAuthenticated: false,
    }
  );
}