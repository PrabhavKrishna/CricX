"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
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
  const { user, setUser } = useAuthStore();
  const [loading, setLoadingState] = useState(true);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    console.log("=== Providers: Initializing ===");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    console.log("Supabase URL present:", !!url);
    console.log("Supabase Key length:", key?.length || 0);

    const getUser = async () => {
      console.log("=== Providers: Getting session ===");
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      console.log("Session:", { hasSession: !!session, error: error?.message });
      
      if (session?.user) {
        console.log("User logged in:", session.user.email);
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        
        if (profile) {
          setUser(profile as Profile);
        } else {
          // Construct fallback profile from auth user metadata
          const fallbackProfile: Profile = {
            id: session.user.id,
            email: session.user.email || "",
            full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || "User",
            avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
            created_at: session.user.created_at,
            updated_at: new Date().toISOString()
          };
          setUser(fallbackProfile);
        }
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
        
        if (profile) {
          setUser(profile as Profile);
        } else {
          const fallbackProfile: Profile = {
            id: session.user.id,
            email: session.user.email || "",
            full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || "User",
            avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
            created_at: session.user.created_at,
            updated_at: new Date().toISOString()
          };
          setUser(fallbackProfile);
        }
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error: error as Error | null };
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
    <AuthContext.Provider value={{ user, isLoading: loading, signIn, signInWithGoogle, signUp, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
