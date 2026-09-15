import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { db } from "./firebase";
import type {
  Application,
  ApplicationOverride,
  Goal,
  Meeting,
  QuickIdea,
  Routine,
  Task,
  TrakkerOsState,
  TreeOverride,
  WorkoutItem,
  WorkoutSettings,
} from "../types";

export const STORAGE_KEY_OS = "trakker:os:v2";
export const STORAGE_KEY_IDEAS = "trakker:ideas:v1";
export const STORAGE_KEY_PHD = "trakker:v1";

export interface FirestoreOsData {
  mode: "work" | "personal";
  tasks: Task[];
  meetings: Meeting[];
  routines: Routine[];
  routineCompletions: Record<string, string>;
  workout: WorkoutSettings;
  workouts: WorkoutItem[];
  goals: Goal[];
  updatedAt: string;
}

export interface FirestoreIdeasData {
  ideas: QuickIdea[];
  updatedAt: string;
}

export interface FirestorePhdData {
  applicationOverrides: Record<string, ApplicationOverride>;
  customApplications: Application[];
  treeOverrides: Record<string, TreeOverride>;
  updatedAt: string;
}

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

let currentSyncStatus: SyncStatus = typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "idle";
let lastSyncedAt: Date | null = null;
const statusListeners = new Set<(status: SyncStatus, lastSync: Date | null) => void>();

export function setSyncStatus(status: SyncStatus) {
  currentSyncStatus = status;
  if (status === "synced") {
    lastSyncedAt = new Date();
  }
  for (const listener of statusListeners) {
    try {
      listener(currentSyncStatus, lastSyncedAt);
    } catch {
      // ignore listener error
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("trakker:sync:status", {
        detail: { status: currentSyncStatus, lastSyncedAt },
      }),
    );
  }
}

export function getSyncStatus(): { status: SyncStatus; lastSyncedAt: Date | null } {
  return { status: currentSyncStatus, lastSyncedAt };
}

export function subscribeSyncStatus(
  callback: (status: SyncStatus, lastSync: Date | null) => void,
): () => void {
  statusListeners.add(callback);
  callback(currentSyncStatus, lastSyncedAt);
  return () => {
    statusListeners.delete(callback);
  };
}

/**
 * Strips all `undefined` values recursively so Firestore setDoc never throws
 * "Unsupported field value: undefined".
 */
export function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => (value === undefined ? null : value)),
  ) as T;
}

/**
 * Merges arrays of items with stable IDs, handling soft-deletes (deletedAt)
 * and timestamp conflict resolution deterministically.
 */
export function mergeItemsById<
  T extends { id: string; updatedAt?: string; createdAt?: string; deletedAt?: string | null }
>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();

  function getTimestamp(item: T): string {
    return item.updatedAt || item.deletedAt || item.createdAt || "";
  }

  for (const item of remote || []) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }

  for (const item of local || []) {
    if (!item || !item.id) continue;
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else {
      const existingTime = getTimestamp(existing);
      const localTime = getTimestamp(item);

      if (localTime >= existingTime) {
        // Local is newer or equal
        map.set(item.id, { ...existing, ...item });
      } else {
        // Remote is newer
        map.set(item.id, { ...item, ...existing });
      }
    }
  }

  return Array.from(map.values());
}

/** Merges simple dictionary records. */
export function mergeSimpleRecords<T>(
  local?: Record<string, T>,
  remote?: Record<string, T>,
): Record<string, T> {
  return { ...(remote || {}), ...(local || {}) };
}

/** Deep merges PhD application overrides by application ID. */
export function mergeApplicationOverrides(
  local?: Record<string, ApplicationOverride>,
  remote?: Record<string, ApplicationOverride>,
): Record<string, ApplicationOverride> {
  const result: Record<string, ApplicationOverride> = { ...(remote || {}) };
  if (!local) return result;

  for (const [id, localOverride] of Object.entries(local)) {
    const remoteOverride = result[id];
    if (!remoteOverride) {
      result[id] = localOverride;
    } else {
      const localTime = localOverride.updatedAt || "";
      const remoteTime = remoteOverride.updatedAt || "";
      if (localTime >= remoteTime) {
        result[id] = {
          ...remoteOverride,
          ...localOverride,
          fields: { ...(remoteOverride.fields || {}), ...(localOverride.fields || {}) },
          taskStates: { ...(remoteOverride.taskStates || {}), ...(localOverride.taskStates || {}) },
          taskNotes: { ...(remoteOverride.taskNotes || {}), ...(localOverride.taskNotes || {}) },
          taskEvidence: { ...(remoteOverride.taskEvidence || {}), ...(localOverride.taskEvidence || {}) },
          taskRequired: { ...(remoteOverride.taskRequired || {}), ...(localOverride.taskRequired || {}) },
          updatedAt: localTime || remoteTime || new Date().toISOString(),
        };
      }
    }
  }
  return result;
}

// Active Firestore subscriptions
let activeUnsubscribes: Unsubscribe[] = [];
let currentSyncUid: string | null = null;
let isApplyingRemoteChange = false;
let lastRemoteOsUpdatedAt: string | null = null;
let lastRemoteIdeasUpdatedAt: string | null = null;
let lastRemotePhdUpdatedAt: string | null = null;

function readLocalJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeLocalJson<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage quota or private mode
  }
}

/**
 * Performs an immediate full bi-directional sync with Firestore.
 * Pushes local changes, pulls remote changes, merges safely, and updates state.
 */
export async function performFullSync(uid: string): Promise<boolean> {
  if (!db) return false;

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    setSyncStatus("offline");
    return false;
  }

  setSyncStatus("syncing");
  const firestore = db;
  const osDocRef = doc(firestore, "users", uid, "data", "os");
  const ideasDocRef = doc(firestore, "users", uid, "data", "quickIdeas");
  const phdDocRef = doc(firestore, "users", uid, "data", "phd");

  try {
    const [osSnap, ideasSnap, phdSnap] = await Promise.all([
      getDoc(osDocRef),
      getDoc(ideasDocRef),
      getDoc(phdDocRef),
    ]);

    const nowIso = new Date().toISOString();

    // 1. OS Data (tasks, meetings, routines, workouts, goals, mode)
    const localOs = readLocalJson<TrakkerOsState>(STORAGE_KEY_OS);
    const remoteOs = osSnap.exists() ? (osSnap.data() as FirestoreOsData) : null;

    if (remoteOs || localOs) {
      const mergedTasks = mergeItemsById(localOs?.tasks || [], remoteOs?.tasks || []);
      const mergedMeetings = mergeItemsById(localOs?.meetings || [], remoteOs?.meetings || []);
      const mergedRoutines = mergeItemsById(localOs?.routines || [], remoteOs?.routines || []);
      const mergedWorkouts = mergeItemsById(localOs?.workouts || [], remoteOs?.workouts || []);
      const mergedGoals = mergeItemsById(localOs?.goals || [], remoteOs?.goals || []);
      const mergedRoutineCompletions = mergeSimpleRecords(
        localOs?.routineCompletions,
        remoteOs?.routineCompletions,
      );

      const mergedOs: TrakkerOsState = {
        version: 2,
        mode: remoteOs?.mode || localOs?.mode || "work",
        tasks: mergedTasks,
        meetings: mergedMeetings,
        routines: mergedRoutines,
        routineCompletions: mergedRoutineCompletions,
        workout: remoteOs?.workout || localOs?.workout || { enabled: true, startTime: "17:00" },
        workouts: mergedWorkouts.length ? mergedWorkouts : (localOs?.workouts || []),
        goals: mergedGoals,
        updatedAt: nowIso,
      };

      isApplyingRemoteChange = true;
      writeLocalJson(STORAGE_KEY_OS, mergedOs);
      window.dispatchEvent(new CustomEvent("trakker:sync:os", { detail: mergedOs }));
      setTimeout(() => {
        isApplyingRemoteChange = false;
      }, 600);

      const osPayload = sanitizeForFirestore<FirestoreOsData>({
        mode: mergedOs.mode,
        tasks: mergedOs.tasks,
        meetings: mergedOs.meetings,
        routines: mergedOs.routines,
        routineCompletions: mergedOs.routineCompletions,
        workout: mergedOs.workout,
        workouts: mergedOs.workouts,
        goals: mergedOs.goals,
        updatedAt: nowIso,
      });
      await setDoc(osDocRef, osPayload, { merge: true });
      lastRemoteOsUpdatedAt = nowIso;
    }

    // 2. Quick Ideas Data
    const localIdeas = readLocalJson<QuickIdea[]>(STORAGE_KEY_IDEAS) || [];
    const remoteIdeas = ideasSnap.exists() ? (ideasSnap.data() as FirestoreIdeasData)?.ideas || [] : [];

    if (localIdeas.length || remoteIdeas.length) {
      const mergedIdeas = mergeItemsById(localIdeas, remoteIdeas);
      isApplyingRemoteChange = true;
      writeLocalJson(STORAGE_KEY_IDEAS, mergedIdeas);
      window.dispatchEvent(new CustomEvent("trakker:sync:ideas", { detail: mergedIdeas }));
      setTimeout(() => {
        isApplyingRemoteChange = false;
      }, 600);

      const ideasPayload = sanitizeForFirestore<FirestoreIdeasData>({
        ideas: mergedIdeas,
        updatedAt: nowIso,
      });
      await setDoc(ideasDocRef, ideasPayload, { merge: true });
      lastRemoteIdeasUpdatedAt = nowIso;
    }

    // 3. PhD Data
    interface LocalStateRaw {
      applicationOverrides?: Record<string, ApplicationOverride>;
      customApplications?: Application[];
      treeOverrides?: Record<string, TreeOverride>;
      expandedTreeNodes?: Record<string, boolean>;
      lastReferenceData?: unknown;
      updatedAt?: string;
    }
    const localPhd = readLocalJson<LocalStateRaw>(STORAGE_KEY_PHD);
    const remotePhd = phdSnap.exists() ? (phdSnap.data() as FirestorePhdData) : null;

    if (localPhd || remotePhd) {
      const mergedAppOverrides = mergeApplicationOverrides(
        localPhd?.applicationOverrides,
        remotePhd?.applicationOverrides,
      );
      const mergedCustomApps = mergeItemsById(
        localPhd?.customApplications || [],
        remotePhd?.customApplications || [],
      );
      const mergedTreeOverrides = mergeSimpleRecords(
        localPhd?.treeOverrides,
        remotePhd?.treeOverrides,
      );

      const mergedPhdState = {
        ...(localPhd || {}),
        applicationOverrides: mergedAppOverrides,
        customApplications: mergedCustomApps,
        treeOverrides: mergedTreeOverrides,
        expandedTreeNodes: localPhd?.expandedTreeNodes || { "1": true },
        updatedAt: nowIso,
      };

      isApplyingRemoteChange = true;
      writeLocalJson(STORAGE_KEY_PHD, mergedPhdState);
      window.dispatchEvent(new CustomEvent("trakker:sync:phd", { detail: mergedPhdState }));
      setTimeout(() => {
        isApplyingRemoteChange = false;
      }, 600);

      const phdPayload = sanitizeForFirestore<FirestorePhdData>({
        applicationOverrides: mergedAppOverrides,
        customApplications: mergedCustomApps,
        treeOverrides: mergedTreeOverrides,
        updatedAt: nowIso,
      });
      await setDoc(phdDocRef, phdPayload, { merge: true });
      lastRemotePhdUpdatedAt = nowIso;
    }

    setSyncStatus("synced");
    return true;
  } catch (err) {
    console.error("Full Firestore sync failed:", err);
    setSyncStatus("error");
    return false;
  }
}

/**
 * Starts background sync with Firestore for the authenticated user.
 */
export async function startFirestoreSync(uid: string): Promise<() => void> {
  if (!db || currentSyncUid === uid) {
    return () => {};
  }

  stopFirestoreSync();
  currentSyncUid = uid;

  const firestore = db;
  const osDocRef = doc(firestore, "users", uid, "data", "os");
  const ideasDocRef = doc(firestore, "users", uid, "data", "quickIdeas");
  const phdDocRef = doc(firestore, "users", uid, "data", "phd");

  // Step 1: Initial full bi-directional sync & migration
  await performFullSync(uid);

  // Step 2: Real-time listeners for remote changes from other devices
  const unsubOs = onSnapshot(
    osDocRef,
    (snap) => {
      if (!snap.exists() || isApplyingRemoteChange) return;
      const remote = snap.data() as FirestoreOsData;
      if (remote.updatedAt && remote.updatedAt === lastRemoteOsUpdatedAt) return;

      lastRemoteOsUpdatedAt = remote.updatedAt;
      const local = readLocalJson<TrakkerOsState>(STORAGE_KEY_OS);

      const mergedTasks = mergeItemsById(local?.tasks || [], remote.tasks || []);
      const mergedMeetings = mergeItemsById(local?.meetings || [], remote.meetings || []);
      const mergedRoutines = mergeItemsById(local?.routines || [], remote.routines || []);
      const mergedWorkouts = mergeItemsById(local?.workouts || [], remote.workouts || []);
      const mergedGoals = mergeItemsById(local?.goals || [], remote.goals || []);
      const mergedCompletions = mergeSimpleRecords(local?.routineCompletions, remote.routineCompletions);

      const nextState: TrakkerOsState = {
        version: 2,
        mode: remote.mode || local?.mode || "work",
        tasks: mergedTasks,
        meetings: mergedMeetings,
        routines: mergedRoutines,
        routineCompletions: mergedCompletions,
        workout: remote.workout || local?.workout || { enabled: true, startTime: "17:00" },
        workouts: mergedWorkouts.length ? mergedWorkouts : (local?.workouts || []),
        goals: mergedGoals,
        updatedAt: remote.updatedAt,
      };

      isApplyingRemoteChange = true;
      writeLocalJson(STORAGE_KEY_OS, nextState);
      window.dispatchEvent(new CustomEvent("trakker:sync:os", { detail: nextState }));
      setSyncStatus("synced");
      setTimeout(() => {
        isApplyingRemoteChange = false;
      }, 600);
    },
    (err) => {
      console.warn("Firestore OS listener error (offline or permission):", err);
      setSyncStatus("error");
    },
  );

  const unsubIdeas = onSnapshot(
    ideasDocRef,
    (snap) => {
      if (!snap.exists() || isApplyingRemoteChange) return;
      const remote = snap.data() as FirestoreIdeasData;
      if (remote.updatedAt && remote.updatedAt === lastRemoteIdeasUpdatedAt) return;

      lastRemoteIdeasUpdatedAt = remote.updatedAt;
      const local = readLocalJson<QuickIdea[]>(STORAGE_KEY_IDEAS) || [];

      const mergedIdeas = mergeItemsById(local, remote.ideas || []);
      isApplyingRemoteChange = true;
      writeLocalJson(STORAGE_KEY_IDEAS, mergedIdeas);
      window.dispatchEvent(new CustomEvent("trakker:sync:ideas", { detail: mergedIdeas }));
      setSyncStatus("synced");
      setTimeout(() => {
        isApplyingRemoteChange = false;
      }, 600);
    },
    (err) => {
      console.warn("Firestore ideas listener error:", err);
    },
  );

  const unsubPhd = onSnapshot(
    phdDocRef,
    (snap) => {
      if (!snap.exists() || isApplyingRemoteChange) return;
      const remote = snap.data() as FirestorePhdData;
      if (remote.updatedAt && remote.updatedAt === lastRemotePhdUpdatedAt) return;

      lastRemotePhdUpdatedAt = remote.updatedAt;
      interface LocalStateRaw {
        applicationOverrides?: Record<string, ApplicationOverride>;
        customApplications?: Application[];
        treeOverrides?: Record<string, TreeOverride>;
        expandedTreeNodes?: Record<string, boolean>;
        lastReferenceData?: unknown;
        updatedAt?: string;
      }
      const local = readLocalJson<LocalStateRaw>(STORAGE_KEY_PHD);

      const mergedAppOverrides = mergeApplicationOverrides(
        local?.applicationOverrides,
        remote.applicationOverrides,
      );
      const mergedCustomApps = mergeItemsById(
        local?.customApplications || [],
        remote.customApplications || [],
      );
      const mergedTreeOverrides = mergeSimpleRecords(local?.treeOverrides, remote.treeOverrides);

      const nextState = {
        ...(local || {}),
        applicationOverrides: mergedAppOverrides,
        customApplications: mergedCustomApps,
        treeOverrides: mergedTreeOverrides,
        expandedTreeNodes: local?.expandedTreeNodes || { "1": true },
        updatedAt: remote.updatedAt,
      };

      isApplyingRemoteChange = true;
      writeLocalJson(STORAGE_KEY_PHD, nextState);
      window.dispatchEvent(new CustomEvent("trakker:sync:phd", { detail: nextState }));
      setSyncStatus("synced");
      setTimeout(() => {
        isApplyingRemoteChange = false;
      }, 600);
    },
    (err) => {
      console.warn("Firestore PhD listener error:", err);
    },
  );

  activeUnsubscribes = [unsubOs, unsubIdeas, unsubPhd];

  return () => {
    stopFirestoreSync();
  };
}

/** Stops active real-time listeners. */
export function stopFirestoreSync() {
  for (const unsub of activeUnsubscribes) {
    try {
      unsub();
    } catch {
      // ignore
    }
  }
  activeUnsubscribes = [];
  currentSyncUid = null;
}

// Debounced cloud push timers
let pushOsTimer: ReturnType<typeof setTimeout> | null = null;
let pushIdeasTimer: ReturnType<typeof setTimeout> | null = null;
let pushPhdTimer: ReturnType<typeof setTimeout> | null = null;

/** Pushes updated local OS state to Firestore in background. */
export function syncOsToFirestore(uid: string, state: TrakkerOsState) {
  const firestore = db;
  if (!firestore || isApplyingRemoteChange) return;

  if (pushOsTimer) clearTimeout(pushOsTimer);
  pushOsTimer = setTimeout(async () => {
    setSyncStatus("syncing");
    const nowIso = new Date().toISOString();
    const payload = sanitizeForFirestore<FirestoreOsData>({
      mode: state.mode,
      tasks: state.tasks,
      meetings: state.meetings,
      routines: state.routines,
      routineCompletions: state.routineCompletions,
      workout: state.workout,
      workouts: state.workouts,
      goals: state.goals,
      updatedAt: state.updatedAt || nowIso,
    });
    const osDocRef = doc(firestore, "users", uid, "data", "os");
    try {
      await setDoc(osDocRef, payload, { merge: true });
      lastRemoteOsUpdatedAt = payload.updatedAt;
      setSyncStatus("synced");
    } catch (err) {
      console.warn("Failed to push OS state to Firestore (offline):", err);
      setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
    }
  }, 300);
}

/** Pushes updated Quick Ideas to Firestore in background. */
export function syncIdeasToFirestore(uid: string, ideas: QuickIdea[]) {
  const firestore = db;
  if (!firestore || isApplyingRemoteChange) return;

  if (pushIdeasTimer) clearTimeout(pushIdeasTimer);
  pushIdeasTimer = setTimeout(async () => {
    setSyncStatus("syncing");
    const nowIso = new Date().toISOString();
    const payload = sanitizeForFirestore<FirestoreIdeasData>({
      ideas,
      updatedAt: nowIso,
    });
    const ideasDocRef = doc(firestore, "users", uid, "data", "quickIdeas");
    try {
      await setDoc(ideasDocRef, payload, { merge: true });
      lastRemoteIdeasUpdatedAt = payload.updatedAt;
      setSyncStatus("synced");
    } catch (err) {
      console.warn("Failed to push Quick Ideas to Firestore (offline):", err);
      setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
    }
  }, 300);
}

/** Pushes updated PhD localState to Firestore in background. */
export function syncPhdToFirestore(
  uid: string,
  localState: {
    applicationOverrides?: Record<string, ApplicationOverride>;
    customApplications?: Application[];
    treeOverrides?: Record<string, TreeOverride>;
    updatedAt?: string;
  },
) {
  const firestore = db;
  if (!firestore || isApplyingRemoteChange) return;

  if (pushPhdTimer) clearTimeout(pushPhdTimer);
  pushPhdTimer = setTimeout(async () => {
    setSyncStatus("syncing");
    const nowIso = new Date().toISOString();
    const payload = sanitizeForFirestore<FirestorePhdData>({
      applicationOverrides: localState.applicationOverrides || {},
      customApplications: localState.customApplications || [],
      treeOverrides: localState.treeOverrides || {},
      updatedAt: localState.updatedAt || nowIso,
    });
    const phdDocRef = doc(firestore, "users", uid, "data", "phd");
    try {
      await setDoc(phdDocRef, payload, { merge: true });
      lastRemotePhdUpdatedAt = payload.updatedAt;
      setSyncStatus("synced");
    } catch (err) {
      console.warn("Failed to push PhD state to Firestore (offline):", err);
      setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
    }
  }, 300);
}

/**
 * Hook for consuming sync status and triggering "Sync Now" manually.
 */
export function useSyncStatus(uid?: string | null) {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus().status);
  const [lastSync, setLastSync] = useState<Date | null>(getSyncStatus().lastSyncedAt);

  useEffect(() => {
    const unsub = subscribeSyncStatus((s, date) => {
      setStatus(s);
      setLastSync(date);
    });

    function handleOnline() {
      if (uid) {
        void performFullSync(uid);
      } else {
        setSyncStatus("idle");
      }
    }

    function handleOffline() {
      setSyncStatus("offline");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      unsub();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [uid]);

  const syncNow = useCallback(async () => {
    if (!uid) return false;
    return performFullSync(uid);
  }, [uid]);

  return {
    status,
    lastSyncedAt: lastSync,
    isSyncing: status === "syncing",
    syncNow,
  };
}
