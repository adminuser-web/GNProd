import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Normalized user shape. Keeps existing `user.uid` consumers working after the
// Firebase -> Supabase swap (Supabase exposes `id`, not `uid`).
export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface UserProfile {
  id?: string;
  fullName: string;
  phone: string;
  email: string;
  role: 'customer' | 'admin';
  dob?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    stateCode?: string;
    pincode: string;
    country?: string;
    countryCode?: string;
  };
  marketingConsent?: boolean;
  profileCompleted: boolean;
  createdAt?: any;
  updatedAt?: any;
}

interface AuthContextType {
  user: AppUser | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (data: any) => Promise<void>;
  signIn: (data: any) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAppUser(u: SupabaseUser | null): AppUser | null {
  if (!u) return null;
  return {
    uid: u.id,
    email: u.email ?? null,
    displayName: (u.user_metadata?.full_name as string) ?? null,
  };
}

// profiles rows are snake_case in Postgres; the app uses camelCase.
function rowToProfile(row: any): UserProfile {
  return {
    id: row.id,
    email: row.email ?? '',
    fullName: row.full_name ?? '',
    phone: row.phone ?? '',
    role: (row.role as 'customer' | 'admin') ?? 'customer',
    dob: row.dob ?? undefined,
    address: row.address ?? undefined,
    marketingConsent: row.marketing_consent ?? false,
    profileCompleted: row.profile_completed ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadProfile = async (u: SupabaseUser | null) => {
      if (!u) {
        if (active) { setProfile(null); setLoading(false); }
        return;
      }
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', u.id)
          .maybeSingle();
        if (active) setProfile(data ? rowToProfile(data) : null);
      } catch (e) {
        console.error('Error loading user profile:', e);
        if (active) setProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    // Initial session on load.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const u = data.session?.user ?? null;
      setUser(toAppUser(u));
      loadProfile(u);
    });

    // React to sign-in / sign-out / token refresh.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(toAppUser(u));
      // Defer the Supabase query: running it synchronously inside this callback
      // can re-enter the auth lock and stall.
      setTimeout(() => { if (active) loadProfile(u); }, 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUp = async ({ fullName, phone, email, password }: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    // When email confirmation is disabled, a session exists right away and we can
    // finish the profile (a DB trigger already created the row with the name).
    if (data.session && data.user) {
      await supabase
        .from('profiles')
        .update({ full_name: fullName, phone })
        .eq('id', data.user.id);
    }
  };

  const signIn = async ({ email, password }: any) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
