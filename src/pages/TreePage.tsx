import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { ProgressBar } from "../components/ui/ProgressBar";
import { treeNodeProgress } from "../lib/progress";
import { taskStatusLabel, taskStatusOptions, taskSymbol } from "../lib/status";
import type { CoreAsset, TaskStatus, TreeNodeRecord } from "../types";

interface Props {
  tree: TreeNodeRecord[];
  coreAssets: CoreAsset[];
  localState: { expandedTreeNodes: Record<string, boolean> };
  toggleTreeExpanded: (id: string) => void;
  setAllTreeExpanded: (expanded: boolean) => void;
  updateTreeNode: (id: string, patch: { status?: TaskStatus; notes?: string | null }) => void;
}

export function TreePage({ tree, coreAssets, localState, toggleTreeExpanded, setAllTreeExpanded, updateTreeNode }: Props) {
  const [searchParams] = useSearchParams();
  const [selected, setSelected] = useState(tree[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const selectedNode = tree.find((node) => node.id === selected) ?? tree[0];
  const selectedHasChildren = selectedNode ? tree.some((node) => node.parentId === selectedNode.id) : false;
  const selectedProgress = selectedNode ? treeNodeProgress(selectedNode, tree) : null;
  const roots = tree.filter((node) => !node.parentId);

  useEffect(() => {
    const requested = searchParams.get("node");
    if (requested && tree.some((node) => node.id === requested)) {
      setSelected(requested);
    }
  }, [searchParams, tree]);
  const visibleIds = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    const matches = new Set<string>();
    tree.forEach((node) => {
      const text = [node.title, node.meaning, node.preparation, node.notes].join(" ").toLowerCase();
      if (text.includes(q)) {
        let current: TreeNodeRecord | undefined = node;
        while (current) {
          matches.add(current.id);
          current = tree.find((candidate) => candidate.id === current?.parentId);
        }
      }
    });
    return matches;
  }, [query, tree]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
        <div className="text-xs font-semibold tracking-[0.22em] text-stone-500">TRAKKER</div>
        <h1 className="text-2xl font-semibold">Application Tree</h1>
        </div>
        <div className="flex gap-2">
          <button className="focus-ring inline-flex items-center gap-2 rounded-md border border-stone-300 bg-[#FFFCF7] px-3 py-2 text-sm" onClick={() => setAllTreeExpanded(true)}><ChevronsUpDown size={16} /> Expand All</button>
          <button className="focus-ring inline-flex items-center gap-2 rounded-md border border-stone-300 bg-[#FFFCF7] px-3 py-2 text-sm" onClick={() => setAllTreeExpanded(false)}><ChevronsDownUp size={16} /> Collapse All</button>
        </div>
      </header>
      <label className="relative mb-4 block max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={17} />
        <input className="focus-ring w-full rounded-md border border-stone-300 bg-[#FFFCF7] py-2 pl-9 pr-3 text-sm" placeholder="Search tree nodes" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-2">
          {roots.length ? roots.map((node) => <TreeRow key={node.id} node={node} tree={tree} depth={0} selected={selected} visibleIds={visibleIds} expanded={localState.expandedTreeNodes} onSelect={setSelected} onToggle={toggleTreeExpanded} onStatus={(id, status) => updateTreeNode(id, { status })} />) : <div className="p-8 text-center text-stone-600">No matching nodes.</div>}
        </div>
        {selectedNode && (
          <aside className="rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{selectedNode.title}</h2>
                <p className="text-sm text-stone-500">{selectedNode.type || "Node"} · {selectedNode.id}</p>
              </div>
              <Badge tone={selectedHasChildren && selectedProgress ? selectedProgress.status : selectedNode.status}>{taskStatusLabel(selectedHasChildren && selectedProgress ? selectedProgress.status : selectedNode.status)}</Badge>
            </div>
            {selectedProgress && <div className="mb-4 flex items-center gap-3 text-sm"><div className="min-w-0 flex-1"><ProgressBar percent={selectedProgress.percent} /></div><span className="text-stone-600">{selectedProgress.completed}/{selectedProgress.total}</span></div>}
            {!selectedHasChildren && <label className="mb-4 block text-sm">Status<select className="mt-1 w-full rounded-md border border-stone-300 px-2 py-2" value={selectedNode.status} onChange={(e) => updateTreeNode(selectedNode.id, { status: e.target.value as TaskStatus })}>{taskStatusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>}
            <Detail label="What this means" value={selectedNode.meaning} />
            <Detail label="What you need to prepare" value={selectedNode.preparation} />
            <Detail label="Priority" value={selectedNode.priority} />
            <label className="mt-3 block text-sm">Notes<textarea className="mt-1 min-h-24 w-full rounded-md border border-stone-300 px-2 py-2" value={selectedNode.notes ?? ""} onChange={(e) => updateTreeNode(selectedNode.id, { notes: e.target.value || null })} /></label>
            <div className="mt-5 border-t border-stone-300/70 pt-4">
              <h3 className="mb-2 text-sm font-semibold">Core Assets</h3>
              <div className="max-h-64 space-y-2 overflow-auto">
                {coreAssets.map((asset) => <div key={asset.id} className="rounded-md border border-stone-300/70 p-2 text-sm"><div className="font-medium">{asset.name}</div><div className="text-xs text-stone-500">{asset.format || "—"} · {asset.masterLocation || "Not specified"}</div><Badge tone={asset.status === "ready" ? "green" : "gray"}>{asset.status.replace("-", " ")}</Badge></div>)}
              </div>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}

function TreeRow({ node, tree, depth, selected, visibleIds, expanded, onSelect, onToggle, onStatus }: { node: TreeNodeRecord; tree: TreeNodeRecord[]; depth: number; selected: string; visibleIds: Set<string> | null; expanded: Record<string, boolean>; onSelect: (id: string) => void; onToggle: (id: string) => void; onStatus: (id: string, status: TaskStatus) => void }) {
  const children = tree.filter((item) => item.parentId === node.id);
  const isExpanded = expanded[node.id] ?? depth < 1;
  const progress = treeNodeProgress(node, tree);
  if (visibleIds && !visibleIds.has(node.id)) return null;
  return (
    <div>
      <div className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm ${selected === node.id ? "bg-[#6B1F2A]/10" : "hover:bg-stone-100"}`} style={{ paddingLeft: `${8 + depth * 18}px` }}>
        <button className="focus-ring rounded p-1" aria-label={isExpanded ? "Collapse node" : "Expand node"} onClick={() => onToggle(node.id)} disabled={!children.length}>
          {children.length ? (isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />) : <span className="block w-[15px]" />}
        </button>
        <button className="focus-ring rounded px-1" aria-label={`Mark ${node.title} ${progress.status === "completed" ? "not started" : "completed"}`} onClick={() => !children.length && onStatus(node.id, progress.status === "completed" ? "not-started" : "completed")} disabled={Boolean(children.length)}>
          <span className="w-5 text-center">{taskSymbol(progress.status)}</span>
        </button>
        <button className="focus-ring flex flex-1 items-center gap-2 rounded text-left" onClick={() => onSelect(node.id)}>
          <span className="min-w-0 flex-1 truncate">{node.title}</span>
          <span className="hidden w-24 sm:block"><ProgressBar percent={progress.percent} /></span>
          <span className="w-20 text-right text-xs text-stone-500">{progress.completed}/{progress.total}</span>
        </button>
      </div>
      {isExpanded && children.map((child) => <TreeRow key={child.id} node={child} tree={tree} depth={depth + 1} selected={selected} visibleIds={visibleIds} expanded={expanded} onSelect={onSelect} onToggle={onToggle} onStatus={onStatus} />)}
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="mt-3">
      <div className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</div>
      <div className="mt-1 whitespace-pre-wrap text-sm text-stone-800">{value || "—"}</div>
    </div>
  );
}
