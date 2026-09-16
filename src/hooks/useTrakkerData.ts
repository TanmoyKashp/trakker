import { useEffect, useMemo, useState } from "react";
import { bundledReferenceData, loadReferenceData } from "../lib/referenceData";
import type { Application, ApplicationOverride, ApplicationStage, LocalState, ReferenceData, TaskStatus, TreeNodeRecord } from "../types";
import { useLocalStorage } from "./useLocalStorage";

const emptyLocalState: LocalState = {
  applicationOverrides: {},
  customApplications: [],
  treeOverrides: {},
  expandedTreeNodes: { "1": true },
};

function mergeApplication(app: Application, override?: ApplicationOverride): Application {
  if (!override) return app;
  return {
    ...app,
    ...override.fields,
    stage: override.stage ?? app.stage,
    applicationDate: override.applicationDate ?? app.applicationDate,
    finalStatus: override.finalStatus ?? app.finalStatus,
    notes: override.notes ?? app.notes,
    updatedAt: override.updatedAt ?? app.updatedAt,
    tasks: app.tasks.map((task) => ({
      ...task,
      required: override.taskRequired?.[task.id] ?? task.required,
      status: override.taskStates?.[task.id] ?? task.status,
      notes: override.taskNotes?.[task.id] ?? task.notes,
      evidenceUrl: override.taskEvidence?.[task.id] ?? task.evidenceUrl,
    })),
  };
}

function mergeTreeNode(node: TreeNodeRecord, local: LocalState): TreeNodeRecord {
  const override = local.treeOverrides[node.id];
  return override ? { ...node, status: override.status ?? node.status, notes: override.notes ?? node.notes } : node;
}

import { syncPhdToFirestore } from "../lib/firestoreSync";
import { isOwnerUser } from "../lib/owner";
import { auth } from "../lib/firebase";

export function useTrakkerData(userId?: string | null) {
  const isOwner = isOwnerUser(auth?.currentUser);
  const [reference, setReference] = useState<ReferenceData>(isOwner ? bundledReferenceData : { applications: [], tree: [], applicationTemplate: [], coreAssets: [] });
  const [offline, setOffline] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [localState, setLocalState] = useLocalStorage<LocalState>("trakker:v1", emptyLocalState);

  // Listen for remote Firestore sync updates
  useEffect(() => {
    if (!isOwner) return;

    function handleRemoteSync(event: Event) {
      const customEvent = event as CustomEvent<Partial<LocalState>>;
      if (customEvent.detail) {
        setLocalState((current) => ({
          ...current,
          applicationOverrides: customEvent.detail.applicationOverrides || current.applicationOverrides,
          customApplications: customEvent.detail.customApplications || current.customApplications,
          treeOverrides: customEvent.detail.treeOverrides || current.treeOverrides,
          expandedTreeNodes: customEvent.detail.expandedTreeNodes || current.expandedTreeNodes,
        }));
      }
    }

    function handleRefSync(event: Event) {
      const customEvent = event as CustomEvent<ReferenceData>;
      if (customEvent.detail) {
        setReference(customEvent.detail);
      }
    }

    window.addEventListener("trakker:sync:phd", handleRemoteSync);
    window.addEventListener("trakker:sync:reference", handleRefSync);
    return () => {
      window.removeEventListener("trakker:sync:phd", handleRemoteSync);
      window.removeEventListener("trakker:sync:reference", handleRefSync);
    };
  }, [isOwner, setLocalState]);

  // Sync to Firestore on local changes (owner only)
  useEffect(() => {
    if (userId && isOwner) {
      syncPhdToFirestore(userId, localState);
    }
  }, [localState, userId, isOwner]);

  useEffect(() => {
    if (!isOwner) return;
    void loadReferenceData().then((result) => {
      setReference(result.data);
      setOffline(result.offline);
      setLoadError(result.error);
      setLocalState((current) => ({ ...current, lastReferenceData: result.data }));
    });
  }, [isOwner, setLocalState]);

  const applications = useMemo(
    () => [
      ...reference.applications.map((app) => mergeApplication(app, localState.applicationOverrides[app.id])),
      ...localState.customApplications.filter((app) => !(app as { deletedAt?: string | null }).deletedAt),
    ],
    [reference.applications, localState.applicationOverrides, localState.customApplications],
  );

  const tree = useMemo(() => reference.tree.map((node) => mergeTreeNode(node, localState)), [reference.tree, localState]);

  function updateApplication(id: string, patch: ApplicationOverride) {
    setLocalState((current) => {
      const nowIso = new Date().toISOString();
      const customIndex = current.customApplications.findIndex((app) => app.id === id);
      if (customIndex >= 0) {
        const nextCustom = [...current.customApplications];
        const existing = nextCustom[customIndex];
        nextCustom[customIndex] = mergeApplication(existing, { ...patch, updatedAt: nowIso });
        return { ...current, updatedAt: nowIso, customApplications: nextCustom };
      }
      const existing = current.applicationOverrides[id] ?? {};
      return {
        ...current,
        updatedAt: nowIso,
        applicationOverrides: {
          ...current.applicationOverrides,
          [id]: {
            ...existing,
            ...patch,
            fields: { ...existing.fields, ...patch.fields },
            taskStates: { ...existing.taskStates, ...patch.taskStates },
            taskNotes: { ...existing.taskNotes, ...patch.taskNotes },
            taskEvidence: { ...existing.taskEvidence, ...patch.taskEvidence },
            taskRequired: { ...existing.taskRequired, ...patch.taskRequired },
            updatedAt: nowIso,
          },
        },
      };
    });
  }

  function createApplication(input: Pick<Application, "opportunity" | "institution"> & Partial<Application>) {
    const idBase = `${input.institution}-${input.opportunity}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || crypto.randomUUID();
    const existingIds = new Set(applications.map((app) => app.id));
    let id = idBase;
    let suffix = 2;
    while (existingIds.has(id)) {
      id = `${idBase}-${suffix}`;
      suffix += 1;
    }
    const now = new Date().toISOString();
    const app: Application = {
      id,
      opportunity: input.opportunity,
      institution: input.institution,
      location: input.location ?? null,
      researchAreas: input.researchAreas ?? [],
      fitScore: input.fitScore ?? null,
      funding: input.funding ?? null,
      deadline: input.deadline ?? null,
      deadlineText: input.deadlineText ?? input.deadline ?? null,
      sourceStatus: input.sourceStatus ?? "User created",
      international: input.international ?? null,
      keyNotes: input.keyNotes ?? null,
      sourceVerification: input.sourceVerification ?? null,
      officialUrl: input.officialUrl ?? null,
      stage: "not-started",
      applicationDate: null,
      finalStatus: null,
      notes: input.notes ?? null,
      tasks: reference.applicationTemplate.map((task) => ({ ...task, status: "not-started" as TaskStatus, notes: null, evidenceUrl: null })),
      createdAt: now,
      updatedAt: now,
      isCustom: true,
    };
    setLocalState((current) => ({
      ...current,
      updatedAt: now,
      customApplications: [...current.customApplications, app],
    }));
    return app;
  }

  function updateTreeNode(id: string, patch: { status?: TaskStatus; notes?: string | null }) {
    const nowIso = new Date().toISOString();
    setLocalState((current) => ({
      ...current,
      updatedAt: nowIso,
      treeOverrides: {
        ...current.treeOverrides,
        [id]: { ...current.treeOverrides[id], ...patch, updatedAt: nowIso },
      },
    }));
  }

  function toggleTreeExpanded(id: string) {
    setLocalState((current) => ({
      ...current,
      expandedTreeNodes: { ...current.expandedTreeNodes, [id]: !current.expandedTreeNodes[id] },
    }));
  }

  function setAllTreeExpanded(expanded: boolean) {
    setLocalState((current) => ({
      ...current,
      expandedTreeNodes: Object.fromEntries(reference.tree.map((node) => [node.id, expanded])),
    }));
  }

  function setStage(id: string, stage: ApplicationStage) {
    updateApplication(id, { stage });
  }

  function deleteApplication(id: string) {
    const nowIso = new Date().toISOString();
    setLocalState((current) => {
      const nextCustom = current.customApplications.map((app) =>
        app.id === id ? ({ ...app, deletedAt: nowIso, updatedAt: nowIso } as Application) : app,
      );
      const existingOverride = current.applicationOverrides[id] ?? {};
      return {
        ...current,
        updatedAt: nowIso,
        customApplications: nextCustom,
        applicationOverrides: {
          ...current.applicationOverrides,
          [id]: {
            ...existingOverride,
            updatedAt: nowIso,
          },
        },
      };
    });
  }

  function resetLocalData() {
    setLocalState(emptyLocalState);
  }

  return {
    applications,
    applicationTemplate: reference.applicationTemplate,
    tree,
    coreAssets: reference.coreAssets,
    localState,
    offline,
    loadError,
    updateApplication,
    createApplication,
    deleteApplication,
    updateTreeNode,
    toggleTreeExpanded,
    setAllTreeExpanded,
    setStage,
    resetLocalData,
  };
}
