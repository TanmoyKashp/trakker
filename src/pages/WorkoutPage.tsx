import { useState } from "react";
import { Check, Edit2, Play, Plus, Square, Trash2, X } from "lucide-react";
import { type TrakkerOs, type TrakkerOsState } from "../hooks/useTrakkerOs";
import { useWorkoutTimer } from "../hooks/useWorkoutTimer";
import { formatTime12 } from "../lib/time";
import type { WorkoutItem } from "../types";

export function WorkoutPage({ osState, os }: { osState: TrakkerOsState; os: TrakkerOs }) {
  const { activeWorkout, secondsLeft, isActive, isCompleted, startWorkout, stopWorkout } = useWorkoutTimer();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formTime, setFormTime] = useState("17:00");
  const [formDuration, setFormDuration] = useState("45");
  const [formEnabled, setFormEnabled] = useState(true);

  const workouts: WorkoutItem[] = osState.workouts && osState.workouts.length > 0
    ? osState.workouts
    : [
        {
          id: "default-workout",
          title: "Daily Workout",
          startTime: osState.workout.startTime || "17:00",
          durationMinutes: 45,
          enabled: osState.workout.enabled ?? true,
        },
      ];

  function openAddForm() {
    setEditingId(null);
    setFormTitle("Daily Workout");
    setFormTime(workouts[0]?.startTime || "17:00");
    setFormDuration("45");
    setFormEnabled(true);
    setIsAdding(true);
  }

  function openEditForm(workout: WorkoutItem) {
    setIsAdding(false);
    setEditingId(workout.id);
    setFormTitle(workout.title);
    setFormTime(workout.startTime);
    setFormDuration(String(workout.durationMinutes || 45));
    setFormEnabled(workout.enabled);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const title = formTitle.trim() || "Workout";
    const startTime = formTime || "17:00";
    const durationMinutes = Math.max(5, Math.min(300, parseInt(formDuration, 10) || 45));

    if (editingId) {
      os.updateWorkout(editingId, {
        title,
        startTime,
        durationMinutes,
        enabled: formEnabled,
      });
      setEditingId(null);
    } else {
      os.addWorkout({
        title,
        startTime,
        durationMinutes,
        enabled: formEnabled,
      });
      setIsAdding(false);
    }
  }

  function handleDelete(id: string) {
    if (activeWorkout?.workoutId === id) {
      stopWorkout();
    }
    os.deleteWorkout(id);
  }

  // Format seconds as MM:SS (e.g. 01:00, 00:45)
  const formattedSeconds = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;
  const progressPercent = Math.min(100, Math.max(0, ((60 - secondsLeft) / 60) * 100));

  return (
    <section className="page-enter mx-auto max-w-3xl px-4 py-5 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Workout</h1>
        <p className="mt-1 text-sm text-stone-500">
          Daily personal appointments. Set your times, show up, and move.
        </p>
      </header>

      {/* ACTIVE WORKOUT STATE: 60-Second Countdown Timer */}
      {isActive && activeWorkout && (
        <div className="card-shadow mb-6 rounded-xl border-2 border-[var(--primary)] bg-[#FFFCF7] p-5 sm:p-6 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
            {isCompleted ? "WORKOUT COMPLETED" : "ACTIVE WORKOUT IN PROGRESS"}
          </div>

          <h2 className="mt-1 text-2xl font-bold text-[#242424]">
            {activeWorkout.workoutTitle}
          </h2>

          <div className="my-4">
            <div className="font-mono text-5xl font-bold tracking-tight text-[var(--primary)]">
              {formattedSeconds}
            </div>
            <p className="mt-1 text-xs text-stone-500">
              {isCompleted ? "Great work! Session finished." : `${secondsLeft} seconds remaining`}
            </p>
          </div>

          {/* Clean progress bar */}
          <div className="mx-auto mb-5 h-2 w-full max-w-md overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full bg-[var(--primary)] transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={stopWorkout}
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-md bg-stone-800 px-6 text-sm font-semibold text-white hover:bg-stone-900"
            >
              <Square size={14} className="fill-current" />
              {isCompleted ? "Dismiss" : "Stop Workout"}
            </button>
          </div>
        </div>
      )}

      {/* WORKOUTS LIST */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Your Workouts
        </h2>
        {!isAdding && !editingId && (
          <button
            type="button"
            onClick={openAddForm}
            className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary-tint)]"
          >
            <Plus size={15} /> Add workout
          </button>
        )}
      </div>

      {/* ADD / EDIT WORKOUT FORM */}
      {(isAdding || editingId) && (
        <form
          onSubmit={handleSave}
          className="card-shadow mb-5 rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-4 sm:p-5"
        >
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
            {editingId ? "Edit Workout" : "New Workout"}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-stone-500 mb-1">Workout title</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Strength Training"
                required
                className="focus-ring min-h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-[#242424]"
                aria-label="Workout title"
              />
            </div>

            <div>
              <label className="block text-xs text-stone-500 mb-1">Start time</label>
              <input
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                required
                className="focus-ring min-h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-[#242424]"
                aria-label="Workout start time"
              />
            </div>

            <div>
              <label className="block text-xs text-stone-500 mb-1">Duration (minutes)</label>
              <input
                type="number"
                min="5"
                max="300"
                value={formDuration}
                onChange={(e) => setFormDuration(e.target.value)}
                required
                className="focus-ring min-h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-[#242424]"
                aria-label="Workout duration in minutes"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="inline-flex min-h-11 items-center gap-2 text-sm text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formEnabled}
                  onChange={(e) => setFormEnabled(e.target.checked)}
                  className="rounded border-stone-300"
                />
                <span>Active / Enabled</span>
              </label>
            </div>
          </div>

          <div className="mt-4 flex gap-2 border-t border-stone-200/70 pt-3">
            <button
              type="submit"
              className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-md bg-[var(--primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
            >
              <Check size={16} /> Save workout
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingId(null);
              }}
              className="focus-ring inline-flex min-h-11 items-center gap-1 rounded-md border border-stone-300 px-4 text-sm text-stone-600 hover:bg-stone-100"
            >
              <X size={15} /> Cancel
            </button>
          </div>
        </form>
      )}

      {/* LIST OF WORKOUT ITEMS */}
      <div className="space-y-3">
        {workouts.map((workout) => {
          const isThisActive = activeWorkout?.workoutId === workout.id && isActive;

          return (
            <div
              key={workout.id}
              className={`card-shadow card-shadow-hover flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border bg-[#FFFCF7] p-4 transition-colors ${
                isThisActive
                  ? "border-[var(--primary)] bg-[var(--primary-tint)]/20"
                  : "border-stone-300/70"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-base font-semibold text-[#242424]">
                    {workout.title}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      workout.enabled
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-stone-100 text-stone-500"
                    }`}
                  >
                    {workout.enabled ? "Active" : "Disabled"}
                  </span>
                </div>

                <p className="mt-1 text-xs text-stone-600">
                  Scheduled for {formatTime12(workout.startTime)} · {workout.durationMinutes} min
                </p>
              </div>

              {/* Action buttons with 44px min touch targets */}
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => startWorkout(workout)}
                  className={`focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-md px-4 text-xs font-semibold shadow-xs transition-colors ${
                    isThisActive
                      ? "bg-stone-800 text-white"
                      : "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
                  }`}
                >
                  <Play size={14} className="fill-current" />
                  {isThisActive ? "Restart" : "Start Workout"}
                </button>

                <button
                  type="button"
                  onClick={() => openEditForm(workout)}
                  aria-label={`Edit workout ${workout.title}`}
                  title="Edit"
                  className="focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                >
                  <Edit2 size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(workout.id)}
                  aria-label={`Delete workout ${workout.title}`}
                  title="Delete"
                  className="focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-md text-stone-400 hover:bg-rose-50 hover:text-rose-700"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}

        {workouts.length === 0 && !isAdding && (
          <div className="rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-8 text-center text-stone-500">
            No workouts configured. Click "+ Add workout" to set up a workout.
          </div>
        )}
      </div>
    </section>
  );
}
