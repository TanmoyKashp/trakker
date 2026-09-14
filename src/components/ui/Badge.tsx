import { statusClass } from "../../lib/status";
import type { ReactNode } from "react";
import type { ApplicationStage, TaskStatus } from "../../types";

export function Badge({ children, tone }: { children: ReactNode; tone?: TaskStatus | ApplicationStage | "red" | "yellow" | "green" | "gray" }) {
  const cls =
    tone === "red"
      ? "status-red"
      : tone === "yellow"
        ? "status-yellow"
        : tone === "green"
          ? "status-green"
          : tone === "gray" || !tone
            ? "status-gray"
            : statusClass(tone);
  return <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}
