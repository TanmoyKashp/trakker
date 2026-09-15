import { useState } from "react";
import type { Mode, Task, TaskPriority } from "../../types";
import { formatTime12 } from "../../lib/time";
import { Badge } from "../ui/Badge";

export function QuickAddTask({
  mode,
  defaultMode,
  onAdd,
  compact = false,
}: {
  mode: Mode;
  defaultMode?: Mode;
  onAdd: (input: { title: string; mode: Mode; dueDate: string | null; dueTime: string | null; priority: TaskPriority }) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [taskMode, setTaskMode] = useState<Mode>(defaultMode ?? mode);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd({ title: trimmed, mode: taskMode, dueDate: dueDate || null, dueTime: dueTime || null, priority });
    setTitle("");
    setDueDate("");
    setDueTime("");
    setPriority("medium");
    if (compact) setOpen(false);
  }

  return (
    <form onSubmit={submit} className="card-shadow rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-3">
      {open || !compact ? (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <input
            className="focus-ring min-h-11 w-full rounded-md border border-stone-300 px-3 text-sm"
            placeholder="Add a task…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Task title"
          />
          <select
            className="focus-ring min-h-11 rounded-md border border-stone-300 px-2 text-sm"
            value={taskMode}
            onChange={(e) => setTaskMode(e.target.value as Mode)}
            aria-label="Task context"
          >
            <option value="work">Work</option>
            <option value="personal">Personal</option>
          </select>
          <select
            className="focus-ring min-h-11 rounded-md border border-stone-300 px-2 text-sm"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            aria-label="Priority"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              className="focus-ring min-h-11 rounded-md border border-stone-300 px-2 text-sm"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              aria-label="Due date"
            />
            <input
              type="time"
              className="focus-ring min-h-11 rounded-md border border-stone-300 px-2 text-sm"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              aria-label="Due time"
            />
            <button type="submit" className="focus-ring min-h-11 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)]">
              Add
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="focus-ring min-h-11 w-full rounded-md border border-dashed border-stone-300 px-3 text-left text-sm text-stone-500 hover:border-[var(--primary)]/40 hover:text-stone-700"
        >
          + Add a task
        </button>
      )}
    </form>
  );
}

export function TaskItem({ task, onToggle, onDelete }: { task: Task; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <button
        type="button"
        aria-label={task.completed ? "Mark task incomplete" : "Mark task complete"}
        onClick={() => onToggle(task.id)}
        className={`focus-ring flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
          task.completed ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-stone-400 text-transparent hover:border-[var(--primary)]"
        }`}
      >
        ✓
      </button>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm ${task.completed ? "text-stone-400 line-through" : "text-[#242424]"}`}>{task.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-stone-500">
          {task.dueDate && <span>Due {task.dueDate}{task.dueTime ? ` · ${formatTime12(task.dueTime)}` : ""}</span>}
          {task.mode === "work" ? <span>Work</span> : <span>Personal</span>}
        </div>
      </div>
      <Badge tone={task.priority === "high" ? "red" : task.priority === "medium" ? "yellow" : "gray"}>{task.priority}</Badge>
      <button
        type="button"
        aria-label={`Delete task ${task.title}`}
        onClick={() => onDelete(task.id)}
        className="focus-ring rounded p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-700"
      >
        ✕
      </button>
    </div>
  );
}
