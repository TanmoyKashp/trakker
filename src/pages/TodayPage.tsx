import { Clock } from "lucide-react";
import { todayISO } from "../hooks/useTrakkerOs";
import { findUnifiedNextAction, type UnifiedContext } from "../lib/nextAction";
import { entryTimeRange, formatTime12, getDayEntries, getScheduleSnapshot, sectionsLabel, toMinutes } from "../lib/time";
import type { TrakkerOs, TrakkerOsState } from "../hooks/useTrakkerOs";
import { QuickAddTask, TaskItem, UndoToast, useUndoableTaskDelete } from "../components/tasks/TaskComponents";
import { useNow } from "./HomePage";

interface Props {
  osState: TrakkerOsState;
  os: TrakkerOs;
}

/** "24 min left" / "1h 05m left" for an in-progress item; null when it has ended. */
function timeLeftLabel(endTime: string, nowT: string): string | null {
  const t = toMinutes(nowT);
  const end = toMinutes(endTime);
  if (t >= end) return null;
  const minsLeft = end - t;
  return minsLeft >= 60 ? `${Math.floor(minsLeft / 60)}h ${String(minsLeft % 60).padStart(2, "0")}m left` : `${minsLeft} min left`;
}

/** "Starts in 1h 29m" for an item later today; null once the time has passed. */
function startsInLabel(startTime: string, nowT: string): string | null {
  const t = toMinutes(nowT);
  const start = toMinutes(startTime);
  if (start <= t) return null;
  const mins = start - t;
  return mins >= 60 ? `Starts in ${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m` : `Starts in ${mins} min`;
}

export function TodayPage({ osState, os }: Props) {
  const now = useNow(); // shared 30s clock so "time left" updates naturally
  const snapshot = getScheduleSnapshot(now);
  const today = todayISO(now);
  const workDay = snapshot.workDayIndex;
  const entries = workDay !== null ? getDayEntries(workDay) : [];
  const nowT = snapshot.time;
  const { deleteTask, toast } = useUndoableTaskDelete(os);

  const todayMeetings = osState.meetings
    .filter((m) => m.date === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const todayTasks = osState.tasks.filter((task) => !task.completed && task.dueDate === today);

  const ctx: UnifiedContext = {
    mode: "work",
    now: snapshot.now,
    current: snapshot.current ? { entry: snapshot.current, timeRange: entryTimeRange(snapshot.current) } : null,
    next: snapshot.next
      ? { entry: snapshot.next.entry, timeRange: entryTimeRange(snapshot.next.entry), dayLabel: snapshot.next.dayLabel }
      : null,
    officeHoursActive: snapshot.officeHoursActive,
    breakLabel: snapshot.break?.label ?? null,
    tasks: osState.tasks.filter((t) => t.mode === "work"),
    meetings: osState.meetings.filter((m) => m.mode === "work"),
    routines: osState.routines.filter((r) => r.mode === "work"),
    routineCompletions: osState.routineCompletions,
    workout: { enabled: false, startTime: "17:00" },
    phdApplications: [],
    phdTree: [],
  };
  const action = findUnifiedNextAction(ctx);

  // Schedule items carry their numeric start/end minutes so the list sorts
  // chronologically (the previous string sort compared formatted labels like
  // "12:35–2:20 PM") and can show live time context.
  const scheduleItems: { id: string; title: string; detail: string; time: string; startMin: number; endMin: number; now: boolean }[] = [
    ...entries.map((entry) => ({
      id: entry.id,
      title: entry.subject,
      detail: [sectionsLabel(entry), entry.batch, entry.room].filter(Boolean).join(" · "),
      time: entryTimeRange(entry),
      startMin: toMinutes(entry.startTime),
      endMin: toMinutes(entry.endTime),
      now: snapshot.current?.id === entry.id,
    })),
    ...todayMeetings.map((meeting) => ({
      id: meeting.id,
      title: meeting.title,
      detail: ["Meeting", meeting.location].filter(Boolean).join(" · "),
      time: `${formatTime12(meeting.startTime)}–${formatTime12(meeting.endTime)}`,
      startMin: toMinutes(meeting.startTime),
      endMin: toMinutes(meeting.endTime),
      now: false,
    })),
  ].sort((a, b) => a.startMin - b.startMin);

  // Live context: the running item's remaining time, and the next thing ahead.
  const currentItem = scheduleItems.find((item) => item.startMin <= toMinutes(nowT) && toMinutes(nowT) < item.endMin);
  const nextItem = scheduleItems.find((item) => item.startMin > toMinutes(nowT));

  return (
    <section className="page-enter mx-auto max-w-3xl px-4 py-5 sm:px-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Today · {snapshot.dayName}</h1>
        <p className="mt-1 text-sm text-stone-500">{formatTime12(nowT)} · local time</p>
      </header>

      <div className="mb-4 rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{action.label}</div>
        <div className="mt-2 text-2xl font-semibold">{action.title}</div>
        {action.subtitle && <div className="mt-1 text-sm text-stone-600">{action.subtitle}</div>}
        {action.time && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)]">
            <Clock size={14} /> {action.time}
          </div>
        )}
        {currentItem && !action.time && <div className="mt-1 text-sm text-stone-500">{timeLeftLabel(minutesToHHMM(currentItem.endMin), nowT)}</div>}
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Schedule</h2>
      <div className="mb-5 space-y-2">
        {scheduleItems.length ? (
          scheduleItems.map((item) => {
            const left = item.now ? timeLeftLabel(minutesToHHMM(item.endMin), nowT) : null;
            const startsIn = !currentItem && item === nextItem ? startsInLabel(minutesToHHMM(item.startMin), nowT) : null;
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                  item.now ? "border-[var(--primary)] bg-[var(--primary-tint)]" : "border-stone-300/70 bg-[#FFFCF7]"
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{item.title}</div>
                  <div className="truncate text-xs text-stone-500">{item.detail}</div>
                  {left && <div className="text-xs font-medium text-[var(--primary)]">{left}</div>}
                  {startsIn && <div className="text-xs text-stone-500">{startsIn}</div>}
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs text-stone-500">
                  <Clock size={13} />
                  {item.time}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-3 text-sm text-stone-500">
            {workDay === null
              ? "No work timetable on weekends."
              : nextItem
                ? `Nothing scheduled until ${formatTime12(minutesToHHMM(nextItem.startMin))}`
                : "No classes scheduled today."}
          </div>
        )}
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Tasks due today</h2>
      <div className="mb-4 rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-3">
        {todayTasks.length ? (
          <div className="divide-y divide-stone-200/80">
            {todayTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={(id) => os.updateTask(id, { completed: !task.completed })}
                onDelete={deleteTask}
                showContext={false}
                dueDisplay="hide"
              />
            ))}
          </div>
        ) : (
          <div className="text-sm text-stone-500">No tasks due today.</div>
        )}
      </div>
      <div className="mb-5">
        <QuickAddTask mode="work" defaultMode="work" onAdd={(input) => os.addTask(input)} compact />
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Meetings today</h2>
      <div className="rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-3">
        {todayMeetings.length ? (
          <div className="space-y-2">
            {todayMeetings.map((meeting) => (
              <div key={meeting.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{meeting.title}</span>
                  <span className="text-stone-500">
                    {" "}
                    · {formatTime12(meeting.startTime)}–{formatTime12(meeting.endTime)}
                  </span>
                  {meeting.location && <span className="text-stone-500"> · {meeting.location}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => os.deleteMeeting(meeting.id)}
                  aria-label={`Delete meeting ${meeting.title}`}
                  className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-stone-400 hover:bg-rose-50 hover:text-rose-700"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-stone-500">No meetings today.</div>
        )}
      </div>

      {toast && <UndoToast message={toast.message} onUndo={toast.onUndo} />}
    </section>
  );
}

/** "HH:MM" back from minutes-since-midnight (for the time-context helpers). */
function minutesToHHMM(mins: number): string {
  return `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}
