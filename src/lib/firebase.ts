import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  signOut as fbSignOut,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
  type Auth,
  type User,
} from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

// Vite environment variables for Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    // Ensure auth state persists across browser sessions & PWA standalone sessions
    void setPersistence(auth, browserLocalPersistence);

    // Initialize Firestore with persistent multi-tab IndexedDB cache
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      db = getFirestore(app);
    }
  } catch (err) {
    console.error("Failed to initialize Firebase:", err);
  }
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export { app, auth, db };

/**
 * Initiates Google sign-in.
 * Prefers signInWithPopup for reliability in SPA deployments (e.g. Vercel)
 * where third-party cookie restrictions frequently break signInWithRedirect.
 * If popups are blocked by the browser, gracefully falls back to redirect sign-in.
 */
export async function signInWithGoogle(): Promise<User | null> {
  if (!auth) {
    throw new Error(
      "Firebase is not configured. Please set the VITE_FIREBASE_* environment variables.",
    );
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: unknown) {
    const authError = err as { code?: string; message?: string };

    // User closed popup without selecting an account — not a hard failure
    if (authError.code === "auth/popup-closed-by-user") {
      return null;
    }

    // Popup was blocked by browser — fallback to redirect sign-in
    if (authError.code === "auth/popup-blocked") {
      console.warn("Popup blocked by browser, attempting redirect fallback...");
      try {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("trakker:auth:redirect_pending", "true");
        }
        await signInWithRedirect(auth, googleProvider);
        return null;
      } catch (redirectErr) {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("trakker:auth:redirect_pending");
        }
        console.error("Redirect sign-in failed:", redirectErr);
        throw redirectErr;
      }
    }

    throw err;
  }
}

/**
 * Handles redirect result after the user returns from Google sign-in.
 */
export async function handleRedirectResult(): Promise<User | null> {
  if (!auth) return null;
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch (err: unknown) {
    const authError = err as { code?: string; message?: string };
    if (authError.code === "auth/popup-closed-by-user") {
      return null;
    }
    console.error("Error resolving redirect result:", err);
    throw err;
  }
}

/**
 * Waits for Firebase Auth to complete initial resolution (restoring persistence, redirect tokens).
 */
export async function waitForAuthStateReady(): Promise<void> {
  if (!auth) return;
  try {
    await auth.authStateReady();
  } catch (err) {
    console.warn("authStateReady error:", err);
  }
}

/**
 * Signs the user out of Firebase.
 */
export async function signOut(): Promise<void> {
  if (!auth) return;
  await fbSignOut(auth);
}

/**
 * Subscribes to Firebase auth state changes.
 */
export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

/**
 * Formats Firebase auth errors into clear, human-actionable messages.
 */
export function formatAuthError(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;

  const authError = err as { code?: string; message?: string };
  const code = authError.code || "";

  switch (code) {
    case "auth/unauthorized-domain":
      return "This domain is not authorized in Firebase. Please add this domain in Firebase Console → Authentication → Settings → Authorized domains.";
    case "auth/popup-blocked":
      return "The sign-in popup was blocked by your browser. Please allow popups for this site, or try again.";
    case "auth/popup-closed-by-user":
      return "";
    case "auth/cancelled-popup-request":
      return "";
    case "auth/network-request-failed":
      return "Network error: unable to connect to Firebase. Please check your internet connection.";
    case "auth/operation-not-allowed":
      return "Google sign-in is not enabled in Firebase Console. Please enable it in Authentication → Sign-in method.";
    case "auth/user-disabled":
      return "This user account has been disabled.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using a different sign-in method.";
    default: {
      const msg = authError.message || "";
      const cleanMsg = msg.replace(/^Firebase:\s*(?:Error\s*)?(?:\([^)]+\)\.?)?\s*/i, "").trim();
      return cleanMsg || "Failed to sign in with Google. Please try again.";
    }
  }
}
