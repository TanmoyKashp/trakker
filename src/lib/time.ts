import { AFTERNOON_BREAK, DAY_NAMES, MORNING_BREAK, OFFICE_HOURS, TIMETABLE, type TimetableEntry } from "./timetable";

/** Minutes since midnight for an "HH:MM" string. */
export function toMinutes(hhmm: string): number {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** "HH:MM" from a Date. */
export function dateToHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function getCurrentDay(now: Date = new Date()): string {
  return DAY_NAMES[now.getDay()];
}

export function getCurrentTime(now: Date = new Date()): string {
  return dateToHHMM(now);
}

/** 0–4 for Monday–Friday, null on weekends. */
export function getWorkDayIndex(now: Date = new Date()): number | null {
  const day = now.getDay();
  return day >= 1 && day <= 5 ? day - 1 : null;
}

export function formatTime12(hhmm: string): string {
  if (!hhmm) return "";
  const minutes = toMinutes(hhmm);
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const meridiem = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${meridiem}`;
}

/** "12:35–2:20 PM" — meridiem shown once when both times share it. */
export function formatTimeRange(start: string, end: string): string {
  if (!start || !end) return "";
  const startMeridiem = toMinutes(start) < 720 ? "AM" : "PM";
  const endMeridiem = toMinutes(end) < 720 ? "AM" : "PM";
  if (startMeridiem === endMeridiem) {
    const h24 = Math.floor(toMinutes(start) / 60);
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${(start.split(":")[1] || "00")}–${formatTime12(end)}`;
  }
  return `${formatTime12(start)}–${formatTime12(end)}`;
}

export function getDayEntries(dayIndex: number, timetableEntries?: TimetableEntry[]): TimetableEntry[] {
  const source = timetableEntries ?? TIMETABLE;
  return source
    .filter((entry) => entry.day === dayIndex && !entry.deletedAt)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
}

/** The class happening right now, or null. Class ends exactly at its end time. */
export function getCurrentScheduleItem(now: Date = new Date(), timetableEntries?: TimetableEntry[]): TimetableEntry | null {
  const workDay = getWorkDayIndex(now);
  if (workDay === null) return null;
  const t = toMinutes(dateToHHMM(now));
  return (
    getDayEntries(workDay, timetableEntries).find((entry) => t >= toMinutes(entry.startTime) && t < toMinutes(entry.endTime)) ?? null
  );
}

export interface UpcomingScheduleItem {
  entry: TimetableEntry;
  /** "Today" | "Tomorrow" | weekday name */
  dayLabel: string;
  daysAhead: number;
}

/** Next class starting strictly after `now`, looking ahead up to 7 days. */
export function getNextScheduleItem(now: Date = new Date(), timetableEntries?: TimetableEntry[]): UpcomingScheduleItem | null {
  const t = toMinutes(dateToHHMM(now));
  for (let ahead = 0; ahead < 8; ahead += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ahead);
    const workDay = getWorkDayIndex(date);
    if (workDay === null) continue;
    const entry = getDayEntries(workDay, timetableEntries).find((item) => ahead > 0 || toMinutes(item.startTime) > t);
    if (entry) {
      return {
        entry,
        daysAhead: ahead,
        dayLabel: ahead === 0 ? "Today" : ahead === 1 ? "Tomorrow" : DAY_NAMES[date.getDay()],
      };
    }
  }
  return null;
}

export function isOfficeHours(now: Date = new Date()): boolean {
  const workDay = getWorkDayIndex(now);
  if (workDay === null) return false;
  const t = toMinutes(dateToHHMM(now));
  return t >= toMinutes(OFFICE_HOURS.start) && t < toMinutes(OFFICE_HOURS.end);
}

/** Contextual break info; breaks are NOT classes or work obligations. */
export function getBreak(now: Date = new Date()): { label: string } | null {
  if (getWorkDayIndex(now) === null) return null;
  const t = toMinutes(dateToHHMM(now));
  if (t >= toMinutes(MORNING_BREAK.start) && t < toMinutes(MORNING_BREAK.end)) return { label: "Morning Break" };
  if (t >= toMinutes(AFTERNOON_BREAK.start) && t < toMinutes(AFTERNOON_BREAK.end)) return { label: "Afternoon Break" };
  return null;
}

export type WorkContext = "before-office" | "office" | "after-office" | "weekend";

/** Time-of-day context. Never switches Work/Personal mode; only informs prioritization. */
export function getWorkContext(now: Date = new Date()): WorkContext {
  if (getWorkDayIndex(now) === null) return "weekend";
  const t = toMinutes(dateToHHMM(now));
  if (t < toMinutes(OFFICE_HOURS.start)) return "before-office";
  if (t < toMinutes(OFFICE_HOURS.end)) return "office";
  return "after-office";
}

/** "8:50–9:45 AM" for an entry. */
export function entryTimeRange(entry: TimetableEntry): string {
  return formatTimeRange(entry.startTime, entry.endTime);
}

/** Human label for an entry's sections: "1MCA04" or "3MCA01–3MCA06" when contiguous. */
export function sectionsLabel(entry: TimetableEntry): string {
  if (entry.sections && entry.sections.length > 0) {
    if (entry.sections.length <= 2) return entry.sections.join(", ");
    const first = entry.sections[0];
    const last = entry.sections[entry.sections.length - 1];
    const prefixMatch = /^(.*?)(\d+)$/.exec(first);
    const lastMatch = /^(.*?)(\d+)$/.exec(last);
    if (prefixMatch && lastMatch && prefixMatch[1] === lastMatch[1]) {
      const startNum = Number(prefixMatch[2]);
      const endNum = Number(lastMatch[2]);
      if (endNum > startNum && endNum - startNum === entry.sections.length - 1) {
        return `${first}–${last}`;
      }
    }
    return entry.sections.join(", ");
  }
  return entry.batch ? `Batch ${entry.batch}` : "";
}

/** Full snapshot used by Home and the next-action engine. */
export function getScheduleSnapshot(now: Date = new Date(), timetableEntries?: TimetableEntry[]) {
  return {
    now,
    dayName: getCurrentDay(now),
    time: getCurrentTime(now),
    workDayIndex: getWorkDayIndex(now),
    workContext: getWorkContext(now),
    officeHoursActive: isOfficeHours(now),
    break: getBreak(now),
    current: getCurrentScheduleItem(now, timetableEntries),
    next: getNextScheduleItem(now, timetableEntries),
  };
}

export type ScheduleSnapshot = ReturnType<typeof getScheduleSnapshot>;
