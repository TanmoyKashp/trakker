import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { ProgressBar } from "../components/ui/ProgressBar";
import { formatDate } from "../lib/dates";
import { calculateProgress } from "../lib/progress";
import { stageLabel, stageOptions } from "../lib/status";
import type { Application, ApplicationStage } from "../types";

export function StatusPage({ applications }: { applications: Application[] }) {
  const activeStages = stageOptions.filter((stage) => !["rejected", "expired", "withdrawn"].includes(stage.value));
  const terminalStages = stageOptions.filter((stage) => ["rejected", "expired", "withdrawn"].includes(stage.value));
  return (
    <section className="page-enter mx-auto max-w-7xl px-4 py-5 sm:px-6">
      <header className="mb-4">
        <div className="text-xs font-semibold tracking-[0.22em] text-stone-500">TRAKKER</div>
        <h1 className="text-2xl font-semibold">Status</h1>
      </header>
      <div className="mb-5 grid gap-2 md:grid-cols-4 xl:grid-cols-8">
        {activeStages.map((stage) => <StageColumn key={stage.value} stage={stage.value} applications={applications} />)}
      </div>
      <div className="mb-5 grid gap-2 md:grid-cols-3">
        {terminalStages.map((stage) => <StageColumn key={stage.value} stage={stage.value} applications={applications} />)}
      </div>
      <div className="overflow-hidden rounded-lg border border-stone-300/70 bg-[#FFFCF7]">
        <div className="border-b border-stone-300/70 px-4 py-3 font-semibold">Application Status</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-stone-100/70 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-2">Institution</th>
                <th className="px-4 py-2">Opportunity</th>
                <th className="px-4 py-2">Deadline</th>
                <th className="px-4 py-2">Stage</th>
                <th className="px-4 py-2">Application date</th>
                <th className="px-4 py-2">Final status</th>
                <th className="px-4 py-2">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/80">
              {applications.map((app) => {
                const progress = calculateProgress(app.tasks);
                return (
                  <tr key={app.id} className="hover:bg-stone-100/60">
                    <td className="px-4 py-3 font-medium"><Link className="focus-ring rounded text-[var(--primary)]" to={`/applications/${app.id}`}>{app.institution}</Link></td>
                    <td className="max-w-md px-4 py-3">{app.opportunity}</td>
                    <td className="px-4 py-3">{formatDate(app.deadline)}</td>
                    <td className="px-4 py-3"><Badge tone={app.stage}>{stageLabel(app.stage)}</Badge></td>
                    <td className="px-4 py-3">{formatDate(app.applicationDate)}</td>
                    <td className="px-4 py-3">{app.finalStatus || "—"}</td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-24"><ProgressBar percent={progress.percent} /></div><span>{progress.percent}%</span></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function StageColumn({ stage, applications }: { stage: ApplicationStage; applications: Application[] }) {
  const items = applications.filter((app) => app.stage === stage);
  return (
    <div className="rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
        <Badge tone={stage}>{stageLabel(stage)}</Badge>
          <div className="mt-2 text-2xl font-semibold leading-none">{items.length}</div>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {items.slice(0, 3).map((app) => <Link key={app.id} to={`/applications/${app.id}`} className="focus-ring block rounded-md border border-stone-200 p-2 text-xs hover:border-[var(--primary)]/40"><div className="font-medium">{app.institution}</div><div className="truncate text-stone-500">{app.applicationDate ? `Submitted · ${formatDate(app.applicationDate)}` : app.opportunity}</div></Link>)}
        {!items.length && <div className="text-xs text-stone-500">No applications in this stage.</div>}
      </div>
    </div>
  );
}
