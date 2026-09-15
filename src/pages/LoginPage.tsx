import { useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { signIn, error, clearError, isConfigured, continueOffline } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

  async function handleGoogleSignIn() {
    setSubmitting(true);
    clearError();
    try {
      await signIn();
    } catch {
      // Error is set in AuthContext
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F3ED] px-4 py-12 text-[#242424]">
      <div className="card-shadow w-full max-w-sm rounded-2xl border border-stone-300/70 bg-[#FFFCF7] p-6 text-center sm:p-8">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          Personal Operating System
        </div>
        <h1 className="mt-2 font-serif text-3xl font-bold tracking-[0.18em] text-[#242424]">
          TRAKKER
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-stone-600">
          Calm, focused tracking for your work, routines, goals, and PhD.
        </p>

        <div className="my-6 border-t border-stone-200" />

        {/* Offline notice */}
        {isOffline && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-800">
            <div>You are currently offline. Connect to the internet to sign in with Google.</div>
            <button
              type="button"
              onClick={continueOffline}
              className="mt-2.5 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-amber-300 bg-amber-100/80 px-3 py-2 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-200"
            >
              Continue in Offline Mode
            </button>
          </div>
        )}

        {/* Configuration notice if env vars not provided */}
        {!isConfigured && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-800">
            <div className="font-semibold">Firebase configuration missing</div>
            <div className="mt-1 text-[11px] text-amber-700">
              Please add your Firebase keys to <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.env.local</code> (see <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.env.example</code>).
            </div>
            <button
              type="button"
              onClick={continueOffline}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-stone-800 px-4 text-xs font-semibold text-white transition-colors hover:bg-stone-900"
            >
              Continue in Offline Mode
            </button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-left text-xs text-rose-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
            <div className="flex-1">
              <div>{error}</div>
              <button
                type="button"
                onClick={clearError}
                className="mt-1 underline hover:text-rose-950"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Continue with Google button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={submitting || isOffline}
          className="focus-ring inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800 shadow-xs transition-colors hover:bg-stone-50 disabled:opacity-50"
          aria-label="Continue with Google"
        >
          {submitting ? (
            <>
              <RefreshCw size={18} className="animate-spin text-stone-500" />
              <span>Connecting to Google…</span>
            </>
          ) : (
            <>
              {/* Google official SVG logo */}
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <div className="mt-6 text-[11px] text-stone-400">
          Local-first · Cross-device sync · Private
        </div>
      </div>
    </div>
  );
}
