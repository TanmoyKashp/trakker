import { deadlineState, formatDate } from "./dates";
import type { Application, ApplicationTask, TreeNodeRecord } from "../types";

const terminalStages = new Set(["accepted", "rejected", "expired", "withdrawn"]);

export interface NextAction {
  kind: "application" | "tree" | "done";
  title: string;
  context?: string;
  urgency?: string;
  href?: string;
  taskId?: string;
  application?: Application;
}

export function firstIncompleteRequiredTask(app: Application): ApplicationTask | undefined {
  return app.tasks.find((task) => task.required && task.status !== "completed" && task.status !== "not-applicable");
}

export function findNextAction(applications: Application[], tree: TreeNodeRecord[]): NextAction {
  const appAction = applications
    .map((app) => ({ app, task: firstIncompleteRequiredTask(app), deadline: deadlineState(app.deadline, app.deadlineText, app.sourceStatus) }))
    .filter(({ app, task }) => task && !terminalStages.has(app.stage))
    .sort((a, b) => actionScore(a.app, a.deadline.days) - actionScore(b.app, b.deadline.days))[0];

  if (appAction.task) {
    return {
      kind: "application",
      title: appAction.task.title,
      context: `${appAction.app.opportunity} · ${appAction.app.institution}`,
      urgency: `${appAction.deadline.label}${appAction.app.deadline ? ` · ${formatDate(appAction.app.deadline)}` : ""}`,
      href: `/applications/${appAction.app.id}#task-${appAction.task.id}`,
      taskId: appAction.task.id,
      application: appAction.app,
    };
  }

  const treeTask = tree.find((node) => !tree.some((child) => child.parentId === node.id) && node.status !== "completed" && node.status !== "not-applicable");
  if (treeTask) {
    return {
      kind: "tree",
      title: treeTask.title,
      context: "Application Tree",
      urgency: treeTask.priority ? `${treeTask.priority} preparation task` : "Preparation task",
      href: `/tree?node=${encodeURIComponent(treeTask.id)}`,
    };
  }

  return { kind: "done", title: "You're up to date." };
}

export function nextDeadline(applications: Application[]) {
  return applications
    .map((app) => ({ app, deadline: deadlineState(app.deadline, app.deadlineText, app.sourceStatus) }))
    .filter(({ app, deadline }) => app.deadline && !terminalStages.has(app.stage) && Number.isFinite(deadline.days))
    .sort((a, b) => a.deadline.days - b.deadline.days)[0];
}

function actionScore(app: Application, days: number) {
  const deadlineScore = Number.isFinite(days) ? Math.max(days, -10) : 60;
  const sourceBoost = app.sourceStatus?.toLowerCase().includes("urgent") ? -15 : 0;
  const stageBoost = ({
    ready: -8,
    preparing: -6,
    researching: -3,
    submitted: 20,
    interview: 25,
    offer: 30,
    "not-started": 0,
    accepted: 10,
    rejected: 10,
    expired: 10,
    withdrawn: 10,
  } satisfies Record<Application["stage"], number>)[app.stage] ?? 10;
  return deadlineScore + sourceBoost + stageBoost + Number(app.sourcePriority ?? 9) * 0.5;
}
