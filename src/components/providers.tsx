"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { Profile } from "@/types";
import { useAuthStore } from "@/store/auth-store";

interface AuthContextType {
  user: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const { setUser } = useAuthStore();
  const [loading, setLoadingState] = useState(true);
  const [supabase] = useState(() => 
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: "implicit",
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
          storage: {
            getItem: (key: string) => {
              if (typeof window === 'undefined') return null;
              // Try localStorage first, then cookies
              const localValue = localStorage.getItem(key);
              if (localValue) return localValue;
              // Try cookie
              const cookies = document.cookie.split('; ').reduce((acc, c) => {
                const [k, v] = c.split('=');
                acc[k] = v;
                return acc;
              }, {} as Record<string, string>);
              return cookies[key] || null;
            },
            setItem: (key: string, value: string) => {
              if (typeof window === 'undefined') return;
              localStorage.setItem(key, value);
            },
            removeItem: (key: string) => {
              if (typeof window === 'undefined') return;
              localStorage.removeItem(key);
            },
          },
        },
        cookies: {
          getAll() {
            if (typeof document === 'undefined') return [];
            return document.cookie.split('; ').map(c => {
              const [name, value] = c.split('=');
              return { name, value };
            });
          },
          setAll(cookies) {
            cookies.forEach(({ name, value, options }) => {
              document.cookie = `${name}=${value}; path=${options?.path || '/'}; max-age=${options?.maxAge || 3600}; SameSite=${options?.sameSite || 'Lax'}`;
            });
          },
        },
      }
    )
  );

  useEffect(() => {
    const getUser = async () => {
      console.log("=== Providers: Getting session ===");
      console.log("Cookies:", document.cookie);
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      console.log("Session:", { hasSession: !!session, error: error?.message });
      
      if (session?.user) {
        console.log("User logged in:", session.user.email);
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        
        setUser(profile as Profile | null);
      } else {
        console.log("No session found");
        setUser(null);
      }
      
      setLoadingState(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        
        setUser(profile as Profile | null);
      } else {
        setUser(null);
      }
      
      setLoadingState(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase, setUser]);

  const signIn = async (email: string, password: string) => {
    setLoadingState(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoadingState(false);
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    // Use implicit flow - direct URL approach to get tokens in hash
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
    const authUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${redirectUri}`;
    window.location.href = authUrl;
    return { error: null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoadingState(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoadingState(false);
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateProfile = async (data: Partial<Profile>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update(data)
      .eq("id", user.id);

    if (!error) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      setUser(profile as Profile);
    }
  };

  return (
    <AuthContext.Provider value={{ user: null, isLoading: loading, signIn, signInWithGoogle, signUp, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}