import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { isOwnerUser } from "../lib/owner";
import { DottedRabbit } from "../components/rabbit/DottedRabbit";

export function OnboardingPage() {
  const { completeOnboarding, user } = useAuth();
  const isOwner = isOwnerUser(user);
  const [submitting, setSubmitting] = useState(false);

  async function handleStart() {
    setSubmitting(true);
    try {
      await completeOnboarding();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F3ED] px-5 py-12 text-[#242424]">
      <div className="w-full max-w-md rounded-2xl border border-stone-200/80 bg-[#FFFCF7] p-7 text-center sm:p-9 shadow-xs">
        <div className="mx-auto flex justify-center mb-3">
          <DottedRabbit size="md" />
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-[0.18em] text-[#242424]">
          TRAKKER
        </h1>
        <p className="mt-1.5 text-xs text-stone-500 tracking-wide">
          Your personal operating system
        </p>

        <div className="my-6 border-t border-stone-200/80" />

        <div className="grid gap-4 sm:grid-cols-2 text-left text-xs">
          {/* Work Mode Summary */}
          <div className="rounded-lg border border-stone-200/70 bg-[#F7F3ED]/40 p-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
              WORK
            </div>
            <ul className="mt-2.5 space-y-1.5 text-stone-700">
              <li className="flex items-center gap-2">
                <span className="text-[var(--primary)] font-bold">•</span>
                <span>Timetable</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[var(--primary)] font-bold">•</span>
                <span>Work Tasks</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[var(--primary)] font-bold">•</span>
                <span>Meetings</span>
              </li>
            </ul>
          </div>

          {/* Personal Mode Summary */}
          <div className="rounded-lg border border-stone-200/70 bg-[#F7F3ED]/40 p-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7A8450]">
              PERSONAL
            </div>
            <ul className="mt-2.5 space-y-1.5 text-stone-700">
              <li className="flex items-center gap-2">
                <span className="text-[#7A8450] font-bold">•</span>
                <span>Daily Routines</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#7A8450] font-bold">•</span>
                <span>Goals & Habits</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#7A8450] font-bold">•</span>
                <span>Workout</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#7A8450] font-bold">•</span>
                <span>Quick Ideas</span>
              </li>
              {isOwner && (
                <li className="flex items-center gap-2 text-stone-900 font-medium">
                  <span className="text-[#7A8450] font-bold">•</span>
                  <span>PhD Tracking</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <p className="my-5 text-center text-xs text-stone-500 font-light">
          Local-first architecture · Syncs silently with your Google account
        </p>

        <button
          type="button"
          onClick={handleStart}
          disabled={submitting}
          className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--primary)] px-6 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {submitting ? "Starting…" : "Start Trakker"}
        </button>
      </div>
    </div>
  );
}
