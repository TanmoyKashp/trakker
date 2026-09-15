import { ArrowLeft, ExternalLink, Save } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { ProgressBar } from "../components/ui/ProgressBar";
import { formatDate } from "../lib/dates";
import { calculateProgress } from "../lib/progress";
import { stageLabel, stageOptions, taskStatusLabel, taskStatusOptions, taskSymbol } from "../lib/status";
import type { Application, ApplicationOverride, ApplicationStage, TaskStatus } from "../types";

interface Props {
  applications: Application[];
  updateApplication: (id: string, patch: ApplicationOverride) => void;
}

export function ApplicationDetailPage({ applications, updateApplication }: Props) {
  const { id } = useParams();
  const navigate = useNavigate();
  const app = applications.find((item) => item.id === id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => ({
    opportunity: app?.opportunity ?? "",
    institution: app?.institution ?? "",
    location: app?.location ?? "",
    researchAreas: app?.researchAreas.join("; ") ?? "",
    fitScore: app?.fitScore?.toString() ?? "",
    funding: app?.funding ?? "",
    deadline: app?.deadline ?? "",
    international: String(app?.international ?? ""),
    officialUrl: app?.officialUrl ?? "",
    stage: app?.stage ?? "not-started",
    applicationDate: app?.applicationDate ?? "",
    finalStatus: app?.finalStatus ?? "",
    notes: app?.notes ?? "",
  }));

  const progress = useMemo(() => (app ? calculateProgress(app.tasks) : { completed: 0, total: 0, percent: 0, status: "not-started" as TaskStatus }), [app]);
  const groupedTasks = useMemo(() => {
    const groups = new Map<string, Application["tasks"]>();
    app?.tasks.forEach((task) => groups.set(task.group, [...(groups.get(task.group) ?? []), task]));
    return Array.from(groups.entries());
  }, [app]);

  useEffect(() => {
    if (window.location.hash) {
      document.querySelector(window.location.hash)?.scrollIntoView({ block: "center" });
    }
  }, [app?.id]);

  if (!app) {
    return (
      <section className="page-enter mx-auto max-w-4xl px-4 py-8">
        <Link className="text-sm text-[var(--primary)]" to="/applications">Back to Applications</Link>
        <div className="mt-6 rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-8">Application not found.</div>
      </section>
    );
  }
  const currentApp = app;

  function save(event: FormEvent) {
    event.preventDefault();
    updateApplication(currentApp.id, {
      stage: draft.stage as ApplicationStage,
      applicationDate: draft.applicationDate || null,
      finalStatus: draft.finalStatus || null,
      notes: draft.notes || null,
      fields: {
        opportunity: draft.opportunity,
        institution: draft.institution,
        location: draft.location || null,
        researchAreas: draft.researchAreas.split(";").map((item) => item.trim()).filter(Boolean),
        fitScore: draft.fitScore ? Number(draft.fitScore) : null,
        funding: draft.funding || null,
        deadline: draft.deadline || null,
        deadlineText: draft.deadline || currentApp.deadlineText,
        international: draft.international || null,
        officialUrl: draft.officialUrl || null,
      },
    });
    setEditing(false);
  }

  function updateTask(taskId: string, patch: { status?: TaskStatus; notes?: string | null; evidenceUrl?: string | null; required?: boolean }) {
    updateApplication(currentApp.id, {
      taskStates: patch.status ? { [taskId]: patch.status } : undefined,
      taskNotes: patch.notes !== undefined ? { [taskId]: patch.notes } : undefined,
      taskEvidence: patch.evidenceUrl !== undefined ? { [taskId]: patch.evidenceUrl } : undefined,
      taskRequired: patch.required !== undefined ? { [taskId]: patch.required } : undefined,
    });
  }

  return (
    <section className="page-enter mx-auto max-w-6xl px-4 py-5 sm:px-6">
      <button className="focus-ring mb-4 inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm text-stone-600 hover:bg-stone-100" onClick={() => navigate("/applications")}>
        <ArrowLeft size={16} /> Applications
      </button>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="max-w-4xl text-2xl font-semibold leading-tight">{app.opportunity}</h1>
          <p className="text-sm text-stone-600">{app.institution} · {app.location || "Not specified"}</p>
        </div>
        <button className="focus-ring inline-flex items-center gap-2 rounded-md border border-stone-300 bg-[#FFFCF7] px-3 py-2 text-sm" onClick={() => setEditing((value) => !value)}>
          <Save size={16} /> {editing ? "Close edit" : "Edit"}
        </button>
      </header>

      <div className="mb-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={save} className="rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge tone={app.stage}>{stageLabel(app.stage)}</Badge>
            <Badge tone="gray">Deadline {formatDate(app.deadline)}</Badge>
            <Badge tone="gray">Fit {app.fitScore ? `${app.fitScore}/10` : "—"}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {editing ? (
              <>
                <label className="text-sm">Opportunity<input className="mt-1 w-full rounded-md border px-2 py-2" value={draft.opportunity} onChange={(e) => setDraft({ ...draft, opportunity: e.target.value })} /></label>
                <label className="text-sm">Institution<input className="mt-1 w-full rounded-md border px-2 py-2" value={draft.institution} onChange={(e) => setDraft({ ...draft, institution: e.target.value })} /></label>
                <label className="text-sm">Location<input className="mt-1 w-full rounded-md border px-2 py-2" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} /></label>
                <label className="text-sm">Fit score<input type="number" min="0" max="10" step="0.1" className="mt-1 w-full rounded-md border px-2 py-2" value={draft.fitScore} onChange={(e) => setDraft({ ...draft, fitScore: e.target.value })} /></label>
                <label className="text-sm">Deadline<input type="date" className="mt-1 w-full rounded-md border px-2 py-2" value={draft.deadline} onInput={(e) => setDraft({ ...draft, deadline: e.currentTarget.value })} onChange={(e) => setDraft({ ...draft, deadline: e.target.value })} /></label>
                <label className="text-sm">Stage<select className="mt-1 w-full rounded-md border px-2 py-2" value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value as ApplicationStage })}>{stageOptions.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}</select></label>
                <label className="text-sm">Application date<input type="date" className="mt-1 w-full rounded-md border px-2 py-2" value={draft.applicationDate} onInput={(e) => setDraft({ ...draft, applicationDate: e.currentTarget.value })} onChange={(e) => setDraft({ ...draft, applicationDate: e.target.value })} /></label>
                <label className="text-sm">Final status<input className="mt-1 w-full rounded-md border px-2 py-2" value={draft.finalStatus} onChange={(e) => setDraft({ ...draft, finalStatus: e.target.value })} /></label>
                <label className="text-sm sm:col-span-2">Research areas<input className="mt-1 w-full rounded-md border px-2 py-2" value={draft.researchAreas} onChange={(e) => setDraft({ ...draft, researchAreas: e.target.value })} /></label>
                <label className="text-sm sm:col-span-2">Funding<textarea className="mt-1 min-h-16 w-full rounded-md border px-2 py-2" value={draft.funding} onChange={(e) => setDraft({ ...draft, funding: e.target.value })} /></label>
                <label className="text-sm">International<input className="mt-1 w-full rounded-md border px-2 py-2" value={draft.international} onChange={(e) => setDraft({ ...draft, international: e.target.value })} /></label>
                <label className="text-sm">Official URL<input type="url" className="mt-1 w-full rounded-md border px-2 py-2" value={draft.officialUrl} onChange={(e) => setDraft({ ...draft, officialUrl: e.target.value })} /></label>
                <label className="text-sm sm:col-span-2">Notes<textarea className="mt-1 min-h-24 w-full rounded-md border px-2 py-2" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></label>
                <button className="focus-ring rounded-md bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white sm:col-span-2">Save changes</button>
              </>
            ) : (
              <>
                <Info label="Funding" value={app.funding} />
                <Info label="International" value={String(app.international ?? "")} />
                <Info label="Source status" value={app.sourceStatus} />
                <Info label="Application date" value={formatDate(app.applicationDate)} />
                <Info label="Final status" value={app.finalStatus} />
                <Info label="Source verification" value={app.sourceVerification} />
                <Info label="Key notes" value={app.keyNotes} wide />
                <Info label="Notes" value={app.notes} wide />
                {app.officialUrl ? <a className="focus-ring inline-flex items-center gap-1 text-sm text-[var(--primary)]" href={app.officialUrl} target="_blank" rel="noreferrer">Official vacancy <ExternalLink size={14} /></a> : <Info label="Official vacancy URL" value={null} />}
              </>
            )}
          </div>
        </form>

        <div className="rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Application Progress</h2>
            <span className="text-sm text-stone-600">{progress.completed} / {progress.total} completed</span>
          </div>
          <div className="mb-2 text-3xl font-semibold">{progress.percent}%</div>
          <ProgressBar percent={progress.percent} />
          <p className="mt-4 text-sm text-stone-600">{app.tasks.filter((task) => task.status === "blocked").length} blocked · {app.tasks.filter((task) => task.status === "not-applicable").length} N/A</p>
        </div>
      </div>

      <div className="space-y-3">
        {groupedTasks.map(([group, tasks]) => (
          <section key={group} className="rounded-lg border border-stone-300/70 bg-[#FFFCF7]">
            <h2 className="border-b border-stone-300/70 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-stone-600">{group}</h2>
            <div className="divide-y divide-stone-200/80">
              {tasks.map((task) => (
                <details key={task.id} id={`task-${task.id}`} className="group scroll-mt-10">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm">
                    <select className="focus-ring rounded-md border border-stone-300 bg-white px-2 py-1 text-xs" value={task.status} onClick={(e) => e.stopPropagation()} onChange={(e) => updateTask(task.id, { status: e.target.value as TaskStatus })}>
                      {taskStatusOptions.map((status) => <option key={status.value} value={status.value}>{status.symbol} {status.label}</option>)}
                    </select>
                    <span className="w-5 text-center">{taskSymbol(task.status)}</span>
                    <span className="flex-1">{task.title}</span>
                    <Badge tone={task.status}>{taskStatusLabel(task.status)}</Badge>
                  </summary>
                  <div className="grid gap-3 px-4 pb-4 sm:grid-cols-3">
                    <label className="text-sm"><input type="checkbox" checked={task.required} onChange={(e) => updateTask(task.id, { required: e.target.checked })} /> Required</label>
                    <label className="text-sm sm:col-span-2">Evidence URL<input type="url" className="mt-1 w-full rounded-md border border-stone-300 px-2 py-2" value={task.evidenceUrl ?? ""} onChange={(e) => updateTask(task.id, { evidenceUrl: e.target.value || null })} /></label>
                    <label className="text-sm sm:col-span-3">Task notes<textarea className="mt-1 min-h-16 w-full rounded-md border border-stone-300 px-2 py-2" value={task.notes ?? ""} onChange={(e) => updateTask(task.id, { notes: e.target.value || null })} /></label>
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function Info({ label, value, wide }: { label: string; value?: string | number | null; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <div className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</div>
      <div className="mt-1 whitespace-pre-wrap text-sm text-stone-800">{value || "—"}</div>
    </div>
  );
}
