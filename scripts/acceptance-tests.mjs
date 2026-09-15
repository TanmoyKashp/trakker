// Acceptance test runner for Trakker V2 timetable + time logic.
// Run with: node --experimental-strip-types scripts/acceptance-tests.mjs
// (Uses Node 22+ built-in TypeScript stripping; imports real source files directly.)
import { strict as assert } from "node:assert";

const { TIMETABLE } = await import("../src/lib/timetable.ts");
const time = await import("../src/lib/time.ts");
const { findUnifiedNextAction } = await import("../src/lib/nextAction.ts");

const { getCurrentScheduleItem, getNextScheduleItem, getBreak, getWorkContext, entryTimeRange, sectionsLabel } = time;

// Build a local Date for a given weekday name + time in the CURRENT week (safe: logic is day-of-week driven).
function at(dayName, hhmm) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = new Date();
  const target = days.indexOf(dayName);
  const delta = (target - today.getDay() + 7) % 7;
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + delta);
  const [h, m] = hhmm.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

function summarize(now) {
  const current = getCurrentScheduleItem(now);
  const next = getNextScheduleItem(now);
  const brk = getBreak(now);
  return {
    current: current ? `${current.subject} | ${sectionsLabel(current)} | ${current.batch ?? "-"} | ${current.room} | ${entryTimeRange(current)}` : null,
    next: next ? `${next.dayLabel} ${next.entry.subject} ${entryTimeRange(next.entry)}` : null,
    break: brk?.label ?? null,
    context: getWorkContext(now),
  };
}

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`  FAIL  ${name}\n        ${err.message}`);
  }
}

console.log("Timetable acceptance tests");

// TEST 1: Monday 1:00 PM
check("T1 Mon 13:00 → CURRENT Web Design Lab 1BCADS01 B2 DIVL03a", () => {
  const s = summarize(at("Monday", "13:00"));
  assert.match(s.current, /Web Design Lab/);
  assert.match(s.current, /1BCADS01/);
  assert.match(s.current, /B2/);
  assert.match(s.current, /DIVL03a/);
  assert.match(s.current, /12:35–2:20 PM/);
});

// TEST 2: Monday 2:15 PM — WDL still current, Node.js not shown
check("T2 Mon 14:15 → CURRENT Web Design Lab (not Node.js)", () => {
  const s = summarize(at("Monday", "14:15"));
  assert.match(s.current, /Web Design Lab/);
  assert.doesNotMatch(s.current, /Node\.js/);
});

// TEST 3: Monday 2:25 PM — WDL ended, Node.js upcoming (not started)
check("T3 Mon 14:25 → no current; NEXT Node.js (upcoming, not started)", () => {
  const s = summarize(at("Monday", "14:25"));
  assert.equal(s.current, null, "Web Design Lab must have ended");
  assert.match(s.next, /Node\.js/);
  assert.doesNotMatch(s.current ?? "", /Node\.js/);
});

// TEST 4: Monday 2:40 PM
check("T4 Mon 14:40 → CURRENT Node.js 3MCA01–3MCA06 C6 DFL03a 2:30–4:15 PM", () => {
  const s = summarize(at("Monday", "14:40"));
  assert.match(s.current, /Node\.js/);
  assert.match(s.current, /3MCA01–3MCA06/);
  assert.match(s.current, /C6/);
  assert.match(s.current, /DFL03a/);
  assert.match(s.current, /2:30–4:15 PM/);
});

// TEST 5: Monday 4:10 PM — Node.js still running
check("T5 Mon 16:10 → CURRENT Node.js (not ended before 4:15)", () => {
  const s = summarize(at("Monday", "16:10"));
  assert.match(s.current, /Node\.js/);
});

// TEST 6: Tuesday 9:15 AM
check("T6 Tue 09:15 → no current (ended 9:45 is later; 9:15 is DURING 8:50–9:45)", () => {
  const s = summarize(at("Tuesday", "09:15"));
  // 9:15 is inside 8:50–9:45 → current Data Structures 1MCA04 MT01
  assert.match(s.current, /Data Structures/);
  assert.match(s.current, /1MCA04/);
  assert.match(s.current, /MT01/);
  assert.match(s.current, /8:50–9:45 AM/);
});

// TEST 7: Tuesday 11:30 AM
check("T7 Tue 11:30 → CURRENT Data Structures 1MCA04 B1 LFL02", () => {
  const s = summarize(at("Tuesday", "11:30"));
  assert.match(s.current, /Data Structures/);
  assert.match(s.current, /1MCA04/);
  assert.match(s.current, /B1/);
  assert.match(s.current, /LFL02/);
  assert.match(s.current, /10:50 AM–1:25 PM/);
});

// TEST 8: Wednesday 9:00 AM
check("T8 Wed 09:00 → CURRENT Web Design Lab 1BCA04 B2 DIVL04a", () => {
  const s = summarize(at("Wednesday", "09:00"));
  assert.match(s.current, /Web Design Lab/);
  assert.match(s.current, /1BCA04/);
  assert.match(s.current, /B2/);
  assert.match(s.current, /DIVL04a/);
  assert.match(s.current, /8:50–10:40 AM/);
});

// TEST 9: Wednesday 1:00 PM
check("T9 Wed 13:00 → CURRENT Web Design Lab 1BCADS01 B2 DIVL03a", () => {
  const s = summarize(at("Wednesday", "13:00"));
  assert.match(s.current, /Web Design Lab/);
  assert.match(s.current, /1BCADS01/);
  assert.match(s.current, /DIVL03a/);
  assert.match(s.current, /12:35–2:20 PM/);
});

// TEST 10: Thursday 3:00 PM
check("T10 Thu 15:00 → CURRENT Data Structures 1MCA04 MT01", () => {
  const s = summarize(at("Thursday", "15:00"));
  assert.match(s.current, /Data Structures/);
  assert.match(s.current, /1MCA04/);
  assert.match(s.current, /MT01/);
  assert.match(s.current, /2:30–3:25 PM/);
});

// TEST 11: Friday 1:00 PM
check("T11 Fri 13:00 → CURRENT Web Design Lab 1BCA04 B2 DIVL01a", () => {
  const s = summarize(at("Friday", "13:00"));
  assert.match(s.current, /Web Design Lab/);
  assert.match(s.current, /1BCA04/);
  assert.match(s.current, /DIVL01a/);
  assert.match(s.current, /12:35–2:20 PM/);
});

// TEST 12: Friday 2:45 PM
check("T12 Fri 14:45 → CURRENT Data Structures 1MCA04 MT02", () => {
  const s = summarize(at("Friday", "14:45"));
  assert.match(s.current, /Data Structures/);
  assert.match(s.current, /1MCA04/);
  assert.match(s.current, /MT02/);
  assert.match(s.current, /2:30–3:25 PM/);
});

// TEST 13: Any weekday 10:45 AM — morning break, no class
check("T13 Mon 10:45 → Morning Break, no class", () => {
  for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]) {
    const s = summarize(at(day, "10:45"));
    assert.equal(s.current, null, `${day}: previous class must not show as active`);
    assert.equal(s.break, "Morning Break");
  }
});

// TEST 14: Any weekday 2:25 PM — afternoon break/transition, no class
check("T14 Tue+Thu+Fri 14:25 → Afternoon Break, no class", () => {
  // Monday/Wednesday WDL ends 14:20, break is 14:20–14:30 → 14:25 break, next at 14:30
  for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]) {
    const s = summarize(at(day, "14:25"));
    assert.equal(s.current, null, `${day}: no class may be active during break`);
    assert.equal(s.break, "Afternoon Break");
  }
});

// Extra edge checks
check("Edge: Mon 14:29 → still break; 14:30 → Node.js current", () => {
  const before = summarize(at("Monday", "14:29"));
  const atStart = summarize(at("Monday", "14:30"));
  assert.equal(before.current, null);
  assert.equal(before.break, "Afternoon Break");
  assert.match(atStart.current, /Node\.js/);
});

check("Edge: class ends exactly at end time (Mon 14:20 → not current)", () => {
  const s = summarize(at("Monday", "14:20"));
  assert.equal(s.current, null, "class must end exactly at end time");
});

check("Edge: weekend → no current, context weekend", () => {
  const s = summarize(at("Saturday", "13:00"));
  assert.equal(s.current, null);
  assert.equal(s.context, "weekend");
});

check("Edge: before office (Mon 08:00) → before-office; after (16:30) → after-office", () => {
  assert.equal(getWorkContext(at("Monday", "08:00")), "before-office");
  assert.equal(getWorkContext(at("Monday", "16:30")), "after-office");
});

check("Edge: Sunday next class → Tomorrow Web Design Lab (Monday 12:35)", () => {
  const s = summarize(at("Sunday", "18:00"));
  assert.match(s.next, /Web Design Lab/);
  assert.match(s.next, /12:35–2:20 PM/);
});

console.log("\nMode isolation (unified engine)");

const { dateToHHMM: d2h } = time;

/** Synthetic PhD data with a pending task so the engine always has a PhD action available. */
const phdApplications = [
  {
    id: "dfki",
    opportunity: "DFKI PhD Position",
    institution: "DFKI",
    stage: "preparing",
    deadline: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    deadlineText: null,
    sourceStatus: "Active",
    tasks: [
      { id: "t1", title: "Save official job description", group: "Admin", required: true, status: "not-started" },
    ],
  },
];
const phdTree = [];

function baseCtx(mode, dayName, hhmm, overrides = {}) {
  const now = at(dayName, hhmm);
  const current = time.getCurrentScheduleItem(now);
  const next = time.getNextScheduleItem(now);
  return {
    mode,
    now,
    current: current ? { entry: current, timeRange: time.entryTimeRange(current) } : null,
    next: next ? { entry: next.entry, timeRange: time.entryTimeRange(next.entry), dayLabel: next.dayLabel } : null,
    officeHoursActive: time.isOfficeHours(now),
    breakLabel: time.getBreak(now)?.label ?? null,
    tasks: [],
    meetings: [],
    routines: [],
    routineCompletions: {},
    workout: { enabled: true, startTime: "17:00" },
    phdApplications,
    phdTree,
    ...overrides,
  };
}

check("ISO1 Work Mon 13:00 → CURRENT Web Design Lab with room in time line", () => {
  const a = findUnifiedNextAction(baseCtx("work", "Monday", "13:00"));
  assert.equal(a.kind, "class-current");
  assert.equal(a.title, "Web Design Lab");
  assert.match(a.time, /DIVL03a/);
  assert.match(a.time, /12:35–2:20 PM/);
});

check("ISO2 Work mode NEVER returns PhD action even when PhD task pending", () => {
  // Monday 15:00: no class (Mon has 14:30-16:15 Node.js? yes it does) — use 16:30 after office
  const a = findUnifiedNextAction(baseCtx("work", "Monday", "16:30"));
  assert.notEqual(a.kind, "phd");
  assert.notEqual(a.kind, "workout");
});

check("ISO3 Work mode ignores overdue personal task", () => {
  const a = findUnifiedNextAction(
    baseCtx("work", "Monday", "16:30", {
      tasks: [{ id: "p1", title: "Buy groceries", mode: "personal", createdAt: "", dueDate: "2020-01-01", dueTime: null, priority: "high", completed: false }],
    })
  );
  assert.notEqual(a.title, "Buy groceries");
  assert.notEqual(a.kind, "phd");
});

check("ISO4 Work mode surfaces overdue WORK task", () => {
  const a = findUnifiedNextAction(
    baseCtx("work", "Monday", "16:30", {
      tasks: [{ id: "w1", title: "Submit internal marks", mode: "work", createdAt: "", dueDate: "2020-01-01", dueTime: null, priority: "high", completed: false }],
    })
  );
  assert.equal(a.title, "Submit internal marks");
  assert.equal(a.label, "OVERDUE");
});

check("ISO5 Personal mode NEVER shows class as CURRENT during class hours", () => {
  const a = findUnifiedNextAction(baseCtx("personal", "Monday", "13:00"));
  assert.notEqual(a.kind, "class-current");
  assert.notEqual(a.kind, "class-next");
  assert.notEqual(a.kind, "break");
  // Falls through to PhD (personal context allows PhD).
  assert.equal(a.kind, "phd");
  assert.equal(a.title, "Save official job description");
});

check("ISO6 Personal mode returns PhD next action with urgency", () => {
  const a = findUnifiedNextAction(baseCtx("personal", "Sunday", "10:00"));
  assert.equal(a.kind, "phd");
  assert.match(a.urgency ?? "", /left|Today|Overdue/);
});

check("ISO7 Personal mode surfaces workout at 17:00+", () => {
  const a = findUnifiedNextAction(
    baseCtx("personal", "Sunday", "17:30", { phdApplications: [], phdTree: [] })
  );
  assert.equal(a.kind, "workout");
  assert.equal(a.urgency, "Starts now");
});

check("ISO8 Work mode: no workout at 17:30 even if within window", () => {
  const a = findUnifiedNextAction(
    baseCtx("work", "Monday", "17:30", { phdApplications: [], phdTree: [] })
  );
  assert.notEqual(a.kind, "workout");
});

check("ISO9 Personal mode ignores overdue work task", () => {
  const a = findUnifiedNextAction(
    baseCtx("personal", "Sunday", "10:00", {
      tasks: [{ id: "w2", title: "Submit internal marks", mode: "work", createdAt: "", dueDate: "2020-01-01", dueTime: null, priority: "high", completed: false }],
    })
  );
  assert.notEqual(a.title, "Submit internal marks");
  assert.equal(a.kind, "phd");
});

check("ISO10 Personal mode surfaces due-today personal task before PhD", () => {
  const today = todayISO();
  const a = findUnifiedNextAction(
    baseCtx("personal", "Sunday", "10:00", {
      tasks: [{ id: "pt", title: "Buy groceries", mode: "personal", createdAt: "", dueDate: today, dueTime: null, priority: "medium", completed: false }],
    })
  );
  assert.equal(a.title, "Buy groceries");
});

function todayISO() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

console.log(failures === 0 ? "\nAll tests passed." : `\n${failures} test(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
