import { deadlineState, formatDate } from "./dates";
import { dateToHHMM, sectionsLabel, toMinutes } from "./time";
import { todayISO } from "../hooks/useTrakkerOs";
import type { Application, ApplicationTask, Meeting, Mode, Routine, Task, TreeNodeRecord } from "../types";

const terminalStages = new Set(["accepted", "rejected", "expired", "withdrawn"]);

export interface NextAction {
  kind: "application" | "tree" | "done";
  title: string;
  context?: string;
  urgency?: string;
  href?: string;
  taskId?: string;
  application?: Application;
}

export function firstIncompleteRequiredTask(app: Application): ApplicationTask | undefined {
  return app.tasks?.find((task) => task.required && task.status !== "completed" && task.status !== "not-applicable");
}

export function findNextAction(applications: Application[] = [], tree: TreeNodeRecord[] = []): NextAction {
  const safeApps = Array.isArray(applications) ? applications : [];
  const safeTree = Array.isArray(tree) ? tree : [];

  const appAction = safeApps
    .map((app) => ({ app, task: firstIncompleteRequiredTask(app), deadline: deadlineState(app.deadline, app.deadlineText, app.sourceStatus) }))
    .filter((item): item is { app: Application; task: ApplicationTask; deadline: ReturnType<typeof deadlineState> } => Boolean(item.task) && !terminalStages.has(item.app.stage))
    .sort((a, b) => actionScore(a.app, a.deadline.days) - actionScore(b.app, b.deadline.days))[0];

  if (appAction?.task) {
    return {
      kind: "application",
      title: appAction.task.title,
      context: `${appAction.app.opportunity} · ${appAction.app.institution}`,
      urgency: `${appAction.deadline.label}${appAction.app.deadline ? ` · ${formatDate(appAction.app.deadline)}` : ""}`,
      href: `/applications/${appAction.app.id}#task-${appAction.task.id}`,
      taskId: appAction.task.id,
      application: appAction.app,
    };
  }

  const treeTask = safeTree.find((node) => !safeTree.some((child) => child.parentId === node.id) && node.status !== "completed" && node.status !== "not-applicable");
  if (treeTask) {
    return {
      kind: "tree",
      title: treeTask.title,
      context: "Application Tree",
      urgency: treeTask.priority ? `${treeTask.priority} preparation task` : "Preparation task",
      href: `/tree?node=${encodeURIComponent(treeTask.id)}`,
    };
  }

  return { kind: "done", title: "You're up to date." };
}

export function nextDeadline(applications: Application[] = []) {
  const safeApps = Array.isArray(applications) ? applications : [];
  return safeApps
    .map((app) => ({ app, deadline: deadlineState(app.deadline, app.deadlineText, app.sourceStatus) }))
    .filter(({ app, deadline }) => app.deadline && !terminalStages.has(app.stage) && Number.isFinite(deadline.days))
    .sort((a, b) => a.deadline.days - b.deadline.days)[0];
}

function actionScore(app: Application, days: number) {
  const deadlineScore = Number.isFinite(days) ? Math.max(days, -10) : 60;
  const sourceBoost = app.sourceStatus?.toLowerCase().includes("urgent") ? -15 : 0;
  const stageBoost = ({
    ready: -8,
    preparing: -6,
    researching: -3,
    submitted: 20,
    interview: 25,
    offer: 30,
    "not-started": 0,
    accepted: 10,
    rejected: 10,
    expired: 10,
    withdrawn: 10,
  } satisfies Record<Application["stage"], number>)[app.stage] ?? 10;
  return deadlineScore + sourceBoost + stageBoost + Number(app.sourcePriority ?? 9) * 0.5;
}

// ===== Unified engine (V2) =====

export interface UnifiedNextAction {
  /** label rendered above the title: CURRENT / NEXT / NEXT TASK / WORKOUT / … */
  label: string;
  title: string;
  subtitle?: string;
  kind:
    | "class-current"
    | "class-next"
    | "break"
    | "task-overdue"
    | "task-due"
    | "task"
    | "meeting"
    | "routine"
    | "workout"
    | "phd"
    | "free"
    | "done";
  time?: string;
  urgency?: string;
  href?: string;
}

export interface UnifiedContext {
  mode: Mode;
  now: Date;
  current: { entry: TimetableEntryLike; timeRange: string } | null;
  next: { entry: TimetableEntryLike; timeRange: string; dayLabel: string } | null;
  officeHoursActive: boolean;
  breakLabel: string | null;
  tasks: Task[];
  meetings: Meeting[];
  routines: Routine[];
  routineCompletions: Record<string, string>;
  workout: { enabled: boolean; startTime: string };
  phdApplications: Application[];
  phdTree: TreeNodeRecord[];
}

interface TimetableEntryLike {
  id: string;
  subject: string;
  courseCode?: string | null;
  sections?: string[];
  batch?: string | null;
  room: string;
  startTime: string;
  endTime: string;
}

export function findUnifiedNextAction(ctx: UnifiedContext): UnifiedNextAction {
  const now = ctx.now;
  const today = todayISO(now);
  const t = toMinutes(dateToHHMM(now));

  const openTasks = ctx.tasks.filter((task) => !task.completed);
  const overdue = openTasks
    .filter((task) => task.mode === ctx.mode && task.dueDate && task.dueDate < today)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "") || priorityRank(b) - priorityRank(a));
  const dueToday = openTasks
    .filter((task) => task.mode === ctx.mode && task.dueDate === today)
    .sort((a, b) => (a.dueTime ?? "99:99").localeCompare(b.dueTime ?? "99:99") || priorityRank(b) - priorityRank(a));

  // 1. A class is happening right now → it is the answer (Work Mode only).
  if (ctx.current && ctx.mode === "work") {
    return {
      kind: "class-current",
      label: "CURRENT",
      title: ctx.current.entry.subject,
      subtitle: subLabel(ctx.current.entry),
      time: classTime(ctx.current.entry, ctx.current.timeRange),
    };
  }

  // 2. Break windows are transitions, not obligations (Work context only).
  if (ctx.breakLabel && ctx.mode === "work") {
    const nextUp = dueToday[0] ?? overdue[0];
    if (nextUp) return taskAction(nextUp, "DURING BREAK");
    return { kind: "break", label: "BREAK", title: ctx.breakLabel, subtitle: "No class right now" };
  }

  // 3. Overdue tasks in the current mode only (strict mode isolation).
  if (overdue[0]) return taskAction(overdue[0], "OVERDUE");

  // 4. Due today with a time already past or imminent.
  const dueNow = dueToday.find((task) => task.dueTime && t >= toMinutes(task.dueTime));
  if (dueNow) return taskAction(dueNow, "DUE NOW");

  // 5. Workout moment (Personal Mode only — it is a personal appointment).
  const workoutReady = ctx.workout.enabled && t >= toMinutes(ctx.workout.startTime) && t < toMinutes(ctx.workout.startTime) + 180;
  if (workoutReady && ctx.mode === "personal") {
    return { kind: "workout", label: "WORKOUT", title: "Workout", time: `${formatHHMM(ctx.workout.startTime)}`, urgency: "Starts now", href: "/workout" };
  }

  // 6. Next scheduled class vs imminent task/meeting — whichever comes first.
  const nextClassMinutes = ctx.next && ctx.next.dayLabel === "Today" ? classStartMinutes(ctx.next.entry) : Number.POSITIVE_INFINITY;
  const nextMeeting = upcomingMeeting(ctx, now);
  const nextTask = dueToday.find((task) => task.dueTime && toMinutes(task.dueTime) > t);
  const candidates: { at: number; action: UnifiedNextAction }[] = [];
  if (Number.isFinite(nextClassMinutes) && ctx.mode === "work") {
    candidates.push({
      at: nextClassMinutes,
      action: {
        kind: "class-next",
        label: "NEXT",
        title: ctx.next!.entry.subject,
        subtitle: subLabel(ctx.next!.entry),
        time:
          ctx.next!.dayLabel === "Today"
            ? classTime(ctx.next!.entry, ctx.next!.timeRange)
            : `${ctx.next!.dayLabel} · ${classTime(ctx.next!.entry, ctx.next!.timeRange)}`,
      },
    });
  }
  if (nextMeeting) {
    candidates.push({
      at: meetingMinutes(nextMeeting),
      action: {
        kind: "meeting",
        label: "MEETING",
        title: nextMeeting.title,
        subtitle: nextMeeting.location || undefined,
        time: `${formatHHMM(nextMeeting.startTime)}–${formatHHMM(nextMeeting.endTime)}`,
        urgency: "Upcoming",
      },
    });
  }
  if (nextTask) {
    candidates.push({ at: toMinutes(nextTask.dueTime!), action: { ...taskAction(nextTask, "NEXT TASK"), urgency: `Due ${formatHHMM(nextTask.dueTime!)}` } });
  }
  if (candidates.length) {
    candidates.sort((a, b) => a.at - b.at);
    return candidates[0].action;
  }

  // 7. Current routine window (closest enabled routine whose start has passed).
  const routine = currentRoutine(ctx, now);
  if (routine && ctx.mode === routine.mode) {
    return {
      kind: "routine",
      label: "ROUTINE",
      title: routine.title,
      time: formatHHMM(routine.startTime),
      urgency: "Scheduled for now",
    };
  }

  // 8. Due-today tasks without a specific time.
  if (dueToday[0]) return taskAction(dueToday[0], "DUE TODAY");

  // 9. PhD next action — Personal Mode only. Never surfaces in Work Mode.
  if (ctx.mode === "personal") {
    const phd = findNextAction(ctx.phdApplications, ctx.phdTree);
    if (phd.kind !== "done") {
      return { kind: "phd", label: "PHD", title: phd.title, subtitle: phd.context, urgency: phd.urgency, href: phd.href };
    }
  }

  // 10. Nothing scheduled — free context.
  if (ctx.mode === "work") {
    if (ctx.next) {
      return {
        kind: "free",
        label: "FREE TIME",
        title: "No class right now",
        subtitle: `Next: ${ctx.next.entry.subject} · ${ctx.next.dayLabel === "Today" ? "" : `${ctx.next.dayLabel} `}${ctx.next.timeRange}`,
      };
    }
    return { kind: "done", label: "WORK", title: "You're up to date." };
  }
  return { kind: "done", label: "PERSONAL", title: "You're up to date." };
}

function priorityRank(task: Task) {
  return task.priority === "high" ? 3 : task.priority === "medium" ? 2 : 1;
}

function subLabel(entry: TimetableEntryLike) {
  const parts = [sectionsLabel(entry as never), entry.batch].filter(Boolean);
  return parts.join(" · ");
}

/** "12:35–2:20 PM · DIVL03a" — time and room together, per Home layout. */
function classTime(entry: TimetableEntryLike, timeRange: string): string {
  return `${timeRange} · ${entry.room}`;
}

function taskAction(task: Task, label: string): UnifiedNextAction {
  const time = task.dueTime ? formatHHMM(task.dueTime) : task.dueDate === todayISO(new Date()) ? "Today" : undefined;
  return {
    kind: task.priority === "high" ? "task-due" : "task",
    label,
    title: task.title,
    subtitle: task.mode === "work" ? "Work task" : "Personal task",
    time,
    urgency: task.priority === "high" ? "High priority" : undefined,
    href: task.mode === "work" ? "/tasks" : "/daily",
  };
}

function classStartMinutes(entry: { startTime: string }): number {
  return toMinutes(entry.startTime);
}

function meetingMinutes(meeting: Meeting): number {
  return toMinutes(meeting.startTime);
}

function upcomingMeeting(ctx: UnifiedContext, now: Date): Meeting | null {
  const today = todayISO(now);
  const t = toMinutes(dateToHHMM(now));
  return (
    ctx.meetings
      .filter((m) => m.mode === ctx.mode && (m.date > today || (m.date === today && toMinutes(m.startTime) > t)))
      .sort((a, b) => a.date.localeCompare(b.date) || toMinutes(a.startTime) - toMinutes(b.startTime))[0] ?? null
  );
}

function currentRoutine(ctx: UnifiedContext, now: Date): Routine | null {
  const today = todayISO(now);
  const dayIdx = (now.getDay() + 6) % 7; // 0 = Monday
  const t = toMinutes(dateToHHMM(now));
  return (
    ctx.routines
      .filter((r) => r.enabled && r.mode === ctx.mode && r.daysOfWeek.includes(dayIdx) && toMinutes(r.startTime) <= t)
      .filter((r) => !ctx.routineCompletions[`${r.id}:${today}`])
      .sort((a, b) => toMinutes(b.startTime) - toMinutes(a.startTime))[0] ?? null
  );
}

function formatHHMM(hhmm: string): string {
  const minutes = toMinutes(hhmm);
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const meridiem = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${meridiem}`;
}
