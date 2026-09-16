import { useState } from "react";
import {
  CalendarDays,
  Clock,
  Edit2,
  MapPin,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useTrakkerOs, type TrakkerOs, type TrakkerOsState } from "../hooks/useTrakkerOs";
import { entryTimeRange, formatTime12, getDayEntries, getScheduleSnapshot, sectionsLabel } from "../lib/time";
import { MORNING_BREAK, AFTERNOON_BREAK, OFFICE_HOURS } from "../lib/timetable";
import type { TimetableEntry } from "../types";

interface Props {
  osState?: TrakkerOsState;
  os?: TrakkerOs;
}

const DAYS = [
  { index: 0, label: "Monday", short: "Mon" },
  { index: 1, label: "Tuesday", short: "Tue" },
  { index: 2, label: "Wednesday", short: "Wed" },
  { index: 3, label: "Thursday", short: "Thu" },
  { index: 4, label: "Friday", short: "Fri" },
  { index: 5, label: "Saturday", short: "Sat" },
  { index: 6, label: "Sunday", short: "Sun" },
];

interface FormState {
  id?: string;
  subject: string;
  room: string;
  batch: string;
  day: number;
  startTime: string;
  endTime: string;
}

const defaultForm: FormState = {
  subject: "",
  room: "",
  batch: "",
  day: 0,
  startTime: "09:00",
  endTime: "10:00",
};

export function TimetablePage({ osState: propState, os: propOs }: Props) {
  const fallbackOs = useTrakkerOs();
  const os = propOs || fallbackOs;
  const osState = propState || os.os;

  const snapshot = getScheduleSnapshot(new Date(), osState.timetable);
  const todayIdx = snapshot.workDayIndex;

  const [filterDay, setFilterDay] = useState<number | "all">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const entries = osState.timetable.filter((t) => !t.deletedAt);

  const openAddModal = (dayIndex = 0) => {
    setForm({ ...defaultForm, day: dayIndex });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (entry: TimetableEntry) => {
    setForm({
      id: entry.id,
      subject: entry.subject,
      room: entry.room,
      batch: entry.batch || (entry.sections && entry.sections.length > 0 ? entry.sections.join(", ") : ""),
      day: entry.day,
      startTime: entry.startTime,
      endTime: entry.endTime,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim()) {
      setFormError("Subject name is required");
      return;
    }
    if (!form.room.trim()) {
      setFormError("Location / Room is required");
      return;
    }
    if (form.startTime >= form.endTime) {
      setFormError("End time must be after start time");
      return;
    }

    if (form.id) {
      os.updateTimetableEntry(form.id, {
        subject: form.subject.trim(),
        room: form.room.trim(),
        batch: form.batch.trim() || null,
        day: form.day,
        startTime: form.startTime,
        endTime: form.endTime,
      });
    } else {
      os.addTimetableEntry({
        subject: form.subject.trim(),
        room: form.room.trim(),
        batch: form.batch.trim() || null,
        day: form.day,
        startTime: form.startTime,
        endTime: form.endTime,
      });
    }

    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    os.deleteTimetableEntry(id);
    setDeletingId(null);
  };

  const daysToRender = filterDay === "all" ? DAYS.slice(0, 5) : DAYS.filter((d) => d.index === filterDay);

  return (
    <section className="page-enter mx-auto max-w-4xl px-4 py-6 sm:px-6">
      {/* Editorial Header */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 pb-4 border-b border-stone-200/80">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-wide text-[#242424]">Work Timetable</h1>
          <p className="mt-1 text-xs text-stone-500 tracking-wide">
            Office hours Mon–Fri · {formatTime12(OFFICE_HOURS.start)}–{formatTime12(OFFICE_HOURS.end)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => openAddModal(typeof filterDay === "number" ? filterDay : 0)}
          className="focus-ring inline-flex items-center gap-1.5 self-start rounded-lg bg-[var(--primary)] px-3.5 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 cursor-pointer"
        >
          <Plus size={15} />
          <span>Add Entry</span>
        </button>
      </header>

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-1.5 border-b border-stone-200/60 pb-3">
        <button
          type="button"
          onClick={() => setFilterDay("all")}
          className={`focus-ring rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
            filterDay === "all"
              ? "bg-[var(--primary-tint)] text-[var(--primary)] font-semibold"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/80"
          }`}
        >
          Weekly View
        </button>
        {DAYS.map((d) => (
          <button
            key={d.index}
            type="button"
            onClick={() => setFilterDay(d.index)}
            className={`focus-ring rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              filterDay === d.index
                ? "bg-[var(--primary-tint)] text-[var(--primary)] font-semibold"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/80"
            }`}
          >
            {d.short}
            {d.index === todayIdx && <span className="ml-1 text-[10px] text-[var(--primary)] font-bold">·</span>}
          </button>
        ))}
      </div>

      {/* Main Schedule Listing */}
      {entries.length === 0 ? (
        <div className="rounded-xl border border-stone-200/80 bg-[#FFFCF7] p-8 sm:p-12 text-center my-6">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary-tint)] text-[var(--primary)] mb-3">
            <CalendarDays size={20} />
          </div>
          <h2 className="font-serif text-lg font-semibold text-[#242424]">No timetable entries yet</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-xs text-stone-500 leading-relaxed">
            Create your recurring classes, batches, and lectures. Trakker will automatically show the live class in progress and what starts next.
          </p>
          <button
            type="button"
            onClick={() => openAddModal(0)}
            className="focus-ring mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 cursor-pointer"
          >
            <Plus size={14} />
            <span>Create First Entry</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {daysToRender.map((day) => {
            const dayEntries = getDayEntries(day.index, osState.timetable);
            const isToday = day.index === todayIdx;

            return (
              <div key={day.index} className="space-y-2">
                {/* Day Header */}
                <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <h2 className="font-medium text-sm text-[#242424]">{day.label}</h2>
                    {isToday && (
                      <span className="rounded bg-[var(--primary-tint)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--primary)] tracking-wide">
                        Today
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => openAddModal(day.index)}
                    className="focus-ring text-stone-400 hover:text-stone-700 transition-colors p-1 cursor-pointer"
                    title={`Add entry for ${day.label}`}
                    aria-label={`Add entry for ${day.label}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Day Entries */}
                {dayEntries.length === 0 ? (
                  <div className="py-3 text-xs text-stone-400 italic">No classes scheduled.</div>
                ) : (
                  <div className="divide-y divide-stone-200/60 rounded-lg border border-stone-200/80 bg-[#FFFCF7]">
                    {dayEntries.map((entry) => {
                      const isCurrent = isToday && snapshot.current?.id === entry.id;
                      return (
                        <div
                          key={entry.id}
                          className={`group flex items-start justify-between p-3.5 sm:p-4 transition-colors ${
                            isCurrent ? "bg-[var(--primary-tint)]/40" : "hover:bg-stone-50/60"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-semibold text-[#242424]">{entry.subject}</span>
                              {isCurrent && (
                                <span className="rounded bg-[var(--primary)] text-white px-1.5 py-0.5 text-[10px] font-medium tracking-wide animate-pulse">
                                  Happening Now
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-stone-700">
                                <Clock size={12} className="text-stone-400" />
                                {entryTimeRange(entry)}
                              </span>
                              <span className="inline-flex items-center gap-1 text-stone-600">
                                <MapPin size={12} className="text-stone-400" />
                                {entry.room}
                              </span>
                              {(entry.batch || sectionsLabel(entry)) && (
                                <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
                                  {entry.batch ? `Batch ${entry.batch}` : sectionsLabel(entry)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => openEditModal(entry)}
                              className="focus-ring rounded p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                              title="Edit entry"
                              aria-label="Edit entry"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(entry.id)}
                              className="focus-ring rounded p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete entry"
                              aria-label="Delete entry"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Routine Breaks Note */}
      <footer className="mt-8 rounded-lg border border-stone-200/80 bg-[#FFFCF7] p-3.5 text-xs text-stone-500 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-stone-700">Standard Breaks:</span>{" "}
          {formatTime12(MORNING_BREAK.start)}–{formatTime12(MORNING_BREAK.end)} ·{" "}
          {formatTime12(AFTERNOON_BREAK.start)}–{formatTime12(AFTERNOON_BREAK.end)}
        </div>
        <div className="text-[11px] text-stone-400">Class periods are merged without fragmented slots</div>
      </footer>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-[#FFFCF7] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h2 className="font-serif text-lg font-semibold text-[#242424]">
                {form.id ? "Edit Timetable Entry" : "New Timetable Entry"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="focus-ring rounded p-1 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X size={17} />
              </button>
            </div>

            {formError && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Subject / Course <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data Structures"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="focus-ring w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 placeholder:text-stone-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">
                    Location / Room <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MT01"
                    value={form.room}
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                    className="focus-ring w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 placeholder:text-stone-400"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">
                    Batch / Class <span className="text-stone-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1MCA04"
                    value={form.batch}
                    onChange={(e) => setForm({ ...form, batch: e.target.value })}
                    className="focus-ring w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 placeholder:text-stone-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Day of Week</label>
                <select
                  value={form.day}
                  onChange={(e) => setForm({ ...form, day: Number(e.target.value) })}
                  className="focus-ring w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
                >
                  {DAYS.map((d) => (
                    <option key={d.index} value={d.index}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">
                    Start Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="focus-ring w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">
                    End Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="focus-ring w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="focus-ring rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="focus-ring rounded-lg bg-[var(--primary)] px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {form.id ? "Save Changes" : "Add Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-[#FFFCF7] p-5 shadow-xl space-y-3">
            <h2 className="font-serif text-base font-semibold text-[#242424]">Delete Timetable Entry?</h2>
            <p className="text-xs text-stone-500 leading-relaxed">
              This class will be removed from your weekly schedule. This action can be synced across your devices.
            </p>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="focus-ring rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deletingId)}
                className="focus-ring rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
