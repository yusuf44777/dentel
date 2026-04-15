import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { supabase, type Profile } from "./supabase";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

function parseAuthRedirect(url: string) {
  const [withoutHash, hashPart = ""] = url.split("#");
  const queryPart = withoutHash.split("?")[1] ?? "";

  const hashParams = new URLSearchParams(hashPart);
  const queryParams = new URLSearchParams(queryPart);

  const accessToken = hashParams.get("access_token") ?? queryParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token") ?? queryParams.get("refresh_token");
  const code = queryParams.get("code") ?? hashParams.get("code");
  const error =
    queryParams.get("error") ??
    hashParams.get("error") ??
    queryParams.get("error_code") ??
    hashParams.get("error_code");
  const errorDescription =
    queryParams.get("error_description") ?? hashParams.get("error_description");

  return { accessToken, refreshToken, code, error, errorDescription };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function handleAuthRedirect(url: string) {
    const { accessToken, refreshToken, code, error, errorDescription } = parseAuthRedirect(url);

    if (error || errorDescription) {
      console.warn("Auth redirect hata:", errorDescription ?? error);
      return;
    }

    if (accessToken && refreshToken) {
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (setSessionError) {
        console.warn("Deep link session kurulamadı:", setSessionError.message);
      }
      return;
    }

    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        console.warn("Auth code exchange başarısız:", exchangeError.message);
      }
    }
  }

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data ?? null);
  }

  async function refreshProfile() {
    if (session?.user.id) {
      await fetchProfile(session.user.id);
    }
  }

  useEffect(() => {
    // Load existing session on mount and process deep link auth callback if present.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      let resolvedSession = session;

      if (!resolvedSession) {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          await handleAuthRedirect(initialUrl);
          const { data } = await supabase.auth.getSession();
          resolvedSession = data.session;
        }
      }

      setSession(resolvedSession);
      if (resolvedSession?.user.id) {
        fetchProfile(resolvedSession.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const deepLinkSubscription = Linking.addEventListener("url", ({ url }) => {
      void handleAuthRedirect(url);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user.id) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
      deepLinkSubscription.remove();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, profile, loading, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
