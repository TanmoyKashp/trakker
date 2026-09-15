import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
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

/** Merges arrays of items with stable IDs without duplicates. */
export function mergeItemsById<T extends { id: string; updatedAt?: string; createdAt?: string }>(
  local: T[],
  remote: T[],
): T[] {
  const map = new Map<string, T>();
  for (const item of remote || []) {
    if (item && item.id) map.set(item.id, item);
  }
  for (const item of local || []) {
    if (!item || !item.id) continue;
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else {
      const existingTime = existing.updatedAt || existing.createdAt || "";
      const itemTime = item.updatedAt || item.createdAt || "";
      if (itemTime >= existingTime) {
        map.set(item.id, { ...existing, ...item });
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
    // quota exceeded or private mode
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

  const osDocRef = doc(db, "users", uid, "data", "os");
  const ideasDocRef = doc(db, "users", uid, "data", "quickIdeas");
  const phdDocRef = doc(db, "users", uid, "data", "phd");

  // Step 1: Initial migration & merge with remote data
  try {
    const [osSnap, ideasSnap, phdSnap] = await Promise.all([
      getDoc(osDocRef),
      getDoc(ideasDocRef),
      getDoc(phdDocRef),
    ]);

    // Merge OS Data
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
      };

      writeLocalJson(STORAGE_KEY_OS, mergedOs);
      window.dispatchEvent(new CustomEvent("trakker:sync:os", { detail: mergedOs }));

      // Upload merged state to Firestore so cloud is up-to-date with local data
      const firestoreOsPayload: FirestoreOsData = {
        mode: mergedOs.mode,
        tasks: mergedOs.tasks,
        meetings: mergedOs.meetings,
        routines: mergedOs.routines,
        routineCompletions: mergedOs.routineCompletions,
        workout: mergedOs.workout,
        workouts: mergedOs.workouts,
        goals: mergedOs.goals,
        updatedAt: new Date().toISOString(),
      };
      void setDoc(osDocRef, firestoreOsPayload, { merge: true });
    }

    // Merge Quick Ideas Data
    const localIdeas = readLocalJson<QuickIdea[]>(STORAGE_KEY_IDEAS) || [];
    const remoteIdeas = ideasSnap.exists() ? (ideasSnap.data() as FirestoreIdeasData)?.ideas || [] : [];
    if (localIdeas.length || remoteIdeas.length) {
      const mergedIdeas = mergeItemsById(localIdeas, remoteIdeas);
      writeLocalJson(STORAGE_KEY_IDEAS, mergedIdeas);
      window.dispatchEvent(new CustomEvent("trakker:sync:ideas", { detail: mergedIdeas }));

      const firestoreIdeasPayload: FirestoreIdeasData = {
        ideas: mergedIdeas,
        updatedAt: new Date().toISOString(),
      };
      void setDoc(ideasDocRef, firestoreIdeasPayload, { merge: true });
    }

    // Merge PhD localState Data (overrides, custom applications, treeOverrides)
    interface LocalStateRaw {
      applicationOverrides?: Record<string, ApplicationOverride>;
      customApplications?: Application[];
      treeOverrides?: Record<string, TreeOverride>;
      expandedTreeNodes?: Record<string, boolean>;
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
      };

      writeLocalJson(STORAGE_KEY_PHD, mergedPhdState);
      window.dispatchEvent(new CustomEvent("trakker:sync:phd", { detail: mergedPhdState }));

      const firestorePhdPayload: FirestorePhdData = {
        applicationOverrides: mergedAppOverrides,
        customApplications: mergedCustomApps,
        treeOverrides: mergedTreeOverrides,
        updatedAt: new Date().toISOString(),
      };
      void setDoc(phdDocRef, firestorePhdPayload, { merge: true });
    }
  } catch (err) {
    console.warn("Initial Firestore sync failed (offline or network error):", err);
  }

  // Step 2: Real-time listener for remote changes (Cross-device sync)
  const unsubOs = onSnapshot(osDocRef, (snap) => {
    if (!snap.exists() || isApplyingRemoteChange) return;
    const remote = snap.data() as FirestoreOsData;
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
    };

    isApplyingRemoteChange = true;
    writeLocalJson(STORAGE_KEY_OS, nextState);
    window.dispatchEvent(new CustomEvent("trakker:sync:os", { detail: nextState }));
    setTimeout(() => {
      isApplyingRemoteChange = false;
    }, 100);
  });

  const unsubIdeas = onSnapshot(ideasDocRef, (snap) => {
    if (!snap.exists() || isApplyingRemoteChange) return;
    const remote = snap.data() as FirestoreIdeasData;
    const local = readLocalJson<QuickIdea[]>(STORAGE_KEY_IDEAS) || [];

    const mergedIdeas = mergeItemsById(local, remote.ideas || []);
    isApplyingRemoteChange = true;
    writeLocalJson(STORAGE_KEY_IDEAS, mergedIdeas);
    window.dispatchEvent(new CustomEvent("trakker:sync:ideas", { detail: mergedIdeas }));
    setTimeout(() => {
      isApplyingRemoteChange = false;
    }, 100);
  });

  const unsubPhd = onSnapshot(phdDocRef, (snap) => {
    if (!snap.exists() || isApplyingRemoteChange) return;
    const remote = snap.data() as FirestorePhdData;
    interface LocalStateRaw {
      applicationOverrides?: Record<string, ApplicationOverride>;
      customApplications?: Application[];
      treeOverrides?: Record<string, TreeOverride>;
      expandedTreeNodes?: Record<string, boolean>;
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
    };

    isApplyingRemoteChange = true;
    writeLocalJson(STORAGE_KEY_PHD, nextState);
    window.dispatchEvent(new CustomEvent("trakker:sync:phd", { detail: nextState }));
    setTimeout(() => {
      isApplyingRemoteChange = false;
    }, 100);
  });

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
      // ignore unsubscribe errors
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
  pushOsTimer = setTimeout(() => {
    const payload: FirestoreOsData = {
      mode: state.mode,
      tasks: state.tasks,
      meetings: state.meetings,
      routines: state.routines,
      routineCompletions: state.routineCompletions,
      workout: state.workout,
      workouts: state.workouts,
      goals: state.goals,
      updatedAt: new Date().toISOString(),
    };
    const osDocRef = doc(firestore, "users", uid, "data", "os");
    void setDoc(osDocRef, payload, { merge: true }).catch((err) => {
      console.warn("Failed to push OS state to Firestore (offline):", err);
    });
  }, 400);
}

/** Pushes updated Quick Ideas to Firestore in background. */
export function syncIdeasToFirestore(uid: string, ideas: QuickIdea[]) {
  const firestore = db;
  if (!firestore || isApplyingRemoteChange) return;

  if (pushIdeasTimer) clearTimeout(pushIdeasTimer);
  pushIdeasTimer = setTimeout(() => {
    const payload: FirestoreIdeasData = {
      ideas,
      updatedAt: new Date().toISOString(),
    };
    const ideasDocRef = doc(firestore, "users", uid, "data", "quickIdeas");
    void setDoc(ideasDocRef, payload, { merge: true }).catch((err) => {
      console.warn("Failed to push Quick Ideas to Firestore (offline):", err);
    });
  }, 400);
}

/** Pushes updated PhD localState to Firestore in background. */
export function syncPhdToFirestore(
  uid: string,
  localState: {
    applicationOverrides?: Record<string, ApplicationOverride>;
    customApplications?: Application[];
    treeOverrides?: Record<string, TreeOverride>;
  },
) {
  const firestore = db;
  if (!firestore || isApplyingRemoteChange) return;

  if (pushPhdTimer) clearTimeout(pushPhdTimer);
  pushPhdTimer = setTimeout(() => {
    const payload: FirestorePhdData = {
      applicationOverrides: localState.applicationOverrides || {},
      customApplications: localState.customApplications || [],
      treeOverrides: localState.treeOverrides || {},
      updatedAt: new Date().toISOString(),
    };
    const phdDocRef = doc(firestore, "users", uid, "data", "phd");
    void setDoc(phdDocRef, payload, { merge: true }).catch((err) => {
      console.warn("Failed to push PhD state to Firestore (offline):", err);
    });
  }, 400);
}
