import { Plus } from "lucide-react";
import { useState } from "react";
import { QuickAddTask, TaskItem } from "../components/tasks/TaskComponents";
import { routineDayIndex, todayISO, type TrakkerOs, type TrakkerOsState } from "../hooks/useTrakkerOs";
import { formatTime12, toMinutes } from "../lib/time";
import type { Routine } from "../types";

export function DailyPage({ osState, os }: { osState: TrakkerOsState; os: TrakkerOs }) {
  const now = new Date();
  const today = todayISO(now);
  const dayIdx = routineDayIndex(now);
  const workoutReady = osState.workout.enabled && toMinutes(formatHHMM(now)) >= toMinutes(osState.workout.startTime);
  const routines = osState.routines
    .filter((r) => r.enabled && r.mode === "personal" && r.daysOfWeek.includes(dayIdx))
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  const disabledRoutines = osState.routines.filter((r) => !r.enabled);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  return (
    <section className="page-enter mx-auto max-w-3xl px-4 py-5 sm:px-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Daily</h1>
      </header>

      {workoutReady && (
        <div className="card-shadow mb-4 rounded-lg border border-[var(--accent)] bg-[var(--accent)]/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">WORKOUT</div>
            <span className="rounded-md border border-[#F9CDD5] bg-[#F9CDD5]/60 px-2 py-0.5 text-[11px] font-medium text-[#242424]">starts now</span>
          </div>
          <div className="mt-1 text-lg font-semibold">Workout · {formatTime12(osState.workout.startTime)}</div>
          <p className="mt-1 text-sm text-stone-600">A personal appointment with yourself.</p>
        </div>
      )}

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Today's routines</h2>
      <div className="mb-2 space-y-2">
        {routines.length ? (
          routines.map((routine: Routine) => {
            const key = `${routine.id}:${today}`;
            const done = Boolean(osState.routineCompletions[key]);
            return (
              <div key={routine.id} className="card-shadow card-shadow-hover flex items-center gap-3 rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-3">
                <button
                  type="button"
                  onClick={() => os.toggleRoutineDone(routine.id, today)}
                  aria-label={done ? `Mark ${routine.title} not done` : `Mark ${routine.title} done`}
                  className={`focus-ring flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                    done ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-stone-400 text-transparent hover:border-[var(--primary)]"
                  }`}
                >
                  ✓
                </button>
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-sm ${done ? "text-stone-400 line-through" : "font-medium"}`}>{routine.title}</div>
                </div>
                <span className="text-xs text-stone-500">{formatTime12(routine.startTime)}</span>
                <button
                  type="button"
                  onClick={() => os.updateRoutine(routine.id, { enabled: false })}
                  aria-label={`Disable routine ${routine.title}`}
                  className="focus-ring rounded p-1 text-xs text-stone-400 hover:text-stone-700"
                  title="Disable (keeps it saved)"
                >
                  ⏸
                </button>
                <button
                  type="button"
                  onClick={() => os.deleteRoutine(routine.id)}
                  aria-label={`Delete routine ${routine.title}`}
                  className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-stone-400 hover:bg-rose-50 hover:text-rose-700"
                >
                  ✕
                </button>
              </div>
            );
          })
        ) : (
          <div className="rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-4 text-sm text-stone-500">
            No routines for today. Add one below — it will appear here on its scheduled days.
          </div>
        )}
      </div>
      {showAdd ? (
        <div className="mb-5 rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <input
              className="focus-ring min-h-11 rounded-md border border-stone-300 px-3 text-sm"
              placeholder="Routine title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              aria-label="Routine title"
            />
            <input
              type="time"
              className="focus-ring min-h-11 rounded-md border border-stone-300 px-3 text-sm"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              aria-label="Routine start time"
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="focus-ring min-h-11 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)]"
                onClick={() => {
                  if (!newTitle.trim() || !newTime) return;
                  os.addRoutine({ title: newTitle.trim(), mode: "personal", daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: newTime });
                  setNewTitle("");
                  setNewTime("");
                  setShowAdd(false);
                }}
              >
                Add
              </button>
              <button
                type="button"
                className="focus-ring min-h-11 rounded-md border border-stone-300 px-3 text-sm"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-stone-500">Added to every day. Enable/disable or edit days on this page later.</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="focus-ring mb-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-stone-300 text-sm text-stone-500 hover:border-[var(--primary)]/40 hover:text-stone-700"
        >
          <Plus size={16} /> Add routine
        </button>
      )}

      {disabledRoutines.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Disabled</h2>
          <div className="mb-5 space-y-2">
            {disabledRoutines.map((routine: Routine) => (
              <div key={routine.id} className="flex items-center gap-3 rounded-lg border border-stone-200 bg-[#FFFCF7] p-3 opacity-75">
                <div className="min-w-0 flex-1 truncate text-sm text-stone-500">{routine.title}</div>
                <span className="text-xs text-stone-400">{formatTime12(routine.startTime)}</span>
                <button
                  type="button"
                  onClick={() => os.updateRoutine(routine.id, { enabled: true })}
                  className="focus-ring rounded p-1 text-xs text-stone-500 hover:text-[var(--primary)]"
                  title="Re-enable"
                >
                  ▶
                </button>
                <button
                  type="button"
                  onClick={() => os.deleteRoutine(routine.id)}
                  aria-label={`Delete routine ${routine.title}`}
                  className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-stone-400 hover:bg-rose-50 hover:text-rose-700"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Personal tasks</h2>
      <div className="card-shadow mb-4 rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-3">
        {osState.tasks.filter((t) => t.mode === "personal" && !t.completed).length ? (
          <div className="divide-y divide-stone-200/80">
            {osState.tasks
              .filter((t) => t.mode === "personal" && !t.completed)
              .map((task) => (
                <TaskItem key={task.id} task={task} onToggle={(id) => os.updateTask(id, { completed: true })} onDelete={os.deleteTask} showContext={false} />
              ))}
          </div>
        ) : (
          <div className="text-sm text-stone-500">No open personal tasks.</div>
        )}
      </div>
      <QuickAddTask mode="personal" defaultMode="personal" onAdd={(input) => os.addTask(input)} compact />
    </section>
  );
}

function formatHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
