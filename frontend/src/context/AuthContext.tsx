import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  restoreGoogleSession,
  signInWithGoogle,
  signOutGoogle,
  loginWithGoogle,
} from "../services";
import type { GoogleSession, GoogleUser, LoginResponse } from "../types";

type AuthState = {
  user: GoogleUser | null;
  session: LoginResponse | null;
  idToken: string | null;
  initializing: boolean;
  busy: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [session, setSession] = useState<LoginResponse | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticate = useCallback(async (g: GoogleSession) => {
    console.log("Authenticating with Google session", g.idToken);
    const res = await loginWithGoogle(g.idToken);
    setUser(g.user);
    setSession(res);
    setIdToken(g.idToken);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const g = await restoreGoogleSession();
        if (g) await authenticate(g);
      } catch (e) {
        console.warn("Session restore failed", e);
      } finally {
        setInitializing(false);
      }
    })();
  }, [authenticate]);

  const signIn = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const g = await signInWithGoogle();
      if (!g) return;
      await authenticate(g);
    } catch (e) {
      await signOutGoogle().catch(() => {});
      setError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }, [authenticate]);

  const signOut = useCallback(async () => {
    await signOutGoogle();
    setUser(null);
    setSession(null);
    setIdToken(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      idToken,
      initializing,
      busy,
      error,
      signIn,
      signOut,
    }),
    [user, session, idToken, initializing, busy, error, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
