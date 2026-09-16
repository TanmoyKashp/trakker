import { useSyncExternalStore } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { formatRelativeDue } from "../lib/dates";
import { findUnifiedNextAction, nextDeadline, type UnifiedContext } from "../lib/nextAction";
import { dateToHHMM, entryTimeRange, formatTime12, getScheduleSnapshot, toMinutes } from "../lib/time";
import { todayISO } from "../hooks/useTrakkerOs";
import { VisualCalendar } from "../components/calendar/VisualCalendar";
import { QuickIdeas } from "../components/ideas/QuickIdeas";
import { DottedRabbit } from "../components/rabbit/DottedRabbit";
import type { Application, Mode, TrakkerOsState, TreeNodeRecord } from "../types";

interface Props {
  applications: Application[];
  tree: TreeNodeRecord[];
  os: TrakkerOsState;
  mode: Mode;
}

/** The single, strictly mode-isolated "what should I be doing now" engine call. */
export function buildModeContext(
  applications: Application[],
  tree: TreeNodeRecord[],
  os: TrakkerOsState,
  mode: Mode,
  now: Date = new Date(),
): UnifiedContext {
  const snapshot = getScheduleSnapshot(now, os.timetable);
  const isWork = mode === "work";

  return {
    mode,
    now: snapshot.now,
    current: isWork && snapshot.current ? { entry: snapshot.current, timeRange: entryTimeRange(snapshot.current) } : null,
    next:
      isWork && snapshot.next
        ? { entry: snapshot.next.entry, timeRange: entryTimeRange(snapshot.next.entry), dayLabel: snapshot.next.dayLabel }
        : null,
    officeHoursActive: isWork && snapshot.officeHoursActive,
    breakLabel: isWork ? (snapshot.break?.label ?? null) : null,
    tasks: os.tasks.filter((t) => t.mode === mode),
    meetings: isWork ? os.meetings.filter((m) => m.mode === "work") : [],
    routines: os.routines.filter((r) => r.mode === mode),
    routineCompletions: os.routineCompletions,
    workout: !isWork ? os.workout : { enabled: false, startTime: "17:00" },
    phdApplications: !isWork ? applications : [],
    phdTree: !isWork ? tree : [],
  };
}

interface UpNextItem {
  key: string;
  title: string;
  detail: string;
  when: string;
  href?: string;
}

/** "24 min left" / "1h 05m left" for an in-progress class; null when not running. */
function timeLeftLabel(endTime: string, now: Date): string | null {
  const t = toMinutes(dateToHHMM(now));
  const end = toMinutes(endTime);
  if (t >= end) return null;
  const minsLeft = end - t;
  return minsLeft >= 60 ? `${Math.floor(minsLeft / 60)}h ${String(minsLeft % 60).padStart(2, "0")}m left` : `${minsLeft} min left`;
}

/** "Starts in 1h 29m" / "Starts in 12 min" for a class later today; null otherwise. */
function startsInLabel(startTime: string, now: Date): string | null {
  const t = toMinutes(dateToHHMM(now));
  const start = toMinutes(startTime);
  if (start <= t) return null;
  const mins = start - t;
  return mins >= 60 ? `Starts in ${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m` : `Starts in ${mins} min`;
}

/** 1–3 upcoming items, strictly filtered by mode. */
function buildUpNext(ctx: UnifiedContext, applications: Application[]): UpNextItem[] {
  const items: UpNextItem[] = [];
  const now = ctx.now;
  const today = todayISO(now);
  const t = toMinutes(dateToHHMM(now));

  if (ctx.mode === "work") {
    // Next class (today or later in the week)
    if (ctx.next) {
      items.push({
        key: `class-${ctx.next.entry.id}`,
        title: ctx.next.entry.subject,
        detail: [ctx.next.dayLabel === "Today" ? null : ctx.next.dayLabel, ctx.next.timeRange, ctx.next.entry.room]
          .filter(Boolean)
          .join(" · "),
        when: ctx.next.dayLabel,
      });
    }
    // Next work meeting
    const meeting = ctx.meetings
      .filter((m) => m.mode === "work" && (m.date > today || (m.date === today && toMinutes(m.startTime) > t)))
      .sort((a, b) => a.date.localeCompare(b.date) || toMinutes(a.startTime) - toMinutes(b.startTime))[0];
    if (meeting) {
      items.push({
        key: `meeting-${meeting.id}`,
        title: meeting.title,
        detail: [meeting.date === today ? null : meeting.date, `${formatTime12(meeting.startTime)}–${formatTime12(meeting.endTime)}`, meeting.location ?? null]
          .filter(Boolean)
          .join(" · "),
        when: meeting.date === today ? "Today" : meeting.date,
        href: "/meetings",
      });
    }
    // Next work task with a due date
    const task = ctx.tasks
      .filter((task) => !task.completed && task.mode === "work" && task.dueDate && task.dueDate >= today)
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))[0];
    if (task) {
      items.push({
        key: `task-${task.id}`,
        title: task.title,
        detail: "Work task",
        when: formatRelativeDue(task.dueDate ?? today, today),
        href: "/tasks",
      });
    }
  } else {
    // Personal: PhD deadline first (Personal mode ONLY)
    const closing = nextDeadline(applications);
    if (closing) {
      items.push({
        key: `phd-${closing.app.id}`,
        title: closing.app.opportunity,
        detail: closing.app.institution,
        when: closing.deadline.label,
        href: `/applications/${closing.app.id}`,
      });
    }
    // Workout when still ahead today
    if (ctx.workout.enabled && t < toMinutes(ctx.workout.startTime)) {
      items.push({
        key: "workout",
        title: "Workout",
        detail: "Personal appointment",
        when: formatTime12(ctx.workout.startTime),
        href: "/workout",
      });
    }
    // Next personal routine still ahead today
    const dayIdx = (now.getDay() + 6) % 7; // 0 = Monday, matching routines
    const routine = ctx.routines
      .filter((r) => r.enabled && r.mode === "personal" && r.daysOfWeek.includes(dayIdx) && toMinutes(r.startTime) > t)
      .filter((r) => !ctx.routineCompletions[`${r.id}:${today}`])
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))[0];
    if (routine) {
      items.push({
        key: `routine-${routine.id}`,
        title: routine.title,
        detail: "Routine",
        when: formatTime12(routine.startTime),
        href: "/daily",
      });
    }
    // Next personal task
    const task = ctx.tasks
      .filter((task) => !task.completed && task.mode === "personal" && task.dueDate && task.dueDate >= today)
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))[0];
    if (task) {
      items.push({
        key: `ptask-${task.id}`,
        title: task.title,
        detail: "Personal task",
        when: formatRelativeDue(task.dueDate ?? today, today),
        href: "/daily",
      });
    }
  }

  return items.slice(0, 3);
}

/** Shared live clock: one 30s interval no matter how many components subscribe. */
const clockSubscribers = new Set<() => void>();
let clockTimer: ReturnType<typeof setInterval> | null = null;
let clockNow = new Date();

function subscribeToClock(onStoreChange: () => void): () => void {
  clockSubscribers.add(onStoreChange);
  if (!clockTimer) {
    clockTimer = setInterval(() => {
      clockNow = new Date();
      for (const notify of clockSubscribers) notify();
    }, 30_000);
  }
  return () => {
    clockSubscribers.delete(onStoreChange);
    if (clockSubscribers.size === 0 && clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  };
}

/** Shared 30s clock; Today reuses it so live times stay fresh without a second interval. */
export function useNow(): Date {
  return useSyncExternalStore(subscribeToClock, () => clockNow);
}

const WEEKDAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

export function HomePage({ applications, tree, os, mode }: Props) {
  const now = useNow();
  const ctx = buildModeContext(applications, tree, os, mode, now);
  const action = findUnifiedNextAction(ctx);
  const upNext = buildUpNext(ctx, applications);

  const dateLine = `${WEEKDAYS[now.getDay()]} · ${now.getDate()} ${MONTHS[now.getMonth()]}`;
  const timeLine = formatTime12(dateToHHMM(now));

  // Live time context for the hero: what's running now, and what follows it.
  const currentLeft = ctx.current ? timeLeftLabel(ctx.current.entry.endTime, now) : null;
  const nextStartsIn = ctx.next && ctx.next.dayLabel === "Today" ? startsInLabel(ctx.next.entry.startTime, now) : null;
  const freeUntil =
    !ctx.current && ctx.next && ctx.next.dayLabel === "Today" ? `Nothing scheduled until ${formatTime12(ctx.next.entry.startTime)}` : null;

  return (
    <section className="page-enter mx-auto max-w-2xl px-5 pb-10 pt-7">
      <div className="w-full">
        {/* Minimal Contextual Header with Animated Dotted Rabbit */}
        <header className="text-center">
          <div className="flex justify-center mb-2.5">
            <DottedRabbit size="md" />
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            {mode === "work" ? "WORK" : "PERSONAL"}
          </div>
          <div className="mt-1.5 font-serif text-2xl font-semibold tracking-wide text-[#242424]">
            {dateLine}
          </div>
          <div className="mt-0.5 text-sm text-stone-500">{timeLine}</div>
        </header>

        {/* Primary action — the answer to "what should I do now?" */}
        <div className="mx-auto mt-8 max-w-xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">YOUR NEXT THING TO DO</p>
          <div className="card-shadow card-shadow-hover rounded-xl border border-stone-300/70 bg-[#FFFCF7] p-6 text-left">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">{action.label}</div>
            <h2 className="text-balance mt-2 text-2xl font-semibold leading-tight">{action.title}</h2>
            {action.subtitle && <p className="mt-2 text-sm text-stone-600">{action.subtitle}</p>}
            {action.time && <p className="mt-3 text-base font-medium text-[var(--primary)]">{action.time}</p>}
            {currentLeft && <p className="mt-1 text-sm text-stone-500">{currentLeft}</p>}
            {freeUntil && <p className="mt-1 text-sm text-stone-500">{freeUntil}</p>}
            {nextStartsIn && !ctx.current && <p className="mt-1 text-sm text-stone-500">{nextStartsIn}</p>}
            {action.urgency && !currentLeft && !freeUntil && <p className="mt-2 text-sm text-stone-500">{action.urgency}</p>}
            {action.href && (
              <Link
                className="focus-ring mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:opacity-95 transition-opacity"
                style={{ backgroundColor: "var(--primary)" }}
                to={action.href}
              >
                DO IT <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </div>

        {/* Up Next List */}
        {upNext.length > 0 && (
          <div className="mx-auto mt-10 max-w-xl border-t border-stone-300/70 pt-6">
            <div className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">UP NEXT</div>
            <div className="mt-4 space-y-2">
              {upNext.map((item) => (
                <div
                  key={item.key}
                  className="card-shadow card-shadow-hover flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-[#FFFCF7] px-3.5 py-2.5 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {item.href ? (
                      <Link className="focus-ring rounded font-medium hover:text-[var(--primary)]" to={item.href}>
                        {item.title}
                      </Link>
                    ) : (
                      <span className="font-medium">{item.title}</span>
                    )}
                    {item.detail && <span className="text-stone-500"> · {item.detail}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-stone-500">{item.when}</span>
                  {item.href && <ChevronRight size={14} className="shrink-0 text-stone-400" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visual Calendar — dot grid time visualization */}
        <div className="mx-auto mt-10 max-w-xl border-t border-stone-300/70 pt-6">
          <VisualCalendar mode={mode} />
        </div>

        {/* Quick Ideas — Personal Mode ONLY */}
        {mode === "personal" && (
          <div className="mx-auto mt-10 max-w-xl border-t border-stone-300/70 pt-6">
            <QuickIdeas />
          </div>
        )}
      </div>
    </section>
  );
}
