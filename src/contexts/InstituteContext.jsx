import { createContext, useContext, useEffect, useState } from "react";
import { useAuthContext } from "./AuthContext";
import { supabase } from "../lib/supabase";

const InstituteContext = createContext(null);

const VALID_ROLES = ["owner", "admin", "teacher", "student"];

export function InstituteProvider({ children }) {
  const { user, loading: authLoading } = useAuthContext();

  const [profile, setProfile] = useState(null);
  const [institute, setInstitute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfileAndInstitute() {
      if (authLoading) {
        if (isMounted) setLoading(true);
        return;
      }

      if (!user) {
        if (isMounted) {
          setProfile(null);
          setInstitute(null);
          setProfileError(null);
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setLoading(true);
        setProfileError(null);
      }

      if (!supabase) {
        if (isMounted) {
          setProfileError("Supabase client is unavailable.");
          setLoading(false);
        }
        return;
      }

      try {
        const { data: profileData, error: fetchProfErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (fetchProfErr) {
          console.error("Error fetching user profile:", fetchProfErr);
          if (isMounted) {
            setProfile(null);
            setInstitute(null);
            setProfileError(`Failed to load profile: ${fetchProfErr.message}`);
          }
          return;
        }

        if (!profileData) {
          console.error("Profile record missing for user ID:", user.id);
          if (isMounted) {
            setProfile(null);
            setInstitute(null);
            setProfileError("Profile not configured. Please contact your administrator.");
          }
          return;
        }

        if (!VALID_ROLES.includes(profileData.role)) {
          console.error("Invalid role in profile:", profileData.role);
          if (isMounted) {
            setProfile(profileData);
            setInstitute(null);
            setProfileError(`Invalid application role assigned (${profileData.role || 'none'}).`);
          }
          return;
        }

        if (isMounted) {
          setProfile(profileData);
        }

        if (profileData.institute_id) {
          const { data: instituteData, error: instErr } = await supabase
            .from("institutes")
            .select("*")
            .eq("id", profileData.institute_id)
            .maybeSingle();

          if (instErr) {
            console.error("Error fetching institute:", instErr);
          }

          if (isMounted) {
            setInstitute(instituteData || null);
          }
        } else {
          if (isMounted) setInstitute(null);
        }
      } catch (err) {
        console.error("Unexpected error loading institute context:", err);
        if (isMounted) {
          setProfile(null);
          setInstitute(null);
          setProfileError(err.message || "An error occurred while loading profile.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProfileAndInstitute();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  const value = {
    user,
    profile,
    institute,
    instituteId: profile?.institute_id || null,
    branchId: profile?.branch_id || null,
    role: profile?.role && VALID_ROLES.includes(profile.role) ? profile.role : null,
    loading: authLoading || loading,
    profileError,
    isAuthenticated: Boolean(user),
  };

  return (
    <InstituteContext.Provider value={value}>
      {children}
    </InstituteContext.Provider>
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