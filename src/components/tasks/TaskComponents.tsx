import { useCallback, useEffect, useRef, useState } from "react";
import type { Mode, Task, TaskPriority } from "../../types";
import { formatRelativeDue, shortDate } from "../../lib/dates";
import { formatTime12 } from "../../lib/time";
import { todayISO, type TrakkerOs } from "../../hooks/useTrakkerOs";

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

export function TaskItem({
  task,
  onToggle,
  onDelete,
  showContext = true,
  dueDisplay = "relative",
}: {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  /** False inside mode-scoped views, where repeating "Work"/"Personal" is noise. */
  showContext?: boolean;
  /** "hide" inside a DUE TODAY section; "date" inside the Overdue section. */
  dueDisplay?: "relative" | "hide" | "date";
}) {
  const today = todayISO();

  // Subtle, theme-colored priority hint — never a loud pill. Medium stays silent.
  const priorityMark =
    task.priority === "high" ? (
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--primary)]" aria-label="High priority">
        High
      </span>
    ) : task.priority === "low" ? (
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-stone-400" aria-label="Low priority">
        Low
      </span>
    ) : null;

  return (
    <div className="flex items-center gap-1.5 px-0.5 py-2">
      <button
        type="button"
        aria-label={task.completed ? "Mark task incomplete" : "Mark task complete"}
        onClick={() => onToggle(task.id)}
        className={`focus-ring flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${
          task.completed ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-stone-400 text-transparent hover:border-[var(--primary)]"
        }`}
      >
        <span className={task.completed ? "check-pop" : undefined}>✓</span>
      </button>
      <div className="min-w-0 flex-1">
        <div className={`task-title line-clamp-2 text-sm leading-snug ${task.completed ? "text-stone-400 line-through" : "text-[#242424]"}`}>{task.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-500">
          {task.dueDate && dueDisplay !== "hide" && (
            <span>
              {dueDisplay === "date" ? shortDate(task.dueDate) : formatRelativeDue(task.dueDate, today)}
              {task.dueTime ? ` · ${formatTime12(task.dueTime)}` : ""}
            </span>
          )}
          {task.dueDate && dueDisplay === "hide" && task.dueTime && <span>{formatTime12(task.dueTime)}</span>}
          {showContext && <span>{task.mode === "work" ? "Work" : "Personal"}</span>}
          {priorityMark}
        </div>
      </div>
      {/* Small visible icon on a ~44px touch target; deletion stays immediate. */}
      <button
        type="button"
        aria-label={`Delete task ${task.title}`}
        onClick={() => onDelete(task.id)}
        className="focus-ring -mr-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-400 hover:bg-rose-50 hover:text-rose-700"
      >
        <span className="text-sm leading-none">✕</span>
      </button>
    </div>
  );
}

// ===== Lightweight "Deleted · Undo" toast =====

const TOAST_MS = 5_000;

/**
 * Wraps `os.deleteTask` with a small undo window. Deletion is still immediate;
 * Undo re-inserts the task with the same content (a fresh id, so nothing else
 * needs to track it). Only the most recent deletion can be undone.
 */
export function useUndoableTaskDelete(os: TrakkerOs) {
  const [pending, setPending] = useState<Task | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const deleteTask = useCallback(
    (id: string) => {
      const task = os.os.tasks.find((t) => t.id === id);
      os.deleteTask(id);
      if (!task) return;
      clearTimer();
      setPending(task);
      timerRef.current = setTimeout(() => setPending(null), TOAST_MS);
    },
    [os, clearTimer],
  );

  const undo = useCallback(() => {
    if (!pending) return;
    clearTimer();
    os.addTask(pending);
    setPending(null);
  }, [pending, os, clearTimer]);

  const toast = pending ? { message: "Deleted", onUndo: undo } : null;
  return { deleteTask, toast };
}

export function UndoToast({ message, onUndo }: { message: string; onUndo: () => void }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] z-20 flex justify-center px-4 lg:bottom-6"
      role="status"
      aria-live="polite"
    >
      <div className="toast-in pointer-events-auto card-shadow flex items-center gap-3 rounded-lg border border-stone-300/70 bg-[#242424] px-4 py-2.5 text-sm text-[#F7F3ED]">
        <span>{message}</span>
        <button type="button" onClick={onUndo} className="focus-ring rounded font-semibold uppercase tracking-wide text-[var(--accent)] hover:opacity-80">
          Undo
        </button>
      </div>
    </div>
  );
}
