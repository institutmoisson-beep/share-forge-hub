import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: any | null;
  roles: string[];
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
  refreshProfile: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Email de l'admin spécial
const ADMIN_EMAIL = "picelvus@gmail.com";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [roles, setRoles] = useState<string[]>([]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      setProfile(data);
    } catch (e) {
      // Profil peut ne pas exister encore (trigger async)
      console.warn("Profile fetch failed:", e);
    }
  };

  const fetchRoles = async (userId: string, userEmail?: string) => {
    try {
      // Si c'est l'email admin spécial, on lui attribue automatiquement le rôle admin
      // même si la DB ne le contient pas encore
      if (userEmail === ADMIN_EMAIL) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        const dbRoles = data?.map((r) => r.role) || [];
        // S'assurer que admin est inclus
        if (!dbRoles.includes("admin")) {
          setRoles(["admin", ...dbRoles]);
        } else {
          setRoles(dbRoles);
        }
        return;
      }
      
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      setRoles(data?.map((r) => r.role) || []);
    } catch (e) {
      console.warn("Roles fetch failed:", e);
      setRoles([]);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Utiliser setTimeout pour éviter les deadlocks Supabase
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchRoles(session.user.id, session.user.email);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRoles(session.user.id, session.user.email);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata, emailRedirectTo: window.location.origin },
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  // FIX: hasRole vérifie aussi l'email admin spécial pour le rôle "admin"
  const hasRole = (role: string) => {
    if (role === "admin" && user?.email === ADMIN_EMAIL) return true;
    return roles.includes(role);
  };

  const refreshProfile = async () => {
    if (!user) return;
    await fetchProfile(user.id);
  };

  const refreshRoles = async () => {
    if (!user) return;
    await fetchRoles(user.id, user.email);
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading, profile, roles,
      signUp, signIn, signOut, hasRole,
      refreshProfile, refreshRoles,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
