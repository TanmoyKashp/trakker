import { Clock } from "lucide-react";
import { todayISO } from "../hooks/useTrakkerOs";
import { findUnifiedNextAction, type UnifiedContext } from "../lib/nextAction";
import { entryTimeRange, formatTime12, getDayEntries, getScheduleSnapshot, sectionsLabel } from "../lib/time";
import type { TrakkerOs, TrakkerOsState } from "../hooks/useTrakkerOs";
import type { Application, TreeNodeRecord } from "../types";
import { QuickAddTask, TaskItem } from "../components/tasks/TaskComponents";

interface Props {
  applications: Application[];
  tree: TreeNodeRecord[];
  osState: TrakkerOsState;
  os: TrakkerOs;
}

export function TodayPage({ applications, tree, osState, os }: Props) {
  const snapshot = getScheduleSnapshot();
  const today = todayISO();
  const workDay = snapshot.workDayIndex;
  const entries = workDay !== null ? getDayEntries(workDay) : [];
  const nowT = snapshot.time;

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
    tasks: osState.tasks,
    meetings: osState.meetings,
    routines: osState.routines,
    routineCompletions: osState.routineCompletions,
    workout: osState.workout,
    phdApplications: applications,
    phdTree: tree,
  };
  const action = findUnifiedNextAction(ctx);

  const scheduleItems: { id: string; title: string; detail: string; time: string; now: boolean }[] = [
    ...entries.map((entry) => ({
      id: entry.id,
      title: entry.subject,
      detail: [sectionsLabel(entry), entry.batch, entry.room].filter(Boolean).join(" · "),
      time: entryTimeRange(entry),
      now: snapshot.current?.id === entry.id,
    })),
    ...todayMeetings.map((meeting) => ({
      id: meeting.id,
      title: meeting.title,
      detail: ["Meeting", meeting.location].filter(Boolean).join(" · "),
      time: `${formatTime12(meeting.startTime)}–${formatTime12(meeting.endTime)}`,
      now: false,
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <section className="page-enter mx-auto max-w-3xl px-4 py-5 sm:px-6">
      <header className="mb-4">
        <div className="text-xs font-semibold tracking-[0.22em] text-stone-500">TRAKKER</div>
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
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Schedule</h2>
      <div className="mb-5 space-y-2">
        {scheduleItems.length ? (
          scheduleItems.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                item.now ? "border-[var(--primary)] bg-[var(--primary-tint)]" : "border-stone-300/70 bg-[#FFFCF7]"
              }`}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{item.title}</div>
                <div className="truncate text-xs text-stone-500">{item.detail}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs text-stone-500">
                <Clock size={13} />
                {item.time}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-3 text-sm text-stone-500">
            {workDay === null ? "No work timetable on weekends." : "No classes scheduled today."}
          </div>
        )}
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Tasks due today</h2>
      <div className="mb-4 rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-3">
        {todayTasks.length ? (
          <div className="divide-y divide-stone-200/80">
            {todayTasks.map((task) => (
              <TaskItem key={task.id} task={task} onToggle={(id) => os.updateTask(id, { completed: !task.completed })} onDelete={os.deleteTask} />
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
              <div key={meeting.id} className="text-sm">
                <span className="font-medium">{meeting.title}</span>
                <span className="text-stone-500">
                  {" "}
                  · {formatTime12(meeting.startTime)}–{formatTime12(meeting.endTime)}
                </span>
                {meeting.location && <span className="text-stone-500"> · {meeting.location}</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-stone-500">No meetings today.</div>
        )}
      </div>
    </section>
  );
}
