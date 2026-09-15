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

  // Keep DOM theme attribute and status bar meta updated to the chosen theme
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
      // Error is set in AuthContext
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
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-[#F7F3ED]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 sm:px-8 py-3.5">
          <div className="flex items-center gap-2.5 select-none">
            <DottedRabbit size="sm" />
            <span className="font-serif text-lg font-bold tracking-[0.2em] text-[#242424]">
              TRAKKER
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Theme Selector Trigger */}
            <button
              type="button"
              onClick={() => setIsThemeModalOpen(true)}
              className="focus-ring inline-flex items-center gap-2 rounded-lg border border-stone-300/80 bg-[#FFFCF7] px-3 py-1.5 text-xs font-medium text-stone-700 shadow-2xs hover:bg-stone-100 transition-colors cursor-pointer"
              title="Change color theme"
              aria-label="Change color theme"
            >
              <Palette size={14} className="text-[var(--primary)]" />
              <span className="hidden sm:inline capitalize">{currentThemeDef.name}</span>
            </button>

            {/* Quick Sign In header button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={submitting || isOffline}
              className="focus-ring inline-flex items-center justify-center rounded-lg bg-[var(--primary)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Connecting…" : "Sign In"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* HERO SECTION */}
        <section className="pt-10 sm:pt-16 lg:pt-20 pb-14 sm:pb-20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-12 lg:gap-16">
            {/* Left Column: Copy, Value Statement, Google Sign In */}
            <div className="flex-1 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-stone-300/80 bg-[#FFFCF7] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-600 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                <span>PERSONAL OPERATING SYSTEM</span>
              </div>

              <h1 className="mt-5 font-serif text-5xl sm:text-6xl lg:text-7xl font-bold tracking-[0.15em] text-[#242424] leading-[1.05]">
                TRAKKER
              </h1>

              <p className="mt-4 text-lg sm:text-xl font-normal leading-relaxed text-stone-600">
                Calm, focused tracking for your work, routines, goals, and PhD.
              </p>

              {/* Offline notice */}
              {isOffline && (
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-left text-xs text-amber-900">
                  <div className="font-medium">
                    You are currently offline. Connect to the internet to sign in with Google.
                  </div>
                  <button
                    type="button"
                    onClick={continueOffline}
                    className="mt-2.5 inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-amber-300 bg-amber-100/90 px-3 py-2 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-200 cursor-pointer"
                  >
                    Continue in Offline Mode
                  </button>
                </div>
              )}

              {/* Missing configuration notice */}
              {!isConfigured && (
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-left text-xs text-amber-900">
                  <div className="font-semibold">Firebase configuration missing</div>
                  <div className="mt-1 text-[11px] text-amber-800">
                    Please add your Firebase keys to{" "}
                    <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">.env.local</code>.
                  </div>
                  <button
                    type="button"
                    onClick={continueOffline}
                    className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-stone-800 px-4 text-xs font-semibold text-white transition-colors hover:bg-stone-900 cursor-pointer"
                  >
                    Continue in Offline Mode
                  </button>
                </div>
              )}

              {/* Error notice */}
              {error && (
                <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-left text-xs text-rose-800">
                  <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
                  <div className="flex-1">
                    <div>{error}</div>
                    <button
                      type="button"
                      onClick={clearError}
                      className="mt-1.5 font-medium underline hover:text-rose-950 cursor-pointer"
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
                  className="google-btn focus-ring inline-flex min-h-13 w-full items-center justify-center gap-3 rounded-xl border border-stone-300 bg-white px-5 text-sm sm:text-base font-medium text-stone-800 shadow-sm transition-all hover:bg-stone-50 hover:border-stone-400 hover:shadow disabled:opacity-50 cursor-pointer"
                  aria-label="Continue with Google"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={19} className="animate-spin text-stone-500" />
                      <span>Connecting to Google…</span>
                    </>
                  ) : (
                    <>
                      {/* Google official SVG logo */}
                      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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

                <div className="mt-3.5 text-center sm:text-left text-xs text-stone-500 font-light tracking-wide">
                  Local-first · Cross-device sync · Private
                </div>
              </div>
            </div>

            {/* Right Column: Signature Visual Large Dotted Rabbit */}
            <div className="flex-1 flex flex-col items-center justify-center lg:items-end">
              <div className="landing-rabbit-card card-shadow relative flex flex-col items-center justify-center rounded-3xl border border-stone-300/70 bg-[#FFFCF7] p-8 sm:p-12 transition-all">
                <DottedRabbit
                  size="hero"
                  interactive
                  className="mx-auto"
                  title="Interactive Trakker mascot — click for ripple, double click to hop"
                />

                <div className="mt-5 flex items-center gap-1.5 text-[11px] font-medium tracking-wider text-stone-500 select-none">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--primary)] opacity-70 animate-pulse" />
                  <span>tap the rabbit to say hello</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* UNDERSTATED PRINCIPLES / FEATURES ROW */}
        <section className="border-y border-stone-200/80 py-10 sm:py-14 my-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex items-start gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-tint)] text-[var(--primary)]">
                <ShieldCheck size={19} />
              </div>
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-[#242424]">
                  Your data stays yours
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  Local-first persistence. Your schedules, tasks, and notes remain on your device even without an internet connection.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-tint)] text-[var(--primary)]">
                <Smartphone size={19} />
              </div>
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-[#242424]">
                  Works across devices
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  Seamless Cloud Firestore sync updates your phone, tablet, and desktop in real time without conflicting overwrites.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-tint)] text-[var(--primary)]">
                <Zap size={19} />
              </div>
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-[#242424]">
                  Local-first and fast
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  Instant interactions with zero loading spinners on everyday actions. Everything opens and saves with zero latency.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-tint)] text-[var(--primary)]">
                <Lock size={19} />
              </div>
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-[#242424]">
                  Private and secure
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  Each account is strictly isolated within its own authenticated Firestore vault. No tracking, no profiling, and no ads.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* BRAND STATEMENT & MODE SEPARATION */}
        <section className="py-14 sm:py-20 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-wide text-[#242424]">
              A calmer, more intentional you.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-stone-600">
              Tasks. Goals. Routines. Work. PhD. All in one place.
            </p>
          </div>

          {/* Mode Distinction Cards */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {/* Work Mode Card */}
            <div className="landing-card card-shadow rounded-2xl border border-stone-300/70 bg-[#FFFCF7] p-6 sm:p-8">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-[#6B1F2A]/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#6B1F2A]">
                <Briefcase size={13} />
                <span>Work Mode</span>
              </div>
              <h3 className="mt-4 font-serif text-xl font-semibold text-[#242424]">
                Deep Focus & Professional Execution
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
                Keep your job or business completely isolated from personal clutter.
              </p>
              <ul className="mt-5 space-y-2.5 text-xs text-stone-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#6B1F2A] shrink-0" />
                  <span>Structured Timetable with automated day/night schedules</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#6B1F2A] shrink-0" />
                  <span>Work tasks with priority levels and unified next action</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#6B1F2A] shrink-0" />
                  <span>Meeting notes and schedules without noise</span>
                </li>
              </ul>
            </div>

            {/* Personal Mode Card */}
            <div className="landing-card card-shadow rounded-2xl border border-stone-300/70 bg-[#FFFCF7] p-6 sm:p-8">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-[#7A8450]/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#7A8450]">
                <User size={13} />
                <span>Personal Mode</span>
              </div>
              <h3 className="mt-4 font-serif text-xl font-semibold text-[#242424]">
                Life, Health & Intellectual Growth
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
                Cultivate healthy habits, creative sparks, and research goals peacefully.
              </p>
              <ul className="mt-5 space-y-2.5 text-xs text-stone-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#7A8450] shrink-0" />
                  <span>Daily habits, routines, and long-term goal tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#7A8450] shrink-0" />
                  <span>Configurable workout routines with built-in active timer</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#7A8450] shrink-0" />
                  <span>PhD application trees, status matrices, and quick ideas</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* BOTTOM CALL TO ACTION */}
        <section className="mb-16 rounded-3xl border border-stone-300/70 bg-[#FFFCF7] p-8 sm:p-12 text-center landing-card card-shadow">
          <div className="mx-auto max-w-md">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-tint)] text-[var(--primary)] mb-3">
              <Sparkles size={20} />
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#242424]">
              Start your calmer day.
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-stone-600">
              No subscription traps. Your data is synced securely with your Google account.
            </p>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={submitting || isOffline}
              className="google-btn focus-ring mt-6 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-stone-300 bg-white px-5 text-sm font-medium text-stone-800 shadow-sm transition-all hover:bg-stone-50 hover:border-stone-400 hover:shadow disabled:opacity-50 cursor-pointer"
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
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4 px-5 sm:px-8">
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
