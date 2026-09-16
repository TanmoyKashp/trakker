import {
  doc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { auth, db, isFirebaseConfigured, waitForAuthStateReady } from "./firebase";
import { isOwnerUser } from "./owner";
import type {
  Application,
  ApplicationOverride,
  ApplicationTask,
  CoreAsset,
  Goal,
  Meeting,
  QuickIdea,
  ReferenceData,
  Routine,
  Task,
  TimetableEntry,
  TrakkerOsState,
  TreeNodeRecord,
  TreeOverride,
  UserPreferences,
  WorkoutItem,
  WorkoutSettings,
} from "../types";

export const STORAGE_KEY_OS = "trakker:os:v2";
export const STORAGE_KEY_IDEAS = "trakker:ideas:v1";
export const STORAGE_KEY_PHD = "trakker:v1";
export const STORAGE_KEY_PREFERENCES = "trakker:preferences";

export interface FirestoreOsData {
  mode: "work" | "personal";
  tasks: Task[];
  meetings: Meeting[];
  routines: Routine[];
  routineCompletions: Record<string, string>;
  workout: WorkoutSettings;
  workouts: WorkoutItem[];
  goals: Goal[];
  timetable?: TimetableEntry[];
  theme?: string;
  updatedAt: string;
}

export interface FirestoreIdeasData {
  ideas: QuickIdea[];
  updatedAt: string;
}

export interface FirestorePhdData {
  applications?: Application[];
  tree?: TreeNodeRecord[];
  applicationTemplate?: ApplicationTask[];
  coreAssets?: CoreAsset[];
  applicationOverrides: Record<string, ApplicationOverride>;
  customApplications: Application[];
  treeOverrides: Record<string, TreeOverride>;
  expandedTreeNodes?: Record<string, boolean>;
  updatedAt: string;
}

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

export interface SyncErrorInfo {
  code: string;
  message: string;
  humanMessage: string;
}

let currentSyncStatus: SyncStatus = typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "idle";
let currentErrorMessage: string | null = null;
let lastSyncedAt: Date | null = null;
let syncedResetTimer: ReturnType<typeof setTimeout> | null = null;
const statusListeners = new Set<(status: SyncStatus, lastSync: Date | null, errorMessage: string | null) => void>();

/**
 * Extracts error code and human-readable message without exposing credentials/tokens.
 */
export function extractErrorInfo(err: unknown): SyncErrorInfo {
  if (!err) {
    return { code: "unknown", message: "Unknown error", humanMessage: "server error" };
  }

  const fbErr = err as { code?: string; message?: string };
  const code = fbErr.code || "unknown";
  const rawMsg = fbErr.message || String(err);
  const cleanMsg = rawMsg.replace(/^Firebase(?:Error)?:\s*(?:\[[^\]]+\]\s*)?/i, "").trim();

  let humanMessage: string;
  if (code.includes("permission-denied") || rawMsg.toLowerCase().includes("permission")) {
    humanMessage = "permission denied";
  } else if (
    code.includes("unavailable") ||
    rawMsg.toLowerCase().includes("unavailable") ||
    rawMsg.toLowerCase().includes("network")
  ) {
    humanMessage = "network unavailable";
  } else if (code.includes("unauthenticated") || rawMsg.toLowerCase().includes("unauthenticated")) {
    humanMessage = "not authenticated";
  } else if (code.includes("deadline-exceeded") || rawMsg.toLowerCase().includes("timeout")) {
    humanMessage = "request timeout";
  } else if (code.includes("not-found")) {
    humanMessage = "database not found";
  } else {
    humanMessage = cleanMsg.length < 30 ? cleanMsg.toLowerCase() : "sync error";
  }

  return { code, message: cleanMsg, humanMessage };
}

/**
 * Formats development-console error log matching the required format.
 */
export function logSyncError(
  err: unknown,
  operation: string,
  path: string,
  authenticatedUid: string | null | undefined,
): SyncErrorInfo {
  const info = extractErrorInfo(err);
  console.error(
    `[SYNC ERROR]\n` +
      `- Firebase error code: ${info.code}\n` +
      `- Firebase error message: ${info.message}\n` +
      `- operation being performed: ${operation}\n` +
      `- Firestore path/collection: ${path}\n` +
      `- authenticated UID: ${authenticatedUid || "none"}`,
  );
  return info;
}

export function setSyncStatus(status: SyncStatus, errorMessage: string | null = null) {
  currentSyncStatus = status;
  currentErrorMessage = errorMessage;
  if (status === "synced") {
    lastSyncedAt = new Date();
    currentErrorMessage = null;
    if (syncedResetTimer) clearTimeout(syncedResetTimer);
    syncedResetTimer = setTimeout(() => {
      if (currentSyncStatus === "synced") {
        setSyncStatus("idle");
      }
    }, 3000);
  } else if (status === "syncing") {
    currentErrorMessage = null;
  }

  for (const listener of statusListeners) {
    try {
      listener(currentSyncStatus, lastSyncedAt, currentErrorMessage);
    } catch {
      // ignore listener error
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("trakker:sync:status", {
        detail: { status: currentSyncStatus, lastSyncedAt, errorMessage: currentErrorMessage },
      }),
    );
  }
}

export function getSyncStatus(): { status: SyncStatus; lastSyncedAt: Date | null; errorMessage: string | null } {
  return { status: currentSyncStatus, lastSyncedAt, errorMessage: currentErrorMessage };
}

export function subscribeSyncStatus(
  callback: (status: SyncStatus, lastSync: Date | null, errorMessage: string | null) => void,
): () => void {
  statusListeners.add(callback);
  callback(currentSyncStatus, lastSyncedAt, currentErrorMessage);
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
let lastRemotePreferencesUpdatedAt: string | null = null;

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
  console.log("[SYNC] starting");

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    console.warn("[SYNC] offline detected");
    setSyncStatus("offline");
    return false;
  }

  if (!isFirebaseConfigured || !db) {
    const errorInfo = logSyncError(
      new Error("Firebase is not configured"),
      "initialize check",
      "N/A",
      uid,
    );
    setSyncStatus("error", errorInfo.humanMessage);
    return false;
  }

  setSyncStatus("syncing");

  // Ensure Firebase Auth has finished resolving and currentUser is available
  await waitForAuthStateReady();
  const currentUser = auth?.currentUser;
  console.log("[SYNC] auth user:", currentUser ? currentUser.email || "authenticated" : "none");
  console.log("[SYNC] uid:", currentUser?.uid || "none");
  console.log("[SYNC] firestore initialized: true");

  if (!currentUser || currentUser.uid !== uid) {
    const errorInfo = logSyncError(
      new Error(currentUser ? "User UID mismatch" : "User is not authenticated with Firebase Auth"),
      "verify auth currentUser",
      `users/${uid}`,
      currentUser?.uid || null,
    );
    setSyncStatus("error", errorInfo.humanMessage);
    return false;
  }

  // Ensure a valid token exists
  try {
    await currentUser.getIdToken(false);
  } catch (tokenErr) {
    const errorInfo = logSyncError(tokenErr, "refresh auth token", `users/${uid}`, uid);
    setSyncStatus("error", errorInfo.humanMessage);
    return false;
  }

  const firestore = db;

  // Requirement 7 & 8: Diagnostic Probe write and read
  const probeDocRef = doc(firestore, "users", uid, "data", "_diagnostic_probe");
  try {
    console.log(`[SYNC] writing: users/${uid}/data/_diagnostic_probe`);
    await setDoc(probeDocRef, {
      probeAt: new Date().toISOString(),
      client: "trakker-web",
    });
    console.log("[SYNC] write success");
  } catch (probeWriteErr) {
    const errorInfo = logSyncError(
      probeWriteErr,
      "diagnostic write probe",
      `users/${uid}/data/_diagnostic_probe`,
      uid,
    );
    setSyncStatus("error", errorInfo.humanMessage);
    return false;
  }

  try {
    console.log(`[SYNC] reading collection: users/${uid}/data/_diagnostic_probe`);
    // Use getDocFromServer to verify actual cloud backend response, distinguishing from local cache (Requirement 14)
    const probeSnap = await getDocFromServer(probeDocRef);
    console.log("[SYNC] read success");
    console.log(`[SYNC] records found: ${probeSnap.exists() ? 1 : 0}`);
  } catch (probeReadErr) {
    const errorInfo = logSyncError(
      probeReadErr,
      "diagnostic read probe (from server)",
      `users/${uid}/data/_diagnostic_probe`,
      uid,
    );
    setSyncStatus("error", errorInfo.humanMessage);
    return false;
  }

  // Real Application Data Sync
  const isOwner = isOwnerUser(auth?.currentUser);
  const osDocRef = doc(firestore, "users", uid, "data", "os");
  const ideasDocRef = doc(firestore, "users", uid, "data", "quickIdeas");
  const phdDocRef = doc(firestore, "users", uid, "data", "phd");

  try {
    // Read remote documents
    console.log(`[SYNC] reading collection: users/${uid}/data/os`);
    const osSnap = await getDoc(osDocRef);
    console.log("[SYNC] read success");
    console.log(`[SYNC] records found: ${osSnap.exists() ? 1 : 0}`);

    console.log(`[SYNC] reading collection: users/${uid}/data/quickIdeas`);
    const ideasSnap = await getDoc(ideasDocRef);
    console.log("[SYNC] read success");
    console.log(
      `[SYNC] records found: ${ideasSnap.exists() ? (ideasSnap.data() as FirestoreIdeasData)?.ideas?.length ?? 1 : 0}`,
    );

    const nowIso = new Date().toISOString();

    // 1. OS Data (tasks, meetings, routines, workouts, goals, timetable, mode)
    const localOs = readLocalJson<TrakkerOsState>(STORAGE_KEY_OS);
    const remoteOs = osSnap.exists() ? (osSnap.data() as FirestoreOsData) : null;
    console.log(
      `[SYNC] local records: osTasks=${localOs?.tasks?.length || 0}, localGoals=${localOs?.goals?.length || 0}, localWorkouts=${localOs?.workouts?.length || 0}, localTimetable=${localOs?.timetable?.length || 0}`,
    );

    if (remoteOs || localOs) {
      console.log("[SYNC] merging: reconciling OS state by stable ID and timestamps");
      const mergedTasks = mergeItemsById(localOs?.tasks || [], remoteOs?.tasks || []);
      const mergedMeetings = mergeItemsById(localOs?.meetings || [], remoteOs?.meetings || []);
      const mergedRoutines = mergeItemsById(localOs?.routines || [], remoteOs?.routines || []);
      const mergedWorkouts = mergeItemsById(localOs?.workouts || [], remoteOs?.workouts || []);
      const mergedGoals = mergeItemsById(localOs?.goals || [], remoteOs?.goals || []);
      const mergedTimetable = mergeItemsById(localOs?.timetable || [], remoteOs?.timetable || []);
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
        timetable: mergedTimetable,
        theme: remoteOs?.theme || localOs?.theme,
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
        timetable: mergedOs.timetable,
        theme: mergedOs.theme,
        updatedAt: nowIso,
      });

      console.log(`[SYNC] writing: users/${uid}/data/os`);
      await setDoc(osDocRef, osPayload, { merge: true });
      console.log("[SYNC] write success");
      lastRemoteOsUpdatedAt = nowIso;
    }

    // 2. Quick Ideas Data
    const localIdeas = readLocalJson<QuickIdea[]>(STORAGE_KEY_IDEAS) || [];
    const remoteIdeas = ideasSnap.exists() ? (ideasSnap.data() as FirestoreIdeasData)?.ideas || [] : [];
    console.log(`[SYNC] local records: quickIdeas=${localIdeas.length}`);

    if (localIdeas.length || remoteIdeas.length) {
      console.log("[SYNC] merging: reconciling quick ideas by stable ID and timestamps");
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

      console.log(`[SYNC] writing: users/${uid}/data/quickIdeas`);
      await setDoc(ideasDocRef, ideasPayload, { merge: true });
      console.log("[SYNC] write success");
      lastRemoteIdeasUpdatedAt = nowIso;
    }

    // 3. PhD Data (STRICTLY OWNER ONLY)
    if (isOwner) {
      console.log(`[SYNC] reading collection: users/${uid}/data/phd`);
      const phdSnap = await getDoc(phdDocRef);
      console.log("[SYNC] read success");
      console.log(`[SYNC] records found: ${phdSnap.exists() ? 1 : 0}`);

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
      console.log(`[SYNC] local records: phdCustomApps=${localPhd?.customApplications?.length || 0}`);

      if (localPhd || remotePhd) {
        console.log("[SYNC] merging: reconciling PhD progress and overrides");
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

        // Cache full reference dataset from remote if present
        if (remotePhd?.applications && remotePhd.applications.length > 0) {
          const refData: ReferenceData = {
            applications: remotePhd.applications,
            tree: remotePhd.tree || [],
            applicationTemplate: remotePhd.applicationTemplate || [],
            coreAssets: remotePhd.coreAssets || [],
          };
          writeLocalJson("trakker:phd:reference", refData);
          window.dispatchEvent(new CustomEvent("trakker:sync:reference", { detail: refData }));
        }

        const mergedPhdState = {
          ...(localPhd || {}),
          applicationOverrides: mergedAppOverrides,
          customApplications: mergedCustomApps,
          treeOverrides: mergedTreeOverrides,
          expandedTreeNodes: remotePhd?.expandedTreeNodes || localPhd?.expandedTreeNodes || { "1": true },
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
          expandedTreeNodes: mergedPhdState.expandedTreeNodes,
          updatedAt: nowIso,
        });

        console.log(`[SYNC] writing: users/${uid}/data/phd`);
        await setDoc(phdDocRef, phdPayload, { merge: true });
        console.log("[SYNC] write success");
        lastRemotePhdUpdatedAt = nowIso;
      }
    }

    // 4. User Preferences (Theme & A's Dark Side)
    const prefsDocRef = doc(firestore, "users", uid, "data", "preferences");
    console.log(`[SYNC] reading collection: users/${uid}/data/preferences`);
    const prefsSnap = await getDoc(prefsDocRef);
    console.log("[SYNC] read success");
    console.log(`[SYNC] records found: ${prefsSnap.exists() ? 1 : 0}`);

    const localPrefs = readLocalJson<UserPreferences>(STORAGE_KEY_PREFERENCES);
    const remotePrefs = prefsSnap.exists() ? (prefsSnap.data() as UserPreferences) : null;

    if (remotePrefs || localPrefs) {
      const localTime = localPrefs?.updatedAt || "";
      const remoteTime = remotePrefs?.updatedAt || "";
      let winningPrefs: UserPreferences;

      if (remotePrefs && (!localPrefs || remoteTime >= localTime)) {
        winningPrefs = remotePrefs;
      } else if (localPrefs) {
        winningPrefs = localPrefs;
      } else {
        winningPrefs = { theme: "auto", darkSide: false, updatedAt: nowIso };
      }

      isApplyingRemoteChange = true;
      writeLocalJson(STORAGE_KEY_PREFERENCES, winningPrefs);
      try {
        localStorage.setItem("trakker:theme", winningPrefs.theme);
        localStorage.setItem("trakker:dark_side", String(winningPrefs.darkSide));
      } catch {
        // quota
      }
      window.dispatchEvent(new CustomEvent("trakker:preferences:changed", { detail: winningPrefs }));
      window.dispatchEvent(new CustomEvent("trakker:theme:changed", { detail: winningPrefs.theme }));
      setTimeout(() => {
        isApplyingRemoteChange = false;
      }, 600);

      const prefsPayload = sanitizeForFirestore<UserPreferences>({
        theme: winningPrefs.theme,
        darkSide: winningPrefs.darkSide,
        updatedAt: winningPrefs.updatedAt || nowIso,
      });

      console.log(`[SYNC] writing: users/${uid}/data/preferences`);
      await setDoc(prefsDocRef, prefsPayload, { merge: true });
      console.log("[SYNC] write success");
      lastRemotePreferencesUpdatedAt = prefsPayload.updatedAt;
    }

    console.log("[SYNC] sync complete");
    setSyncStatus("synced");
    return true;
  } catch (syncErr) {
    const errorInfo = logSyncError(syncErr, "full sync data reconciliation", `users/${uid}/data/...`, uid);
    setSyncStatus("error", errorInfo.humanMessage);
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

  const isOwner = isOwnerUser(auth?.currentUser);
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
      const mergedTimetable = mergeItemsById(local?.timetable || [], remote.timetable || []);
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
        timetable: mergedTimetable,
        theme: remote.theme || local?.theme,
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
      const errorInfo = logSyncError(err, "onSnapshot listener (os)", `users/${uid}/data/os`, uid);
      setSyncStatus("error", errorInfo.humanMessage);
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
      const errorInfo = logSyncError(err, "onSnapshot listener (quickIdeas)", `users/${uid}/data/quickIdeas`, uid);
      setSyncStatus("error", errorInfo.humanMessage);
    },
  );

  const prefsDocRef = doc(firestore, "users", uid, "data", "preferences");
  const unsubPreferences = onSnapshot(
    prefsDocRef,
    (snap) => {
      if (!snap.exists() || isApplyingRemoteChange) return;
      const remote = snap.data() as UserPreferences;
      if (remote.updatedAt && remote.updatedAt === lastRemotePreferencesUpdatedAt) return;

      lastRemotePreferencesUpdatedAt = remote.updatedAt;
      isApplyingRemoteChange = true;
      writeLocalJson(STORAGE_KEY_PREFERENCES, remote);
      try {
        localStorage.setItem("trakker:theme", remote.theme);
        localStorage.setItem("trakker:dark_side", String(remote.darkSide));
      } catch {
        // quota
      }
      window.dispatchEvent(new CustomEvent("trakker:preferences:changed", { detail: remote }));
      window.dispatchEvent(new CustomEvent("trakker:theme:changed", { detail: remote.theme }));
      setSyncStatus("synced");
      setTimeout(() => {
        isApplyingRemoteChange = false;
      }, 600);
    },
    (err) => {
      const errorInfo = logSyncError(err, "onSnapshot listener (preferences)", `users/${uid}/data/preferences`, uid);
      setSyncStatus("error", errorInfo.humanMessage);
    },
  );

  let unsubPhd: Unsubscribe | null = null;
  if (isOwner) {
    unsubPhd = onSnapshot(
      phdDocRef,
      (snap) => {
        if (!snap.exists() || isApplyingRemoteChange) return;
        const remote = snap.data() as FirestorePhdData;
        if (remote.updatedAt && remote.updatedAt === lastRemotePhdUpdatedAt) return;

        lastRemotePhdUpdatedAt = remote.updatedAt;

        if (remote.applications && remote.applications.length > 0) {
          const refData: ReferenceData = {
            applications: remote.applications,
            tree: remote.tree || [],
            applicationTemplate: remote.applicationTemplate || [],
            coreAssets: remote.coreAssets || [],
          };
          writeLocalJson("trakker:phd:reference", refData);
          window.dispatchEvent(new CustomEvent("trakker:sync:reference", { detail: refData }));
        }

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
          expandedTreeNodes: remote.expandedTreeNodes || local?.expandedTreeNodes || { "1": true },
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
        const errorInfo = logSyncError(err, "onSnapshot listener (phd)", `users/${uid}/data/phd`, uid);
        setSyncStatus("error", errorInfo.humanMessage);
      },
    );
  }

  activeUnsubscribes = unsubPhd
    ? [unsubOs, unsubIdeas, unsubPreferences, unsubPhd]
    : [unsubOs, unsubIdeas, unsubPreferences];

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
  setSyncStatus("idle");
}

// Debounced cloud push timers
let pushOsTimer: ReturnType<typeof setTimeout> | null = null;
let pushIdeasTimer: ReturnType<typeof setTimeout> | null = null;
let pushPhdTimer: ReturnType<typeof setTimeout> | null = null;
let pushPreferencesTimer: ReturnType<typeof setTimeout> | null = null;

/** Pushes updated Preferences (Theme & A's Dark Side) to Firestore in background. */
export function syncPreferencesToFirestore(uid: string, preferences: UserPreferences) {
  const firestore = db;
  if (!firestore || isApplyingRemoteChange) return;

  if (pushPreferencesTimer) clearTimeout(pushPreferencesTimer);
  pushPreferencesTimer = setTimeout(async () => {
    setSyncStatus("syncing");
    const nowIso = new Date().toISOString();
    const payload = sanitizeForFirestore<UserPreferences>({
      theme: preferences.theme,
      darkSide: preferences.darkSide,
      updatedAt: preferences.updatedAt || nowIso,
    });
    const docRef = doc(firestore, "users", uid, "data", "preferences");
    try {
      await setDoc(docRef, payload, { merge: true });
      lastRemotePreferencesUpdatedAt = payload.updatedAt;
      setSyncStatus("synced");
    } catch (err) {
      const errorInfo = logSyncError(err, "background push preferences", `users/${uid}/data/preferences`, uid);
      setSyncStatus(
        typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error",
        errorInfo.humanMessage,
      );
    }
  }, 300);
}

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
      timetable: state.timetable,
      theme: state.theme,
      updatedAt: state.updatedAt || nowIso,
    });
    const osDocRef = doc(firestore, "users", uid, "data", "os");
    try {
      await setDoc(osDocRef, payload, { merge: true });
      lastRemoteOsUpdatedAt = payload.updatedAt;
      setSyncStatus("synced");
    } catch (err) {
      const errorInfo = logSyncError(err, "background push os", `users/${uid}/data/os`, uid);
      setSyncStatus(
        typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error",
        errorInfo.humanMessage,
      );
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
      const errorInfo = logSyncError(err, "background push quickIdeas", `users/${uid}/data/quickIdeas`, uid);
      setSyncStatus(
        typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error",
        errorInfo.humanMessage,
      );
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
  if (!firestore || isApplyingRemoteChange || !isOwnerUser(auth?.currentUser)) return;

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
      const errorInfo = logSyncError(err, "background push phd", `users/${uid}/data/phd`, uid);
      setSyncStatus(
        typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error",
        errorInfo.humanMessage,
      );
    }
  }, 300);
}

/**
 * Hook for consuming sync status and triggering "Sync Now" manually.
 */
export function useSyncStatus(uid?: string | null) {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus().status);
  const [lastSync, setLastSync] = useState<Date | null>(getSyncStatus().lastSyncedAt);
  const [errorMessage, setErrorMessage] = useState<string | null>(getSyncStatus().errorMessage);

  useEffect(() => {
    const unsub = subscribeSyncStatus((s, date, err) => {
      setStatus(s);
      setLastSync(date);
      setErrorMessage(err);
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
    errorMessage,
    isSyncing: status === "syncing",
    syncNow,
  };
}
