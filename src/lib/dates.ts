export function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(parsed);
}

/** Concrete short date, e.g. "Fri" within a week or "15 Sep" beyond. */
export function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** Relative due-date label: "Overdue" · "Today" · "Tomorrow" · "Fri" · "15 Sep". */
export function formatRelativeDue(dueDate: string, today: string): string {
  if (dueDate === today) return "Today";
  const parse = (iso: string) => new Date(`${iso}T00:00:00`).getTime();
  const diffDays = Math.round((parse(dueDate) - parse(today)) / 86_400_000);
  if (diffDays < 0) return "Overdue";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 6) return new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });
  return new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function deadlineState(deadline?: string | null, fallbackText?: string | null, sourceStatus?: string | null): { label: string; tone: "red" | "yellow" | "gray"; days: number } {
  const source = `${fallbackText ?? ""} ${sourceStatus ?? ""}`.toLowerCase();
  if (sourceStatus?.toLowerCase().includes("expired")) return { label: "Expired", tone: "red", days: Number.POSITIVE_INFINITY };
  if (!deadline) {
    if (source.includes("until filled") || source.includes("rolling")) return { label: "Until filled", tone: "yellow", days: Number.POSITIVE_INFINITY };
    return { label: fallbackText ?? "No fixed deadline", tone: "gray", days: Number.POSITIVE_INFINITY };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${deadline}T00:00:00`);
  const days = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { label: "Overdue", tone: "red", days };
  if (days === 0) return { label: "Today", tone: "red", days };
  if (days <= 3) return { label: `${days} day${days === 1 ? "" : "s"} left`, tone: "red", days };
  if (days <= 7) return { label: `${days} days left`, tone: "yellow", days };
  return { label: `${days} days left`, tone: "gray", days };
}
