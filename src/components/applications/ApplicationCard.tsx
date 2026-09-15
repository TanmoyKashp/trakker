import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { deadlineState, formatDate } from "../../lib/dates";
import { firstIncompleteRequiredTask } from "../../lib/nextAction";
import { calculateProgress } from "../../lib/progress";
import { stageLabel } from "../../lib/status";
import type { Application } from "../../types";
import { Badge } from "../ui/Badge";
import { ProgressBar } from "../ui/ProgressBar";

export function ApplicationCard({ app }: { app: Application }) {
  const progress = calculateProgress(app.tasks);
  const deadline = deadlineState(app.deadline, app.deadlineText, app.sourceStatus);
  const nextTask = firstIncompleteRequiredTask(app);
  return (
    <Link to={`/applications/${app.id}`} className="focus-ring block rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-4 shadow-sm transition hover:border-[var(--primary)]/40">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-base font-semibold leading-snug text-[#242424]">{app.opportunity}</h2>
          <div className="mt-1 text-xs font-medium text-stone-500">{app.institution}</div>
        </div>
        <div className="shrink-0 text-sm font-semibold">{app.fitScore ? `${app.fitScore}/10` : "—"}</div>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-stone-600">
        <Badge tone={deadline.tone}>{deadline.label}</Badge>
        <span>{app.location || "Not specified"}</span>
        {app.officialUrl && <ExternalLink size={14} />}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <Badge tone={app.stage}>{stageLabel(app.stage)}</Badge>
          <span className="text-stone-500">{progress.completed}/{progress.total} tasks</span>
        </div>
        <ProgressBar percent={progress.percent} />
      </div>
      {nextTask && <div className="mt-3 line-clamp-1 text-xs font-semibold text-[var(--primary)]">NEXT → {nextTask.title}</div>}
      <p className="mt-3 line-clamp-1 text-xs text-stone-600">{app.funding || "Funding not specified"}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {app.researchAreas.slice(0, 3).map((area) => (
          <span key={area} className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-700">{area}</span>
        ))}
      </div>
      <div className="mt-3 text-xs text-stone-500">Deadline {formatDate(app.deadline)}</div>
    </Link>
  );
}
