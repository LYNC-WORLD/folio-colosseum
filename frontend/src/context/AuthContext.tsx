import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { loginWithGoogle } from "../services/api/auth";

import {
  restoreGoogleSession,
  signInWithGoogle,
  signOutGoogle,
} from "../services/googleAuth";

import type { GoogleSession, GoogleUser, LoginResponse } from "../types/auth";

type AuthState = {
  user: GoogleUser | null;
  session: LoginResponse | null;
  initializing: boolean;
  busy: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

// Development bypass
const SKIP_AUTH = __DEV__ && process.env.EXPO_PUBLIC_SKIP_AUTH === "true";

// Mock user
const DEV_USER: GoogleUser = {
  id: "dev-user-001",
  name: "Yash Developer",
  email: "yash@dev.local",
  photo: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(
    SKIP_AUTH ? DEV_USER : null,
  );

  const [session, setSession] = useState<LoginResponse | null>(null);

  const [initializing, setInitializing] = useState(!SKIP_AUTH);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Exchange Google ID token for backend session
  const authenticate = useCallback(async (g: GoogleSession) => {
    const res = await loginWithGoogle(g.idToken);

    setUser(g.user);
    setSession(res);
  }, []);

  // Restore session on app launch
  useEffect(() => {
    if (SKIP_AUTH) {
      setUser(DEV_USER);
      setInitializing(false);
      return;
    }

    (async () => {
      try {
        const g = await restoreGoogleSession();

        if (g) {
          await authenticate(g);
        }
      } catch (e) {
        console.warn("Session restore failed", e);
      } finally {
        setInitializing(false);
      }
    })();
  }, [authenticate]);

  // Sign in
  const signIn = useCallback(async () => {
    // Development bypass
    if (SKIP_AUTH) {
      setUser(DEV_USER);
      setInitializing(false);
      setError(null);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const g = await signInWithGoogle();

      console.log(g);

      if (!g) return;

      await authenticate(g);
    } catch (e) {
      await signOutGoogle().catch(() => {});

      setError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }, [authenticate]);

  // Sign out
  const signOut = useCallback(async () => {
    if (SKIP_AUTH) {
      setUser(DEV_USER);
      setError(null);
      return;
    }

    await signOutGoogle();

    setUser(null);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      initializing,
      busy,
      error,
      signIn,
      signOut,
    }),
    [user, session, initializing, busy, error, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }

  return ctx;
}
