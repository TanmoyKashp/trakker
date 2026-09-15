import { Clock, MapPin } from "lucide-react";
import { OFFICE_HOURS, MORNING_BREAK, AFTERNOON_BREAK } from "../lib/timetable";
import { entryTimeRange, formatTime12, getDayEntries, getScheduleSnapshot, sectionsLabel } from "../lib/time";

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function TimetablePage() {
  const snapshot = getScheduleSnapshot();
  const todayIdx = snapshot.workDayIndex;

  return (
    <section className="page-enter mx-auto max-w-4xl px-4 py-5 sm:px-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Work Timetable</h1>
        <p className="mt-1 text-sm text-stone-500">
          Office hours Mon–Fri · {formatTime12(OFFICE_HOURS.start)}–{formatTime12(OFFICE_HOURS.end)}
        </p>
      </header>

      <div className="space-y-3">
        {DAY_LABELS.map((label, idx) => {
          const entries = getDayEntries(idx);
          const isToday = idx === todayIdx;
          return (
            <div
              key={label}
              className={`card-shadow card-shadow-hover rounded-lg border bg-[#FFFCF7] p-4 ${isToday ? "border-[var(--primary)]" : "border-stone-300/70"}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">{label}</h2>
                {isToday && (
                  <span className="rounded-md bg-[var(--accent)] px-2 py-0.5 text-xs font-medium text-[#242424]">Today</span>
                )}
              </div>
              {entries.length ? (
                <div className="space-y-2">
                  {entries.map((entry) => {
                    const isCurrent = isToday && snapshot.current?.id === entry.id;
                    return (
                      <div
                        key={entry.id}
                        className={`rounded-md border p-3 ${isCurrent ? "border-[var(--primary)] bg-[var(--primary-tint)]" : "border-stone-200"}`}
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-medium">{entry.subject}</span>
                          <span className="inline-flex items-center gap-1 text-xs text-stone-600">
                            <Clock size={13} /> {entryTimeRange(entry)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                          <span>{entry.courseCode}</span>
                          <span>{sectionsLabel(entry)}</span>
                          {entry.batch && <span>Batch {entry.batch}</span>}
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} /> {entry.room}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-stone-500">No classes.</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-4 text-sm text-stone-600">
        <span className="font-medium text-[#242424]">Breaks:</span> {formatTime12(MORNING_BREAK.start)}–{formatTime12(MORNING_BREAK.end)} ·{" "}
        {formatTime12(AFTERNOON_BREAK.start)}–{formatTime12(AFTERNOON_BREAK.end)} — transitions, not classes.
      </div>
    </section>
  );
}
