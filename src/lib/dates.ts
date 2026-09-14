export function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(parsed);
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
