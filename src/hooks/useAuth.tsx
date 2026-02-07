import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';

type AppRole = 'admin' | 'dentist' | 'patient';

interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  patient_ref: string | null;
  doctor_ref: string | null;
  institution_name: string | null;
  institution_logo_url: string | null;
  country: string | null;
  phone: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  primaryRole: AppRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  isDentist: boolean;
  isPatient: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string, role: 'dentist' | 'patient') => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useI18n();

  const fetchProfile = useCallback(async (userId: string, userMetadata?: Record<string, unknown>) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile not found - create one from user_metadata
          console.log('Profile not found, creating from metadata...');
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              user_id: userId,
              first_name: (userMetadata?.first_name as string) || null,
              last_name: (userMetadata?.last_name as string) || null,
            })
            .select()
            .single();

          if (!insertError && newProfile) {
            console.log('Profile created successfully');
            return newProfile as Profile;
          }
          console.error('Error creating profile:', insertError);
          return null;
        }
        console.error('Error fetching profile:', error);
        return null;
      }

      return data as Profile | null;
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      return null;
    }
  }, []);

  const fetchRoles = useCallback(async (userId: string, userMetadata?: Record<string, unknown>) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching roles:', error);
        return [];
      }

      // If no roles found, try to create from user_metadata
      // SECURITY: Only allow dentist/patient roles - admin cannot be self-assigned
      if (!data || data.length === 0) {
        const roleFromMetadata = userMetadata?.role as AppRole;
        if (roleFromMetadata && ['dentist', 'patient'].includes(roleFromMetadata)) {
          console.log('Role not found, creating from metadata:', roleFromMetadata);
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert({
              user_id: userId,
              role: roleFromMetadata,
            });

          if (!insertError) {
            console.log('Role created successfully');
            return [roleFromMetadata];
          }
          console.error('Error creating role:', insertError);
        }
        return [];
      }

      return (data.map(r => r.role) || []) as AppRole[];
    } catch (err) {
      console.error('Error in fetchRoles:', err);
      return [];
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const userMetadata = user.user_metadata;
      const profileData = await fetchProfile(user.id, userMetadata);
      const rolesData = await fetchRoles(user.id, userMetadata);
      setProfile(profileData);
      setRoles(rolesData);
    }
  }, [user, fetchProfile, fetchRoles]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Handle password recovery event - preserve hash for token
        if (event === 'PASSWORD_RECOVERY') {
          // Outlook SafeLinks / some clients may drop the URL hash; keep a flag so UI stays in reset mode
          sessionStorage.setItem('pw_recovery', '1');
          window.location.assign('/auth?mode=reset' + window.location.hash);
          return;
        }

        // Defer profile/role fetching with setTimeout to avoid Supabase deadlock
        if (session?.user) {
          setTimeout(async () => {
            const userMetadata = session.user.user_metadata;
            const profileData = await fetchProfile(session.user.id, userMetadata);
            const rolesData = await fetchRoles(session.user.id, userMetadata);
            setProfile(profileData);
            setRoles(rolesData);
            setIsLoading(false);

            // Update last login
            if (event === 'SIGNED_IN') {
              supabase
                .from('profiles')
                .update({ last_login_at: new Date().toISOString() })
                .eq('user_id', session.user.id)
                .then(() => {});
            }
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const userMetadata = session.user.user_metadata;
        Promise.all([
          fetchProfile(session.user.id, userMetadata),
          fetchRoles(session.user.id, userMetadata)
        ]).then(([profileData, rolesData]) => {
          setProfile(profileData);
          setRoles(rolesData);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchRoles]);

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: 'dentist' | 'patient'
  ): Promise<{ error: Error | null }> => {
    try {
      const redirectUrl = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
            role: role,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          return { error: new Error(t.auth.userAlreadyExists) };
        }
        return { error };
      }

      if (data.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            first_name: firstName,
            last_name: lastName,
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
        }

        // Create role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: role,
          });

        if (roleError) {
          console.error('Error creating role:', roleError);
        }
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: new Error(t.auth.invalidCredentials) };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const resetPassword = async (email: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const updateProfile = async (data: Partial<Profile>): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('user_id', user.id);

      if (error) {
        return { error };
      }

      await refreshProfile();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const primaryRole = roles.length > 0 
    ? (roles.includes('admin') ? 'admin' : roles.includes('dentist') ? 'dentist' : 'patient')
    : null;

  const value: AuthContextType = {
    user,
    session,
    profile,
    roles,
    primaryRole,
    isLoading,
    isAdmin: roles.includes('admin'),
    isDentist: roles.includes('dentist'),
    isPatient: roles.includes('patient'),
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
