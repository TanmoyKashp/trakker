import { Filter, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApplicationCard } from "../components/applications/ApplicationCard";
import { deadlineState } from "../lib/dates";
import type { Application } from "../types";

interface Props {
  applications: Application[];
  createApplication: (input: Pick<Application, "opportunity" | "institution"> & Partial<Application>) => Application;
  resetLocalData: () => void;
}

type FilterValue = "all" | "active" | "urgent" | "preparing" | "ready" | "submitted" | "interview" | "offer" | "rejected" | "expired";
type SortValue = "deadline" | "fit" | "priority" | "institution" | "status";

export function ApplicationsPage({ applications, createApplication, resetLocalData }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("active");
  const [sort, setSort] = useState<SortValue>("deadline");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ opportunity: "", institution: "", location: "", researchAreas: "", fitScore: "", deadline: "", funding: "", international: "", officialUrl: "", notes: "" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications
      .filter((app) => {
        const haystack = [app.opportunity, app.institution, app.location, app.notes, app.keyNotes, ...app.researchAreas].join(" ").toLowerCase();
        const matchesQuery = !q || haystack.includes(q);
        const statusText = (app.sourceStatus ?? "").toLowerCase();
        const matchesFilter =
          filter === "all" ||
          (filter === "active" && statusText.includes("active")) ||
          (filter === "urgent" && (statusText.includes("urgent") || deadlineState(app.deadline, app.deadlineText, app.sourceStatus).days <= 7)) ||
          app.stage === filter;
        return matchesQuery && matchesFilter;
      })
      .sort((a, b) => {
        if (sort === "fit") return (b.fitScore ?? -1) - (a.fitScore ?? -1);
        if (sort === "priority") return Number(a.sourcePriority ?? 999) - Number(b.sourcePriority ?? 999);
        if (sort === "institution") return a.institution.localeCompare(b.institution);
        if (sort === "status") return a.stage.localeCompare(b.stage);
        return deadlineState(a.deadline, a.deadlineText, a.sourceStatus).days - deadlineState(b.deadline, b.deadlineText, b.sourceStatus).days;
      });
  }, [applications, filter, query, sort]);

  const metrics = {
    total: applications.length,
    active: applications.filter((app) => app.sourceStatus?.toLowerCase().includes("active")).length,
    urgent: applications.filter((app) => app.sourceStatus?.toLowerCase().includes("urgent") || deadlineState(app.deadline, app.deadlineText, app.sourceStatus).days <= 7).length,
    ready: applications.filter((app) => app.stage === "ready").length,
    submitted: applications.filter((app) => ["submitted", "interview", "offer", "accepted", "rejected"].includes(app.stage)).length,
  };

  function submitForm(event: React.FormEvent) {
    event.preventDefault();
    if (!form.opportunity.trim() || !form.institution.trim()) return;
    const created = createApplication({
      opportunity: form.opportunity.trim(),
      institution: form.institution.trim(),
      location: form.location || null,
      researchAreas: form.researchAreas.split(";").map((item) => item.trim()).filter(Boolean),
      fitScore: form.fitScore ? Number(form.fitScore) : null,
      deadline: form.deadline || null,
      funding: form.funding || null,
      international: form.international || null,
      officialUrl: form.officialUrl || null,
      notes: form.notes || null,
    });
    navigate(`/applications/${created.id}`);
  }

  return (
    <section className="page-enter mx-auto max-w-7xl px-4 py-5 sm:px-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold tracking-[0.22em] text-stone-500">TRAKKER</div>
          <h1 className="text-2xl font-semibold">Applications</h1>
        </div>
        <button className="focus-ring inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)]" onClick={() => setShowForm((value) => !value)}>
          <Plus size={16} /> New Application
        </button>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {Object.entries(metrics).map(([label, value]) => (
          <div key={label} className="rounded-lg border border-stone-300/70 bg-[#FFFCF7] px-3 py-2">
            <div className="text-xs capitalize text-stone-500">{label}</div>
            <div className="text-xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={submitForm} className="mb-4 grid gap-3 rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">Opportunity<input className="mt-1 w-full rounded-md border border-stone-300 px-2 py-2" value={form.opportunity} onChange={(e) => setForm({ ...form, opportunity: e.target.value })} required /></label>
          <label className="text-sm">Institution<input className="mt-1 w-full rounded-md border border-stone-300 px-2 py-2" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} required /></label>
          <label className="text-sm">Location<input className="mt-1 w-full rounded-md border border-stone-300 px-2 py-2" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
          <label className="text-sm">Deadline<input type="date" className="mt-1 w-full rounded-md border border-stone-300 px-2 py-2" value={form.deadline} onInput={(e) => setForm({ ...form, deadline: e.currentTarget.value })} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></label>
          <label className="text-sm">Fit score<input type="number" min="0" max="10" step="0.1" className="mt-1 w-full rounded-md border border-stone-300 px-2 py-2" value={form.fitScore} onChange={(e) => setForm({ ...form, fitScore: e.target.value })} /></label>
          <label className="text-sm">Research areas<input className="mt-1 w-full rounded-md border border-stone-300 px-2 py-2" value={form.researchAreas} onChange={(e) => setForm({ ...form, researchAreas: e.target.value })} /></label>
          <label className="text-sm">Funding<input className="mt-1 w-full rounded-md border border-stone-300 px-2 py-2" value={form.funding} onChange={(e) => setForm({ ...form, funding: e.target.value })} /></label>
          <label className="text-sm">International<input className="mt-1 w-full rounded-md border border-stone-300 px-2 py-2" value={form.international} onChange={(e) => setForm({ ...form, international: e.target.value })} /></label>
          <label className="text-sm sm:col-span-2">Official URL<input type="url" className="mt-1 w-full rounded-md border border-stone-300 px-2 py-2" value={form.officialUrl} onChange={(e) => setForm({ ...form, officialUrl: e.target.value })} /></label>
          <label className="text-sm sm:col-span-2">Notes<textarea className="mt-1 min-h-20 w-full rounded-md border border-stone-300 px-2 py-2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          <div className="sm:col-span-2 lg:col-span-4"><button className="focus-ring rounded-md bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white">Create application</button></div>
        </form>
      )}

      <div className="mb-4 grid gap-2 lg:grid-cols-[1fr_180px_180px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={17} />
          <input className="focus-ring w-full rounded-md border border-stone-300 bg-[#FFFCF7] py-2 pl-9 pr-3 text-sm" placeholder="Search opportunities, institutions, locations, areas, notes" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label className="relative">
          <Filter className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={17} />
          <select className="focus-ring w-full rounded-md border border-stone-300 bg-[#FFFCF7] py-2 pl-9 pr-3 text-sm" value={filter} onChange={(e) => setFilter(e.target.value as FilterValue)}>
            {["all", "active", "urgent", "preparing", "ready", "submitted", "interview", "offer", "rejected", "expired"].map((value) => <option key={value} value={value}>{value.replace("-", " ")}</option>)}
          </select>
        </label>
        <select className="focus-ring rounded-md border border-stone-300 bg-[#FFFCF7] px-3 py-2 text-sm" value={sort} onChange={(e) => setSort(e.target.value as SortValue)}>
          <option value="deadline">Sort by deadline</option>
          <option value="fit">Sort by fit score</option>
          <option value="priority">Sort by priority</option>
          <option value="institution">Sort by institution</option>
          <option value="status">Sort by status</option>
        </select>
      </div>

      {filtered.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filtered.map((app) => <ApplicationCard key={app.id} app={app} />)}</div> : <div className="rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-8 text-center text-stone-600">No applications match your filters.</div>}
      <div className="mt-6 flex justify-end">
        <button className="focus-ring rounded-md border border-rose-200 px-3 py-2 text-xs text-rose-700" onClick={() => confirm("This will remove locally saved application progress, statuses, notes and custom applications from this browser. Your GitHub source data will not be affected.") && resetLocalData()}>Reset local Trakker data</button>
      </div>
    </section>
  );
}
