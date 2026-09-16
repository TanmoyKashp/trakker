import type { TimetableEntry } from "../types";
export type { TimetableEntry };

export const OFFICE_HOURS = { start: "08:45", end: "16:15" };

export const MORNING_BREAK = { start: "10:40", end: "10:50" };
export const AFTERNOON_BREAK = { start: "14:20", end: "14:30" };

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export const TIMETABLE: TimetableEntry[] = [];
