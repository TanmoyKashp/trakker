import { useState } from "react";
import { type TrakkerOs, type TrakkerOsState } from "../hooks/useTrakkerOs";
import type { Goal } from "../types";

const HORIZONS: { value: Goal["horizon"]; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "term", label: "This term" },
];

export function GoalsPage({ osState, os }: { osState: TrakkerOsState; os: TrakkerOs }) {
  const [title, setTitle] = useState("");
  const [horizon, setHorizon] = useState<Goal["horizon"]>("week");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    os.addGoal(trimmed, horizon);
    setTitle("");
  }

  return (
    <section className="page-enter mx-auto max-w-3xl px-4 py-5 sm:px-6">
      <header className="mb-4">
        <div className="text-xs font-semibold tracking-[0.22em] text-stone-500">TRAKKER</div>
        <h1 className="text-2xl font-semibold">Goals</h1>
        <p className="mt-1 text-sm text-stone-500">A small set of outcomes worth moving toward. Keep it short.</p>
      </header>

      <form onSubmit={submit} className="card-shadow mb-5 grid gap-2 rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-3 sm:grid-cols-[1fr_auto_auto]">
        <input
          className="focus-ring min-h-11 rounded-md border border-stone-300 px-3 text-sm"
          placeholder="Add a goal…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Goal title"
        />
        <select
          className="focus-ring min-h-11 rounded-md border border-stone-300 px-2 text-sm"
          value={horizon}
          onChange={(e) => setHorizon(e.target.value as Goal["horizon"])}
          aria-label="Goal horizon"
        >
          {HORIZONS.map((h) => (
            <option key={h.value} value={h.value}>
              {h.label}
            </option>
          ))}
        </select>
        <button type="submit" className="focus-ring min-h-11 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)]">
          Add
        </button>
      </form>

      {HORIZONS.map((h) => {
        const goals = osState.goals.filter((goal) => goal.horizon === h.value);
        if (!goals.length) return null;
        return (
          <div key={h.value} className="mb-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">{h.label}</h2>
            <div className="card-shadow card-shadow-hover rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-3">
              <div className="divide-y divide-stone-200/80">
                {goals.map((goal) => (
                  <div key={goal.id} className="flex items-center gap-3 px-1 py-2">
                    <button
                      type="button"
                      aria-label={goal.done ? "Mark goal not done" : "Mark goal done"}
                      onClick={() => os.updateGoal(goal.id, { done: !goal.done })}
                      className={`focus-ring flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                        goal.done ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-stone-400 text-transparent hover:border-[var(--primary)]"
                      }`}
                    >
                      ✓
                    </button>
                    <div className={`min-w-0 flex-1 truncate text-sm ${goal.done ? "text-stone-400 line-through" : ""}`}>{goal.title}</div>
                    <button
                      type="button"
                      onClick={() => os.deleteGoal(goal.id)}
                      className="focus-ring rounded p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-700"
                      aria-label={`Delete goal ${goal.title}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {!osState.goals.length && (
        <div className="rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-8 text-center text-stone-600">No goals yet. Add your first one above.</div>
      )}
    </section>
  );
}
