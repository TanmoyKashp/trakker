import { Check } from "lucide-react";
import { useState } from "react";
import { type TrakkerOs, type TrakkerOsState } from "../hooks/useTrakkerOs";
import { formatTime12, toMinutes } from "../lib/time";

export function WorkoutPage({ osState, os }: { osState: TrakkerOsState; os: TrakkerOs }) {
  const [time, setTime] = useState(osState.workout.startTime);
  const now = new Date();
  const nowT = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const started = toMinutes(nowT) >= toMinutes(osState.workout.startTime);
  const saved = time === osState.workout.startTime;

  return (
    <section className="page-enter mx-auto max-w-3xl px-4 py-5 sm:px-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Workout</h1>
        <p className="mt-1 text-sm text-stone-500">A daily personal appointment. No tracking, no streaks — just the time you show up.</p>
      </header>

      <div className="mb-4 rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Today</div>
        {osState.workout.enabled ? (
          <>
            <div className="mt-2 text-2xl font-semibold">{formatTime12(osState.workout.startTime)}</div>
            <p className="mt-1 text-sm text-stone-600">
              {started ? "It's workout time — go." : `Scheduled for ${formatTime12(osState.workout.startTime)}.`}
            </p>
            {started && (
              <a
                className="focus-ring mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
                href="#"
                onClick={(e) => e.preventDefault()}
              >
                START →
              </a>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-stone-600">Workout is disabled. Enable it below to surface it on Home and Daily.</p>
        )}
      </div>

      <div className="rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Settings</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-xs text-stone-500">
            Start time
            <input
              type="time"
              className="focus-ring mt-1 block min-h-11 rounded-md border border-stone-300 px-3 text-sm"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={saved}
            onClick={() => os.setWorkout({ startTime: time })}
            className={`focus-ring min-h-11 rounded-md px-4 text-sm font-medium ${
              saved ? "cursor-default border border-stone-200 text-stone-400" : "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
            }`}
          >
            {saved ? (
              "Saved"
            ) : (
              <>
                <Check size={15} className="mr-1 inline" /> Save
              </>
            )}
          </button>
          <label className="inline-flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={osState.workout.enabled} onChange={(e) => os.setWorkout({ enabled: e.target.checked })} />
            Enabled
          </label>
        </div>
      </div>
    </section>
  );
}
