import { useState } from "react";
import { formatDate } from "../lib/dates";
import { formatTime12 } from "../lib/time";
import { todayISO, type TrakkerOs, type TrakkerOsState } from "../hooks/useTrakkerOs";
import type { Meeting, Mode } from "../types";

export function MeetingsPage({ osState, os }: { osState: TrakkerOsState; os: TrakkerOs }) {
  const [form, setForm] = useState({ title: "", date: "", startTime: "", endTime: "", location: "", mode: "work" as Mode });
  const today = todayISO();

  const upcoming = osState.meetings
    .filter((m) => m.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  const past = osState.meetings
    .filter((m) => m.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.date || !form.startTime || !form.endTime) return;
    os.addMeeting({ title: form.title.trim(), date: form.date, startTime: form.startTime, endTime: form.endTime, location: form.location || null, mode: form.mode });
    setForm({ title: "", date: "", startTime: "", endTime: "", location: "", mode: form.mode });
  }

  return (
    <section className="page-enter mx-auto max-w-3xl px-4 py-5 sm:px-6">
      <header className="mb-4">
        <div className="text-xs font-semibold tracking-[0.22em] text-stone-500">TRAKKER</div>
        <h1 className="text-2xl font-semibold">Meetings</h1>
      </header>

      <form onSubmit={submit} className="card-shadow mb-5 grid gap-2 rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-3 sm:grid-cols-2">
        <input
          className="focus-ring min-h-11 rounded-md border border-stone-300 px-3 text-sm sm:col-span-2"
          placeholder="Meeting title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          aria-label="Meeting title"
          required
        />
        <label className="text-xs text-stone-500">
          Date
          <input type="date" className="focus-ring mt-1 min-h-11 w-full rounded-md border border-stone-300 px-3 text-sm" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-stone-500">
            Start
            <input type="time" className="focus-ring mt-1 min-h-11 w-full rounded-md border border-stone-300 px-3 text-sm" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
          </label>
          <label className="text-xs text-stone-500">
            End
            <input type="time" className="focus-ring mt-1 min-h-11 w-full rounded-md border border-stone-300 px-3 text-sm" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
          </label>
        </div>
        <label className="text-xs text-stone-500">
          Location (optional)
          <input className="focus-ring mt-1 min-h-11 w-full rounded-md border border-stone-300 px-3 text-sm" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </label>
        <label className="text-xs text-stone-500">
          Context
          <select className="focus-ring mt-1 min-h-11 w-full rounded-md border border-stone-300 px-3 text-sm" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as Mode })}>
            <option value="work">Work</option>
            <option value="personal">Personal</option>
          </select>
        </label>
        <button type="submit" className="focus-ring min-h-11 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] sm:col-span-2">
          Add meeting
        </button>
      </form>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Upcoming</h2>
      <div className="mb-5 space-y-2">
        {upcoming.length ? (
          upcoming.map((meeting: Meeting) => (
            <div key={meeting.id} className="card-shadow card-shadow-hover flex items-center justify-between gap-3 rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{meeting.title}</div>
                <div className="text-xs text-stone-500">
                  {formatDate(meeting.date)} · {formatTime12(meeting.startTime)}–{formatTime12(meeting.endTime)}
                  {meeting.location ? ` · ${meeting.location}` : ""} · {meeting.mode === "work" ? "Work" : "Personal"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => os.deleteMeeting(meeting.id)}
                className="focus-ring rounded p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-700"
                aria-label={`Delete meeting ${meeting.title}`}
              >
                ✕
              </button>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-4 text-sm text-stone-500">No upcoming meetings.</div>
        )}
      </div>

      {past.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Past</h2>
          <div className="space-y-2">
            {past.map((meeting: Meeting) => (
              <div key={meeting.id} className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-[#FFFCF7] p-3 opacity-70">
                <div className="min-w-0">
                  <div className="truncate text-sm">{meeting.title}</div>
                  <div className="text-xs text-stone-500">
                    {formatDate(meeting.date)} · {formatTime12(meeting.startTime)}–{formatTime12(meeting.endTime)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => os.deleteMeeting(meeting.id)}
                  className="focus-ring rounded p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-700"
                  aria-label={`Delete meeting ${meeting.title}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
