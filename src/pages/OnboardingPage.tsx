import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export function OnboardingPage() {
  const { completeOnboarding } = useAuth();
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
    <div className="flex min-h-screen items-center justify-center bg-[#F7F3ED] px-4 py-10 text-[#242424]">
      <div className="card-shadow w-full max-w-md rounded-2xl border border-stone-300/70 bg-[#FFFCF7] p-6 text-center sm:p-8">
        <h1 className="font-serif text-3xl font-bold tracking-[0.18em] text-[#242424]">
          TRAKKER
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Your personal operating system.
        </p>

        <div className="my-6 border-t border-stone-200" />

        <div className="grid gap-4 sm:grid-cols-2 text-left">
          {/* Work Mode Summary */}
          <div className="rounded-xl border border-stone-200 bg-[#F7F3ED]/50 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#6B1F2A]">
              WORK
            </div>
            <ul className="mt-3 space-y-2 text-sm text-stone-700">
              <li className="flex items-center gap-2">
                <span className="text-[#6B1F2A] font-bold">•</span>
                <span>Timetable</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#6B1F2A] font-bold">•</span>
                <span>Tasks</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#6B1F2A] font-bold">•</span>
                <span>Meetings</span>
              </li>
            </ul>
          </div>

          {/* Personal Mode Summary */}
          <div className="rounded-xl border border-stone-200 bg-[#F7F3ED]/50 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#7A8450]">
              PERSONAL
            </div>
            <ul className="mt-3 space-y-2 text-sm text-stone-700">
              <li className="flex items-center gap-2">
                <span className="text-[#7A8450] font-bold">•</span>
                <span>Goals</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#7A8450] font-bold">•</span>
                <span>Workouts</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#7A8450] font-bold">•</span>
                <span>Quick Ideas</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#7A8450] font-bold">•</span>
                <span>PhD tracking</span>
              </li>
            </ul>
          </div>
        </div>

        <p className="my-6 text-center text-sm italic text-stone-500">
          &ldquo;Your data syncs across your devices.&rdquo;
        </p>

        <button
          type="button"
          onClick={handleStart}
          disabled={submitting}
          className="focus-ring inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#6B1F2A] px-6 text-sm font-semibold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Starting…" : "Start Trakker"}
        </button>
      </div>
    </div>
  );
}
