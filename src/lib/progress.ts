import type { ApplicationTask, TaskStatus, TreeNodeRecord } from "../types";

export interface Progress {
  completed: number;
  total: number;
  percent: number;
  status: TaskStatus;
}

export function calculateProgress(tasks: Pick<ApplicationTask, "status">[]): Progress {
  const applicable = tasks.filter((task) => task.status !== "not-applicable");
  const completed = applicable.filter((task) => task.status === "completed").length;
  const total = applicable.length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const status: TaskStatus =
    total === 0 ? "not-applicable" : completed === total ? "completed" : applicable.some((task) => task.status === "blocked") ? "blocked" : applicable.some((task) => task.status === "in-progress" || task.status === "completed") ? "in-progress" : "not-started";
  return { completed, total, percent, status };
}

export function descendantsFor(nodeId: string, nodes: TreeNodeRecord[]): TreeNodeRecord[] {
  const children = nodes.filter((node) => node.parentId === nodeId);
  return children.flatMap((child) => [child, ...descendantsFor(child.id, nodes)]);
}

export function treeNodeProgress(node: TreeNodeRecord, nodes: TreeNodeRecord[]): Progress {
  const descendants = descendantsFor(node.id, nodes);
  const leaves = descendants.filter((item) => !nodes.some((child) => child.parentId === item.id));
  if (!leaves.length) {
    return calculateProgress([{ status: node.status }]);
  }
  const progress = calculateProgress(leaves.map((item) => ({ status: item.status })));
  return {
    ...progress,
    status: progress.completed === 0 ? "not-started" : progress.completed === progress.total ? "completed" : "in-progress",
  };
}
