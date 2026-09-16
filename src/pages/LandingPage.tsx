import { useEffect, useState } from "react";
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Lock,
  Palette,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { DottedRabbit } from "../components/rabbit/DottedRabbit";
import { ThemeSelectorModal } from "../components/theme/ThemeSelectorModal";
import { THEMES, applyThemeToDom, useTheme } from "../lib/theme";

export function LandingPage() {
  const { signIn, error, clearError, isConfigured, continueOffline } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

  const { theme, setTheme } = useTheme();

  useEffect(() => {
    applyThemeToDom(theme, "work");
  }, [theme]);

  const currentThemeDef = THEMES.find((t) => t.id === theme) || THEMES[0];

  async function handleGoogleSignIn() {
    setSubmitting(true);
    clearError();
    try {
      await signIn();
    } catch {
      // Handled in AuthContext
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="landing-root min-h-screen bg-[#F7F3ED] text-[#242424] transition-colors duration-300"
      data-palette={theme}
      data-theme="work"
    >
      {/* Top Editorial Bar */}
      <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-[#F7F3ED]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 sm:px-10 py-4">
          <div className="flex items-center gap-2.5 select-none">
            <DottedRabbit size="sm" />
            <span className="font-serif text-lg font-bold tracking-[0.2em] text-[#242424]">
              TRAKKER
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsThemeModalOpen(true)}
              className="focus-ring inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
              title="Change theme"
              aria-label="Change theme"
            >
              <Palette size={14} className="text-[var(--primary)]" />
              <span className="hidden sm:inline capitalize">{currentThemeDef.name}</span>
            </button>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={submitting || isOffline}
              className="focus-ring inline-flex items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Connecting…" : "Sign In"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Editorial Body */}
      <main className="mx-auto max-w-6xl px-6 sm:px-10">
        {/* HERO SECTION — Cardless, spacious, typographical */}
        <section className="pt-12 sm:pt-20 lg:pt-28 pb-16 sm:pb-24">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-12 lg:gap-20">
            {/* Left Column: Editorial Statement */}
            <div className="flex-1 max-w-xl">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                <span>PERSONAL OPERATING SYSTEM</span>
              </div>

              <h1 className="mt-6 font-serif text-5xl sm:text-6xl lg:text-7xl font-bold tracking-[0.14em] text-[#242424] leading-[1.05]">
                TRAKKER
              </h1>

              <p className="mt-5 text-lg sm:text-xl font-normal leading-relaxed text-stone-600">
                Calm, focused tracking for your work schedules, routines, habits, and personal goals.
              </p>

              {/* Offline notice */}
              {isOffline && (
                <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/80 p-3.5 text-left text-xs text-amber-900">
                  <div className="font-medium">
                    You are currently offline. Connect to the internet to sign in with Google.
                  </div>
                  <button
                    type="button"
                    onClick={continueOffline}
                    className="mt-2 inline-flex items-center justify-center rounded border border-amber-300 bg-amber-100/90 px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-200 cursor-pointer"
                  >
                    Continue in Offline Mode
                  </button>
                </div>
              )}

              {/* Missing configuration notice */}
              {!isConfigured && (
                <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/80 p-3.5 text-left text-xs text-amber-900">
                  <div className="font-semibold">Firebase configuration missing</div>
                  <div className="mt-1 text-[11px] text-amber-800">
                    Please add your Firebase keys to{" "}
                    <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">.env.local</code>.
                  </div>
                  <button
                    type="button"
                    onClick={continueOffline}
                    className="mt-2.5 inline-flex items-center justify-center rounded bg-stone-800 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-stone-900 cursor-pointer"
                  >
                    Continue in Offline Mode
                  </button>
                </div>
              )}

              {/* Error notice */}
              {error && (
                <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50/80 p-3 text-left text-xs text-rose-800">
                  <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-600" />
                  <div className="flex-1">
                    <div>{error}</div>
                    <button
                      type="button"
                      onClick={clearError}
                      className="mt-1 font-medium underline hover:text-rose-950 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Continue with Google CTA */}
              <div className="mt-8 max-w-sm">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={submitting || isOffline}
                  className="google-btn focus-ring inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border border-stone-300 bg-white px-5 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-50 hover:border-stone-400 disabled:opacity-50 cursor-pointer"
                  aria-label="Continue with Google"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={18} className="animate-spin text-stone-500" />
                      <span>Connecting to Google…</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
                      <span className="tracking-wide">Continue with Google</span>
                    </>
                  )}
                </button>

                <div className="mt-3 text-center sm:text-left text-xs text-stone-500 font-light tracking-wide">
                  Local-first · Encrypted cloud sync · Private
                </div>
              </div>
            </div>

            {/* Right Column: Signature Pure Dotted Rabbit Hero Visual (No card container) */}
            <div className="flex-1 flex flex-col items-center justify-center lg:items-end">
              <div className="relative flex flex-col items-center justify-center p-4">
                <DottedRabbit
                  size="hero"
                  interactive
                  className="mx-auto"
                  title="Interactive Trakker mascot — click for ripple, double click to hop"
                />

                <div className="mt-4 flex items-center gap-1.5 text-[11px] font-medium tracking-wider text-stone-400 select-none">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--primary)] opacity-60 animate-pulse" />
                  <span>tap the rabbit to say hello</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* UNDERSTATED PRINCIPLES / FEATURES — Subtle horizontal dividers */}
        <section className="border-y border-stone-200/80 py-12 my-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
            <div className="space-y-1.5">
              <div className="text-[var(--primary)] mb-2">
                <ShieldCheck size={20} />
              </div>
              <h2 className="text-sm font-semibold tracking-wide text-[#242424]">
                Your data stays yours
              </h2>
              <p className="text-xs leading-relaxed text-stone-500">
                Local-first persistence. Your schedules, tasks, and routines remain on your device even without an internet connection.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="text-[var(--primary)] mb-2">
                <Smartphone size={20} />
              </div>
              <h2 className="text-sm font-semibold tracking-wide text-[#242424]">
                Works across devices
              </h2>
              <p className="text-xs leading-relaxed text-stone-500">
                Real-time Cloud Firestore synchronization automatically keeps your phone, tablet, and desktop current.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="text-[var(--primary)] mb-2">
                <Zap size={20} />
              </div>
              <h2 className="text-sm font-semibold tracking-wide text-[#242424]">
                Local-first & fast
              </h2>
              <p className="text-xs leading-relaxed text-stone-500">
                Instant UI reactions with zero loading spinners on everyday actions. Everything opens and saves instantly.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="text-[var(--primary)] mb-2">
                <Lock size={20} />
              </div>
              <h2 className="text-sm font-semibold tracking-wide text-[#242424]">
                Private & isolated
              </h2>
              <p className="text-xs leading-relaxed text-stone-500">
                Each account is strictly isolated within its own authenticated Firestore vault. No advertising, tracking, or profiling.
              </p>
            </div>
          </div>
        </section>

        {/* BRAND STATEMENT & DUAL MODE ARCHITECTURE — Editorial 2-Column Split */}
        <section className="py-14 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-wide text-[#242424]">
              A calmer, more intentional rhythm.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-stone-600">
              Work schedules. Personal goals. Daily routines. Strictly isolated when you need to focus.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14 border-t border-stone-200/80 pt-10">
            {/* Work Mode Column */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#6B1F2A]">
                <Briefcase size={14} />
                <span>Work Mode</span>
              </div>
              <h3 className="font-serif text-2xl font-semibold text-[#242424]">
                Deep Focus & Structure
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Keep your academic or professional calendar completely compartmentalized from personal clutter.
              </p>
              <ul className="mt-4 space-y-2.5 text-xs text-stone-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-[#6B1F2A] shrink-0 mt-0.5" />
                  <span>User-configurable Timetable with live lecture progress and breaks</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-[#6B1F2A] shrink-0 mt-0.5" />
                  <span>Work tasks with unified next-action recommendations</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-[#6B1F2A] shrink-0 mt-0.5" />
                  <span>Meeting agendas and time-slotted office hours</span>
                </li>
              </ul>
            </div>

            {/* Personal Mode Column */}
            <div className="space-y-4 md:border-l md:border-stone-200/80 md:pl-10 lg:pl-14">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#7A8450]">
                <User size={14} />
                <span>Personal Mode</span>
              </div>
              <h3 className="font-serif text-2xl font-semibold text-[#242424]">
                Health, Habits & Growth
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Cultivate healthy daily habits, track workout appointments, and capture creative sparks peacefully.
              </p>
              <ul className="mt-4 space-y-2.5 text-xs text-stone-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-[#7A8450] shrink-0 mt-0.5" />
                  <span>Daily morning and evening routines with completion history</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-[#7A8450] shrink-0 mt-0.5" />
                  <span>Configurable workout appointments with built-in active timer</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-[#7A8450] shrink-0 mt-0.5" />
                  <span>Long-term life goals and quick idea scratchpad</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* BOTTOM INVITATION BANNER — Editorial typography, no box card */}
        <section className="my-12 border-t border-stone-200/80 py-16 text-center">
          <div className="mx-auto max-w-md">
            <div className="mx-auto flex h-9 w-9 items-center justify-center text-[var(--primary)] mb-2">
              <Sparkles size={20} />
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#242424]">
              Start your calmer day.
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-stone-600">
              No subscription fees or ads. Your data is stored securely under your Google account.
            </p>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={submitting || isOffline}
              className="google-btn focus-ring mt-6 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border border-stone-300 bg-white px-5 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-50 hover:border-stone-400 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw size={18} className="animate-spin text-stone-500" />
                  <span>Connecting…</span>
                </>
              ) : (
                <>
                  <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
          </div>
        </section>
      </main>

      {/* MINIMAL FOOTER */}
      <footer className="border-t border-stone-200/80 py-8 text-center text-xs text-stone-500">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4 px-6 sm:px-10">
          <div className="flex items-center gap-2 font-serif font-medium tracking-wider text-stone-600">
            <DottedRabbit size="sm" />
            <span>TRAKKER</span>
          </div>
          <div>© {new Date().getFullYear()} Trakker · built for a calmer life</div>
          <button
            type="button"
            onClick={() => setIsThemeModalOpen(true)}
            className="text-stone-500 hover:text-stone-800 transition-colors cursor-pointer text-[11px]"
          >
            Theme: <span className="capitalize underline">{currentThemeDef.name}</span>
          </button>
        </div>
      </footer>

      {/* Theme Selector Modal */}
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        activeTheme={theme}
        onSelectTheme={setTheme}
      />
    </div>
  );
}
