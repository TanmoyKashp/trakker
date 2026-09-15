import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  db,
  formatAuthError,
  handleRedirectResult,
  isFirebaseConfigured,
  signInWithGoogle,
  signOut as fbSignOut,
  subscribeToAuth,
  waitForAuthStateReady,
} from "../lib/firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  showOnboarding: boolean;
  isConfigured: boolean;
  isOfflineMode: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  continueOffline: () => void;
  completeOnboarding: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(() => {
    return localStorage.getItem("trakker:offline_mode") === "true";
  });

  // Check onboarding status for the given user
  const checkOnboardingStatus = useCallback(async (currentUser: User) => {
    const localKey = `trakker:onboarding_completed:${currentUser.uid}`;
    if (localStorage.getItem(localKey) === "true") {
      setShowOnboarding(false);
      return;
    }

    if (!db) {
      setShowOnboarding(false);
      return;
    }

    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const snap = await getDoc(userDocRef);
      if (snap.exists() && snap.data()?.onboardingCompleted) {
        localStorage.setItem(localKey, "true");
        setShowOnboarding(false);
      } else {
        // First-ever login: show onboarding once
        setShowOnboarding(true);
      }
    } catch (err) {
      console.warn("Could not fetch user profile from Firestore:", err);
      // If offline or failed, check if user was already established locally
      const isNew = currentUser.metadata.creationTime === currentUser.metadata.lastSignInTime;
      setShowOnboarding(isNew);
    }
  }, []);

  // Handle redirect result and auth state listener
  useEffect(() => {
    let isMounted = true;
    let unsubscribeAuth: (() => void) | null = null;

    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    // Safety timeout: Never leave the app stuck on a loading screen indefinitely
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 5000);

    async function initAuth() {
      const wasRedirectPending =
        typeof window !== "undefined" &&
        sessionStorage.getItem("trakker:auth:redirect_pending") === "true";
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("trakker:auth:redirect_pending");
      }

      let redirectUser: User | null = null;
      try {
        redirectUser = await handleRedirectResult();
      } catch (err: unknown) {
        if (isMounted) {
          const msg = formatAuthError(err);
          if (msg) setError(msg);
        }
      }

      // Wait for Firebase to finish reading IndexedDB persistence & redirect tokens
      await waitForAuthStateReady();

      if (!isMounted) return;

      // Check if redirect sign-in was attempted but returned null due to third-party cookie restrictions
      if (wasRedirectPending && !redirectUser) {
        console.warn("Redirect sign-in completed without credential (cross-site restriction).");
        if (isMounted) {
          setError(
            "Browser security settings interrupted redirect sign-in. Please click Continue with Google to sign in directly.",
          );
        }
      }

      // Subscribe to continuous auth state updates
      unsubscribeAuth = subscribeToAuth(async (currentUser) => {
        if (!isMounted) return;

        const activeUser = currentUser || redirectUser;
        setUser(activeUser);

        if (activeUser) {
          await checkOnboardingStatus(activeUser);
        } else {
          setShowOnboarding(false);
        }

        if (isMounted) {
          setLoading(false);
          clearTimeout(safetyTimer);
        }
      });
    }

    void initAuth();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, [checkOnboardingStatus]);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      const signedInUser = await signInWithGoogle();
      if (signedInUser) {
        setUser(signedInUser);
        setIsOfflineMode(false);
        localStorage.removeItem("trakker:offline_mode");
        await checkOnboardingStatus(signedInUser);
      }
    } catch (err: unknown) {
      const message = formatAuthError(err);
      if (message) {
        setError(message);
      }
      throw err;
    }
  }, [checkOnboardingStatus]);

  const signOut = useCallback(async () => {
    setError(null);
    localStorage.removeItem("trakker:offline_mode");
    setIsOfflineMode(false);
    try {
      await fbSignOut();
      setUser(null);
      setShowOnboarding(false);
    } catch (err: unknown) {
      const message = formatAuthError(err);
      if (message) {
        setError(message);
      }
    }
  }, []);

  const continueOffline = useCallback(() => {
    setIsOfflineMode(true);
    localStorage.setItem("trakker:offline_mode", "true");
  }, []);

  const completeOnboarding = useCallback(async () => {
    if (!user) return;
    const localKey = `trakker:onboarding_completed:${user.uid}`;
    localStorage.setItem(localKey, "true");
    setShowOnboarding(false);

    if (db) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(
          userDocRef,
          {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            onboardingCompleted: true,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      } catch (err) {
        console.warn("Could not save onboarding status to Firestore:", err);
      }
    }
  }, [user]);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        showOnboarding,
        isConfigured: isFirebaseConfigured,
        isOfflineMode,
        signIn,
        signOut,
        continueOffline,
        completeOnboarding,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
