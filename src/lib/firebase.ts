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
 * Initiates Google sign-in using mobile-friendly redirect.
 * If redirect is not supported or fails, gracefully falls back to popup.
 */
export async function signInWithGoogle(): Promise<User | null> {
  if (!auth) {
    throw new Error(
      "Firebase is not configured. Please set the VITE_FIREBASE_* environment variables.",
    );
  }
  try {
    await signInWithRedirect(auth, googleProvider);
    return null;
  } catch (err: unknown) {
    console.warn("Redirect sign-in failed, trying popup fallback:", err);
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
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
  } catch (err) {
    console.error("Error resolving redirect result:", err);
    throw err;
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
