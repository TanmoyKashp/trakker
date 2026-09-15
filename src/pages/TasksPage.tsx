import { useMemo, useState } from "react";
import { QuickAddTask, TaskItem } from "../components/tasks/TaskComponents";
import { todayISO, type TrakkerOs, type TrakkerOsState } from "../hooks/useTrakkerOs";
import type { Mode } from "../types";

export function TasksPage({ osState, os }: { osState: TrakkerOsState; os: TrakkerOs }) {
  const [filter, setFilter] = useState<Mode | "all">("all");
  const today = todayISO();

  const { overdue, dueToday, upcoming, noDate, completed } = useMemo(() => {
    const tasks = osState.tasks.filter((task) => (filter === "all" ? true : task.mode === filter));
    return {
      overdue: tasks.filter((t) => !t.completed && t.dueDate && t.dueDate < today),
      dueToday: tasks.filter((t) => !t.completed && t.dueDate === today),
      upcoming: tasks.filter((t) => !t.completed && t.dueDate && t.dueDate > today),
      noDate: tasks.filter((t) => !t.completed && !t.dueDate),
      completed: tasks.filter((t) => t.completed),
    };
  }, [osState.tasks, filter, today]);

  return (
    <section className="page-enter mx-auto max-w-3xl px-4 py-5 sm:px-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold tracking-[0.22em] text-stone-500">TRAKKER</div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
        </div>
        <select
          className="focus-ring min-h-10 rounded-md border border-stone-300 bg-[#FFFCF7] px-3 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value as Mode | "all")}
          aria-label="Filter tasks"
        >
          <option value="all">All contexts</option>
          <option value="work">Work</option>
          <option value="personal">Personal</option>
        </select>
      </header>

      <div className="mb-5">
        <QuickAddTask mode={filter === "all" ? "work" : filter} onAdd={(input) => os.addTask(input)} />
      </div>

      {overdue.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-rose-700">Overdue</h2>
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50/60 p-3">
            <div className="divide-y divide-rose-100">
              {overdue.map((task) => (
                <TaskItem key={task.id} task={task} onToggle={(id) => os.updateTask(id, { completed: true })} onDelete={os.deleteTask} />
              ))}
            </div>
          </div>
        </>
      )}

      {dueToday.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Due today</h2>
          <div className="card-shadow card-shadow-hover mb-4 rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-3">
            <div className="divide-y divide-stone-200/80">
              {dueToday.map((task) => (
                <TaskItem key={task.id} task={task} onToggle={(id) => os.updateTask(id, { completed: true })} onDelete={os.deleteTask} />
              ))}
            </div>
          </div>
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Upcoming</h2>
          <div className="card-shadow card-shadow-hover mb-4 rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-3">
            <div className="divide-y divide-stone-200/80">
              {upcoming.map((task) => (
                <TaskItem key={task.id} task={task} onToggle={(id) => os.updateTask(id, { completed: true })} onDelete={os.deleteTask} />
              ))}
            </div>
          </div>
        </>
      )}

      {noDate.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">No due date</h2>
          <div className="card-shadow card-shadow-hover mb-4 rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-3">
            <div className="divide-y divide-stone-200/80">
              {noDate.map((task) => (
                <TaskItem key={task.id} task={task} onToggle={(id) => os.updateTask(id, { completed: true })} onDelete={os.deleteTask} />
              ))}
            </div>
          </div>
        </>
      )}

      {completed.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Completed</h2>
          <div className="rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-3">
            <div className="divide-y divide-stone-200/80">
              {completed.map((task) => (
                <TaskItem key={task.id} task={task} onToggle={(id) => os.updateTask(id, { completed: false })} onDelete={os.deleteTask} />
              ))}
            </div>
          </div>
        </>
      )}

      {!overdue.length && !dueToday.length && !upcoming.length && !noDate.length && !completed.length && (
        <div className="rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-8 text-center text-stone-600">No tasks yet. Add your first one above.</div>
      )}
    </section>
  );
}
