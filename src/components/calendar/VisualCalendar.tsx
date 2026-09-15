import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Mode } from "../../types";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function getDayOfYear(date: Date): number {
  let days = 0;
  for (let m = 0; m < date.getMonth(); m++) {
    days += getDaysInMonth(date.getFullYear(), m);
  }
  days += date.getDate();
  return days;
}

function getDateFromDayOfYear(year: number, dayOfYear: number): string {
  const MONTHS_SHORT = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  let remaining = dayOfYear;
  for (let m = 0; m < 12; m++) {
    const dim = getDaysInMonth(year, m);
    if (remaining <= dim) {
      return `${MONTHS_SHORT[m]} ${remaining}, ${year}`;
    }
    remaining -= dim;
  }
  return `Dec 31, ${year}`;
}

interface VisualCalendarProps {
  mode: Mode;
  className?: string;
}

export function VisualCalendar({ mode, className = "" }: VisualCalendarProps) {
  const [view, setView] = useState<"month" | "year">("month");

  // Real system date; no hardcoded dates
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  // Month navigation
  function prevMonth() {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  }

  function resetToCurrent() {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
  }

  const isCurrentMonthView =
    selectedYear === currentYear && selectedMonth === currentMonth;

  // Month calculation
  const daysInSelectedMonth = getDaysInMonth(selectedYear, selectedMonth);

  // Monday–Sunday grid: Monday = 0, ..., Sunday = 6
  const firstDayWeekday = new Date(selectedYear, selectedMonth, 1).getDay();
  const leadingOffset = (firstDayWeekday + 6) % 7;

  // Month days left calculation
  const monthDaysLeft = useMemo(() => {
    if (selectedYear < currentYear || (selectedYear === currentYear && selectedMonth < currentMonth)) {
      return "0 days left";
    }
    if (selectedYear > currentYear || (selectedYear === currentYear && selectedMonth > currentMonth)) {
      return `${daysInSelectedMonth} days left`;
    }
    const left = daysInSelectedMonth - currentDate;
    return left === 0 ? "Last day" : left === 1 ? "1 day left" : `${left} days left`;
  }, [selectedYear, selectedMonth, currentYear, currentMonth, currentDate, daysInSelectedMonth]);

  // Year calculation
  const totalDaysInYear = isLeapYear(currentYear) ? 366 : 365;
  const currentDayOfYear = getDayOfYear(now);
  const yearDaysLeft = totalDaysInYear - currentDayOfYear;
  const yearDaysLeftText =
    yearDaysLeft === 0 ? "Last day" : yearDaysLeft === 1 ? "1 day left" : `${yearDaysLeft} days left`;

  const yearDots = useMemo(() => {
    return Array.from({ length: totalDaysInYear }, (_, idx) => {
      const dayNum = idx + 1;
      const isPast = dayNum < currentDayOfYear;
      const isToday = dayNum === currentDayOfYear;
      const dateLabel = getDateFromDayOfYear(currentYear, dayNum);
      return { dayNum, isPast, isToday, dateLabel };
    });
  }, [totalDaysInYear, currentDayOfYear, currentYear]);

  // Theme-specific Today dot styles
  // Work → existing maroon theme (#6B1F2A / #B83A4B / #F9CDD5)
  // Personal → existing olive/matcha theme (#7A8450 / #B2BD83)
  const todayAccentClass =
    mode === "work"
      ? "bg-[#b83a4b] ring-2 ring-[#f9cdd5] ring-offset-2 ring-offset-[#141414] shadow-[0_0_10px_rgba(249,205,213,0.7)]"
      : "bg-[#7a8450] ring-2 ring-[#b2bd83] ring-offset-2 ring-offset-[#141414] shadow-[0_0_10px_rgba(122,132,80,0.7)]";

  const todayYearAccentClass =
    mode === "work"
      ? "bg-[#b83a4b] ring-2 ring-[#f9cdd5] ring-offset-1 ring-offset-[#141414] scale-125 z-1 shadow-[0_0_8px_rgba(249,205,213,0.8)]"
      : "bg-[#7a8450] ring-2 ring-[#b2bd83] ring-offset-1 ring-offset-[#141414] scale-125 z-1 shadow-[0_0_8px_rgba(122,132,80,0.8)]";

  return (
    <div className={`w-full ${className}`}>
      {/* Dark/black card inspired by reference visual */}
      <div className="card-shadow rounded-xl border border-neutral-800/90 bg-[#141414] p-4 text-stone-100 sm:rounded-2xl sm:p-5">
        {/* Header: Title + Days Left (Left) | Compact Toggle (Right) */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1">
              <span className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-neutral-200 sm:text-sm">
                {view === "month"
                  ? `${MONTH_NAMES[selectedMonth]} ${selectedYear}`
                  : `${currentYear}`}
              </span>

              {/* Month navigation */}
              {view === "month" && (
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={prevMonth}
                    aria-label="Previous month"
                    className="focus-ring flex min-h-11 min-w-11 items-center justify-center rounded text-neutral-400 hover:text-white transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    aria-label="Next month"
                    className="focus-ring flex min-h-11 min-w-11 items-center justify-center rounded text-neutral-400 hover:text-white transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                  {!isCurrentMonthView && (
                    <button
                      type="button"
                      onClick={resetToCurrent}
                      className="focus-ring flex min-h-11 items-center px-2 text-[10px] font-mono uppercase tracking-wider text-neutral-400 hover:text-white transition-colors"
                    >
                      Today
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="mt-0.5 font-mono text-[11px] text-neutral-400 sm:text-xs">
              {view === "month" ? monthDaysLeft : yearDaysLeftText}
            </div>
          </div>

          {/* Compact MONTH / YEAR toggle */}
          <div
            className="inline-flex rounded-lg border border-neutral-800 bg-neutral-900/90 p-1"
            role="group"
            aria-label="Calendar view toggle"
          >
            <button
              type="button"
              aria-pressed={view === "month"}
              onClick={() => setView("month")}
              className={`focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors ${
                view === "month"
                  ? "bg-neutral-800 text-white font-semibold shadow-xs"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Month
            </button>
            <button
              type="button"
              aria-pressed={view === "year"}
              onClick={() => setView("year")}
              className={`focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors ${
                view === "year"
                  ? "bg-neutral-800 text-white font-semibold shadow-xs"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Year
            </button>
          </div>
        </div>

        {/* Content Body */}
        {view === "month" ? (
          <div className="mt-4">
            {/* Monday–Sunday column headers */}
            <div className="grid grid-cols-7 gap-1 pb-1 sm:gap-2">
              {WEEKDAY_HEADERS.map((day, idx) => (
                <div
                  key={idx}
                  className="text-center font-mono text-[10px] font-medium text-neutral-500 sm:text-[11px]"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Grid of dots */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {/* Empty leading offset days */}
              {Array.from({ length: leadingOffset }).map((_, i) => (
                <div key={`blank-${i}`} className="flex h-8 items-center justify-center sm:h-9" />
              ))}

              {/* Month day dots */}
              {Array.from({ length: daysInSelectedMonth }, (_, i) => {
                const day = i + 1;
                const isViewingCurrentMonth =
                  selectedYear === currentYear && selectedMonth === currentMonth;
                const isPast =
                  selectedYear < currentYear ||
                  (selectedYear === currentYear && selectedMonth < currentMonth) ||
                  (isViewingCurrentMonth && day < currentDate);
                const isToday = isViewingCurrentMonth && day === currentDate;

                const dateTitle = `${MONTH_NAMES[selectedMonth]} ${day}, ${selectedYear}${
                  isToday ? " · Today" : ""
                }`;

                return (
                  <div
                    key={`day-${day}`}
                    className="flex h-8 items-center justify-center sm:h-9"
                    title={dateTitle}
                    aria-label={dateTitle}
                  >
                    <span
                      className={`block rounded-full transition-transform ${
                        isToday
                          ? `h-3.5 w-3.5 sm:h-4 sm:w-4 ${todayAccentClass}`
                          : isPast
                          ? "h-3 w-3 bg-stone-300 sm:h-3.5 sm:w-3.5"
                          : "h-3 w-3 border border-neutral-700/40 bg-neutral-800 sm:h-3.5 sm:w-3.5"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* YEAR VIEW: Entire current year (365/366 dots) in responsive grid */
          <div className="mt-4">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(9px,1fr))] gap-1 sm:grid-cols-[repeat(auto-fill,minmax(11px,1fr))] sm:gap-1.5">
              {yearDots.map(({ dayNum, isPast, isToday, dateLabel }) => {
                const dotTitle = `${dateLabel}${isToday ? " · Today" : ""}`;
                return (
                  <div
                    key={`year-dot-${dayNum}`}
                    className="aspect-square flex items-center justify-center"
                    title={dotTitle}
                    aria-label={dotTitle}
                  >
                    <span
                      className={`block h-full w-full rounded-full transition-all ${
                        isToday
                          ? todayYearAccentClass
                          : isPast
                          ? "bg-stone-300"
                          : "border border-neutral-800 bg-neutral-800/80"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
