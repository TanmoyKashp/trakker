import type { ApplicationStage, TaskStatus } from "../types";

export const stageOptions: { value: ApplicationStage; label: string }[] = [
  { value: "not-started", label: "Not Started" },
  { value: "researching", label: "Researching" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "submitted", label: "Submitted" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
  { value: "withdrawn", label: "Withdrawn" },
];

export const taskStatusOptions: { value: TaskStatus; label: string; symbol: string }[] = [
  { value: "not-started", label: "Not Started", symbol: "○" },
  { value: "in-progress", label: "In Progress", symbol: "◐" },
  { value: "completed", label: "Completed", symbol: "✓" },
  { value: "blocked", label: "Blocked", symbol: "!" },
  { value: "not-applicable", label: "N/A", symbol: "—" },
];

export function stageLabel(stage: ApplicationStage) {
  return stageOptions.find((item) => item.value === stage)?.label ?? "Not Started";
}

export function taskStatusLabel(status: TaskStatus) {
  return taskStatusOptions.find((item) => item.value === status)?.label ?? "Not Started";
}

export function taskSymbol(status: TaskStatus) {
  return taskStatusOptions.find((item) => item.value === status)?.symbol ?? "○";
}

export function statusClass(status: TaskStatus | ApplicationStage) {
  if (status === "completed" || status === "ready" || status === "accepted" || status === "offer") return "status-green";
  if (status === "in-progress" || status === "preparing" || status === "researching" || status === "submitted" || status === "interview") return "status-yellow";
  if (status === "blocked" || status === "rejected" || status === "expired" || status === "withdrawn") return "status-red";
  return "status-gray";
}
